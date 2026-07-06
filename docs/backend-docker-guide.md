# Backend Dockerization Guide (Node.js + Express API)

This guide documents the Docker architecture and containerization practices for a Node.js Express REST API server, following the conventions set in Docker's official Node.js guidelines.

---

## 1. Multi-Stage Build Architecture

To create a secure and optimized container image, we use a **Multi-Stage Build** to decouple the installation environment from the production runtime image:

```dockerfile
# ==============================================================================
# STAGE 1: Development & Dependency Resolution (deps)
# ==============================================================================
FROM node:20-alpine AS deps

WORKDIR /app

# Bind-mount package manifests to prevent layer cache invalidation on code changes.
# Use npm cache mounts to speed up installing packages.
RUN --mount=type=bind,source=package.json,target=package.json \
    --mount=type=bind,source=package-lock.json,target=package-lock.json \
    --mount=type=cache,target=/root/.npm \
    npm ci --omit=dev

# ==============================================================================
# STAGE 2: Production Runner (runner)
# ==============================================================================
FROM node:20-alpine AS runner

ENV NODE_ENV=production

WORKDIR /app

# Run the container as the built-in non-root 'node' user
USER node

# Copy dependencies and application files with appropriate permissions
COPY --from=deps --chown=node:node /app/node_modules ./node_modules
COPY --chown=node:node . .

EXPOSE 5000

CMD ["node", "server.js"]
```

### Key Optimizations:
1. **Cache Mounts (`--mount=type=cache`)**: Speeds up package installation by storing the npm cache in a host folder managed by BuildKit, making successive builds significantly faster.
2. **Bind Mounts (`--mount=type=bind`)**: Allows the build stage to read `package.json` and `package-lock.json` directly from the host workspace *without* adding them permanently to the image file system in that layer.
3. **Runner Footprint**: Discards dev dependencies, compiling tools, and installer caches, copying only production code and modules.

---

## 2. Running as a Non-Root User

By default, Docker processes inside containers execute as the `root` user (UID 0). If an attacker manages to break out of the container process (e.g. via a vulnerability in a dependency), they gain root privileges on the host kernel.

### Best Practice:
- Node's official Alpine images include a built-in user named `node` (UID 1000).
- We set `USER node` before start commands.
- We run `COPY --chown=node:node` to transfer ownership of application files. If this is omitted, files copied into the container will be owned by root, preventing the `node` process from reading or modifying them (resulting in `EACCES` permission errors).

---

## 3. Configuration & Secrets Management

**Never bake API secrets, database passwords, or private keys directly into the Dockerfile or Docker image.** Once baked in, any user with access to the registry can pull and inspect the image layers to retrieve them.

### Best Practice Options:
1. **Environment Files (`--env-file`)**: Inject environment configurations at runtime during development or deployment.
2. **Docker Secrets (Production Compose)**: Mount secure files containing passwords to `/run/secrets/` inside the container:
   ```yaml
   services:
     api:
       image: mern-backend:latest
       secrets:
         - db_password
   ```

---

## 4. Port Mapping & Service Healthchecks

Our Express server exposes a healthcheck route at `GET /health` which monitors database connection integrity.

In a multi-container Docker Compose file, we configure the backend to wait until MongoDB is fully operational and authenticated before starting the API server:

```yaml
version: '3.8'
services:
  database:
    image: mongo:6.0
    ports:
      - "27017:27017"
    healthcheck:
      test: ["CMD", "mongosh", "--eval", "db.adminCommand('ping')"]
      interval: 10s
      timeout: 5s
      retries: 5
      start_period: 10s

  api:
    build:
      context: ./backend
    ports:
      - "5000:5000"
    depends_on:
      database:
        condition: service_healthy # Block API startup until DB is fully healthy
    healthcheck:
      test: ["CMD", "wget", "--no-verbose", "--tries=1", "--spider", "http://localhost:5000/health"]
      interval: 30s
      timeout: 10s
      retries: 3
```

---

## 5. Audit Logging Volume Design

To keep security auditing files persistent (so they survive container updates/recreation) and decapsulated from MongoDB databases, we store logs under `/data/logs/auth-activity.log` and bind it to a **Docker Named Volume**.

```yaml
services:
  api:
    volumes:
      - auth-logs-vol:/data/logs
    environment:
      - LOG_DIR=/data/logs

volumes:
  auth-logs-vol:
```

### Accessing Log Data (Read-Only vs Read-Write Mounts):
- **API Server:** Mounts the volume as **Read-Write (rw)** to actively append login/logout lines.
- **Log Shippers or Monitor Dashboards:** If another container (like a log-analyzer container) needs access to this log file, it should mount the same volume as **Read-Only (ro)** to prevent unauthorized modification of security audit trails:
  ```yaml
  services:
    log-forwarder:
      image: fluentd:latest
      volumes:
        - auth-logs-vol:/data/logs:ro # Mounted read-only
  ```

---

## 6. Docker Command Templates

### A. Build with BuildKit Caches
Use BuildKit engine to compile the image efficiently:
```bash
# Enable BuildKit
export DOCKER_BUILDKIT=1

# Build the backend image
docker build -t mern-backend:1.0 ./backend
```

### B. Run API with Env Variables & Log Volume
Run the Node process containerized, injecting configurations and sharing the log folder:
```bash
docker run -d \
  --name mern-api-container \
  -p 5000:5000 \
  --env-file ./backend/.env \
  -v auth-logs-volume:/data/logs \
  mern-backend:1.0
```

### C. Inspection Commands
```bash
# Stream API console logs
docker logs -f mern-api-container

# Open an interactive shell inside the container as user 'node'
docker exec -it --user node mern-api-container sh
```

### D. One-off Seeding Scripts (Docker Compose)
Run the seeding script against the shared MongoDB service network:
```bash
# Run and clean up container instantly after completion
docker compose run --rm api node /app/database/seed.js
```
