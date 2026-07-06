# Master Dockerization & Docker Compose Guide (MERN Stack)

This architectural guide provides a complete, production-ready blueprint for containerizing and orchestrating a three-tier MERN stack application. It contains all Dockerfile templates, manual Docker commands (networks, volumes, image builds, container execution) for each section, and the unified Docker Compose configuration.

---

## 1. Global Network & Volumes Setup

Before running individual containers manually, we define a shared custom network so containers can discover and communicate with each other using their container names, and named volumes to persist application states.

### Network Configuration
Create a custom bridge network for the stack:
```bash
docker network create mern-net
```
* **Network Name**: `mern-net`
* **Driver**: `bridge` (Standard isolated local network)

### Volume Configuration
Create dedicated volumes for database files and authentication logs:
```bash
# Volume to persist MongoDB data files on host storage
docker volume create db-data-vol

# Volume to persist backend authentication log files
docker volume create auth-logs-volume
```

---

## 2. Tier-by-Tier Specification & Dockerfiles

### 2.1 Database Tier (MongoDB)

#### Dockerfile Template (`/database/Dockerfile`)
```dockerfile
# ==========================================
# MongoDB Custom Dockerfile
# ==========================================

# Step 1: Define the base image
FROM mongo:6.0

# Step 2: Add metadata labels
LABEL maintainer="Admin <rabin@rabinmishra.com.np>"
LABEL version="1.0"
LABEL description="Custom MongoDB image with pre-configured settings and healthcheck support"

# Step 3: Define environment variables (optional defaults)
ENV MONGO_INITDB_DATABASE=mern_db

# Step 4: Expose the standard MongoDB port
EXPOSE 27017

# Step 5: Define a Container Healthcheck
HEALTHCHECK --interval=30s --timeout=10s --retries=3 \
    CMD mongosh --eval 'db.runCommand("ping").ok' --quiet || exit 1

# Step 6: Specify the default command
CMD ["mongod"]
```

#### Manual Docker Commands for Database
```bash
# 1. Build the Database Image
docker build -t mern-mongodb:1.0 ./database

# 2. Run the Database Container
docker run -d \
  --name mern-mongodb-container \
  -p 27018:27017 \
  -e MONGO_INITDB_ROOT_USERNAME=dbadmin \
  -e MONGO_INITDB_ROOT_PASSWORD=supersecurepassword \
  -e MONGO_INITDB_DATABASE=mern_db \
  -v db-data-vol:/data/db \
  --network mern-net \
  --restart unless-stopped \
  mern-mongodb:1.0
```

---

### 2.2 Backend API Tier (Node.js/Express)

#### Dockerfile Template (`/backend/Dockerfile`)
```dockerfile
# STAGE 1: development and dependency resolution stage
FROM node:20-alpine AS deps

WORKDIR /app

# Copy package manifests and install dependencies
COPY backend/package.json backend/package-lock.json ./

# Install only production dependencies to keep the image slim
RUN npm ci --omit=development

# Copy backend source, shared database models, and documentation files
COPY backend /app/backend
COPY database /app/database
COPY docs /app/docs

# STAGE 2: Production Runner (runner)
FROM node:20-alpine AS runner 
ENV NODE_ENV=production 
WORKDIR /app/backend

# Run the container as the built-in non-root 'node' user
USER node

# Copy dependencies and application files with appropriate permissions
COPY --from=deps --chown=node:node /app/node_modules /app/node_modules
COPY --from=deps --chown=node:node /app/backend /app/backend
COPY --from=deps --chown=node:node /app/database /app/database
COPY --from=deps --chown=node:node /app/docs /app/docs

EXPOSE 5000

CMD [ "node", "server.js" ]
```

#### Manual Docker Commands for Backend API
> [!IMPORTANT]
> Because the backend `Dockerfile` references files in sibling folders (e.g. `/database`), you **must** build this image from the **root directory** of the project using the `-f` flag to target the Dockerfile path.

```bash
# 1. Build the Backend Image (Run from root folder of the project)
docker build -t mern-backend:1.0 -f backend/Dockerfile .

# 2. Run the Backend Container
docker run -d \
  --name mern-api-container \
  -p 5000:5000 \
  -e NODE_ENV=production \
  -e MONGO_URI=mongodb://dbadmin:supersecurepassword@mern-mongodb-container:27017/mern_db?authSource=admin \
  -e PORT=5000 \
  -e JWT_SECRET=supersecretsomewhereinuniverse \
  -e JWT_EXPIRES_IN=24h \
  -e LOG_DIR=/data/logs \
  -v auth-logs-volume:/data/logs \
  --network mern-net \
  --restart unless-stopped \
  mern-backend:1.0
```

---

### 2.3 Frontend Tier (Vite/React/Nginx)

