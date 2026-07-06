# Frontend Dockerization Guide (React + Vite)

This guide provides a comprehensive blueprint for containerizing a modern React single-page application (SPA) built with Vite. It incorporates industry-standard practices, structured based on Docker's official containerization guidelines.

---

## 1. Multi-Stage Builds for Vite/React

A standard Vite React project requires a full Node.js runtime environment to install dependencies, run linting, and compile the code. However, at runtime, the browser only needs the static compiled output (HTML, JS, CSS, assets). 

To optimize performance and security, we separate these tasks into a **Multi-Stage Build**:

```dockerfile
# ==============================================================================
# STAGE 1: Build (Compiling the static assets)
# ==============================================================================
FROM node:20-alpine AS build

WORKDIR /app

# Enable dependency cache mount to accelerate npm installs
COPY package.json package-lock.json ./
RUN --mount=type=cache,target=/root/.npm \
    npm ci

# Copy source code and build the application
COPY . .
RUN npm run build

# ==============================================================================
# STAGE 2: Serve (Serving only the static assets)
# ==============================================================================
FROM nginx:1.25-alpine AS runtime

# Copy custom Nginx configuration to support client-side routing
COPY nginx.conf /etc/nginx/conf.d/default.conf

# Copy static assets from the build stage
COPY --from=build /app/dist /usr/share/nginx/html

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]
```

### Why Multi-Stage?
1. **Caching Layer:** By copying package manifests and installing dependencies before copying the rest of the source code, Docker caches the `node_modules` layer. It is only rebuilt when `package.json` changes.
2. **Minimal Footprint:** The build stage container is discarded. The final runtime container contains only Nginx and the static assets, reducing the image size from >800MB to ~30MB.

---

## 2. Eliminating Development Artifacts in Production

The final production container **must not** contain:
- `node_modules/`
- Raw source code (`src/`, `public/`, etc.)
- Configuration files (`vite.config.js`, `tsconfig.json`)

### Reasons:
- **Security:** If an attacker compromises the container, they must not have access to source code or dev dependencies, reducing the attack surface.
- **Performance:** Small images download, deploy, and scale faster.

---

## 3. Explaining .dockerignore Configurations

To prevent heavy local dependencies, build logs, and environment variables from copying into the container build context, configure a `.dockerignore` file:

```
# Dependency folders
node_modules/

# Local build outputs
dist/
build/

# Local environment secrets and overrides
.env
.env.local
.env.production.local

# Git metadata
.git
.gitignore

# System / OS files
.DS_Store
thumbs.db
```

*Note: If `node_modules` or `dist` are not excluded in `.dockerignore`, they will overwrite container files during `COPY` operations, leading to architecture mismatch errors.*

---

## 4. Build-Time vs. Runtime Configuration

React SPAs run client-side inside the user's web browser, meaning they cannot directly query the container's environment variables (`process.env`).

### Option A: Build-Time Injections (Standard Vite)
Vite injects variables prefixed with `VITE_` during compile-time:
```javascript
// Accessed in React code
const apiUrl = import.meta.env.VITE_API_URL;
```
- **Limitation:** The environment variable must be specified during the build phase (`docker build --build-arg`). You cannot change it without rebuilding the image.

### Option B: Dynamic Runtime Injection
To build a single image that runs in multiple environments (Staging, Production) without rebuilds:
1. Have the Nginx entrypoint execute a shell script that reads environment variables and writes them to a static configuration file inside the Nginx HTML root (e.g., `/usr/share/nginx/html/config.js`):
   ```bash
   # entrypoint.sh
   echo "window._env_ = { API_URL: '${API_URL}' };" > /usr/share/nginx/html/config.js
   ```
2. Reference this script in your HTML header:
   ```html
   <script src="/config.js"></script>
   ```
3. Read the variable inside your React application:
   ```javascript
   const apiUrl = window._env_?.API_URL || "fallback-url";
   ```

---

## 5. Security & Exposing Ports

- **Non-Root User:** Standard alpine Nginx images run as the root user. To improve security, configure the Nginx configuration to listen on a non-privileged port (e.g., `8080` instead of `80`) and run the container under the `nginx` system user:
  ```dockerfile
  USER nginx
  ```
- **Port Exposure:** Expose the configured port (e.g. `EXPOSE 80` or `EXPOSE 8080`) to instruct container engines how to route incoming traffic.

---

## 6. Docker Command Templates

### A. Build the Image
Build the image locally, passing necessary build-time arguments:
```bash
docker build \
  --build-arg VITE_API_URL=<YOUR_API_URL> \
  -t <IMAGE_NAME>:<TAG> \
  -f <DOCKERFILE_PATH> .
```

### B. Run the Container
Launch the container, mapping the container's exposed port to the host:
```bash
docker run -d \
  -p <HOST_PORT>:<CONTAINER_PORT> \
  --name <CONTAINER_NAME> \
  <IMAGE_NAME>:<TAG>
```

### C. Build a Specific Stage (Targeting Build)
To test build assets or perform tests without creating the final runtime container:
```bash
docker build \
  --target build \
  -t <IMAGE_NAME>-build-stage \
  -f <DOCKERFILE_PATH> .
```

### D. Clean up Unused Docker Assets
Clean up orphaned builder cache, stopped containers, and dangling images:
```bash
# List all active images
docker image ls

# Reclaim system storage space
docker system prune -a --volumes
```