#### Dockerfile Template (`/frontend/Dockerfile`)
```dockerfile
# STAGE 1: build for stage 1 using the concept of multi-stage build
FROM node:20-alpine AS build

WORKDIR /app

# Enable dependency cache mount to accelerate npm installs
COPY package*.json ./

RUN --mount=type=cache,target=/root/.npm \
npm ci

# Copy source code and build the application
COPY . .

RUN npm run build 

# STAGE 2: Serve (Serving only the static assets)
FROM nginx:1.25-alpine AS runtime

# Copy custom Nginx configuration to support client-side routing
COPY nginx.conf /etc/nginx/conf.d/default.conf

# Copy entrypoint script for dynamic environment injection
COPY entrypoint.sh /entrypoint.sh
RUN chmod +x /entrypoint.sh

# Copy static assets from the build stage
COPY --from=build /app/dist /usr/share/nginx/html

EXPOSE 80

ENTRYPOINT ["/entrypoint.sh"]
```

#### Manual Docker Commands for Frontend
```bash
# 1. Build the Frontend Image (Run from frontend folder)
docker build -t mern-frontend:1.0 ./frontend

# 2. Run the Frontend Container
docker run -d \
  --name mern-frontend-container \
  -p 3008:80 \
  -e VITE_API_URL=http://localhost:5000/api \
  --network mern-net \
  --restart unless-stopped \
  mern-frontend:1.0
```

---

## 3. Docker Compose Orchestration

Using separate `docker run` commands manually presents maintenance overhead (managing networks, dependencies, environment synchronization, and restart orders). Docker Compose automates this process into a single declarative file.

### Complete `docker-compose.yml` Template
Create this file in the root directory (`/home/rabin/DockerProject/docker-compose.yml`):

```yaml
services:
  # --- DATABASE TIER (MONGODB) ---
  database:
    build:
      context: ./database
      dockerfile: Dockerfile
    container_name: mern-mongodb-container
    ports:
      - "27018:27017" # Maps localhost:27018 to Mongo container 27017
    environment:
      - MONGO_INITDB_ROOT_USERNAME=dbadmin
      - MONGO_INITDB_ROOT_PASSWORD=supersecurepassword
      - MONGO_INITDB_DATABASE=mern_db
    volumes:
      - db-data-vol:/data/db
    healthcheck:
      test: ["CMD", "mongosh", "--eval", "db.runCommand('ping').ok", "--quiet"]
      interval: 10s
      timeout: 5s
      retries: 5
      start_period: 10s
    networks:
      - mern-net

  # --- BACKEND API TIER (EXPRESS) ---
  backend:
    build:
      context: . # Build context is root folder due to multi-directory copying
      dockerfile: backend/Dockerfile
    container_name: mern-api-container
    ports:
      - "5000:5000"
    environment:
      - NODE_ENV=production
      # Uses "database" container name as hostname in bridge network
      - MONGO_URI=mongodb://dbadmin:supersecurepassword@database:27017/mern_db?authSource=admin
      - PORT=5000
      - JWT_SECRET=supersecretsomewhereinuniverse
      - JWT_EXPIRES_IN=24h
      - LOG_DIR=/data/logs
    volumes:
      - auth-logs-volume:/data/logs
    depends_on:
      database:
        condition: service_healthy # Wait for database healthcheck to pass
    networks:
      - mern-net

  # --- FRONTEND TIER (VITE/NGINX) ---
  frontend:
    build:
      context: ./frontend
      dockerfile: Dockerfile
    container_name: mern-frontend-container
    ports:
      - "3008:80" # Maps localhost:3008 to Nginx port 80
    environment:
      - VITE_API_URL=http://localhost:5000/api
    depends_on:
      - backend
    networks:
      - mern-net

# --- NETWORKS AND VOLUMES DEFINITION ---
networks:
  mern-net:
    driver: bridge

volumes:
  db-data-vol:
    external: false # Let compose initialize the volume if it does not exist
  auth-logs-volume:
    external: false
```

---

## 4. Master Orchestration Command Cheat Sheet

Execute all commands from the root project directory (`/home/rabin/DockerProject/`):

### A. Lifecycle Management
```bash
# Build images and start all containers in detached background mode
docker compose up -d --build

# View runtime statuses and healthcheck reports of services
docker compose ps

# Stop and remove containers and network interfaces (leaves volumes intact)
docker compose down

# Stop containers and wipe volumes completely (destructive data wipe)
docker compose down -v
```

### B. Troubleshooting & Seeding
```bash
# Stream combined logs from all three containers in real-time
docker compose logs -f

# Stream logs only for the backend container
docker compose logs -f backend

# Trigger the database seeding script inside the running API container
docker compose exec backend node /app/database/seed.js

# Connect directly to the database Shell inside the container
docker compose exec -it database mongosh -u dbadmin -p supersecurepassword --authenticationDatabase admin
```
