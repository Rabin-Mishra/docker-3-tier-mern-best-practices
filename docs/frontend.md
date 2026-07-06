# Frontend Dockerization Guide (React + Vite)

This guide covers modern best practices for containerizing a React frontend built with Vite. It explains single-stage vs multi-stage builds, handling environment variables, dependency caching, and production Nginx serving.

---

## 1. Single-Stage vs. Multi-Stage Builds

### Single-Stage (Development)
In development, we want hot-reloading and the ability to debug code. We mount our host code into the container.
- **Base Image:** A full Node.js environment (e.g., `node:20-alpine`).
- **Command:** `npm run dev` running on a dev server (Vite default port `5173`).
- **Volumes:** Bind-mount `src/` to reflect local changes inside the container immediately.

### Multi-Stage (Production)
For production, we compile the React application into static HTML, JS, and CSS files, then serve them using a lightweight web server like Nginx.
- **Stage 1 (Build):** Uses `node:20-alpine` to install dependencies and run `npm run build`.
- **Stage 2 (Serve):** Uses `nginx:stable-alpine`. It copies the compiled `/dist` directory from Stage 1 into Nginx's HTML root (usually `/usr/share/nginx/html`).
- **Benefit:** Reduces image size from ~1GB to <50MB, removes development dependencies, hides source code, and improves security.

---

## 2. Vite Environment Variables: Build-Time vs. Run-Time

React runs in the user's browser, not on the server. Because of this, standard Node.js environment variables (like `process.env`) are **not** accessible at runtime.

- **Vite Prefix:** Vite requires environment variables to start with `VITE_` (e.g., `VITE_API_URL`).
- **Static Injections:** Vite injects these variables during the build stage (`npm run build`). Consequently, changing environment variables on a running container will have **no effect** unless the app is rebuilt or a runtime configuration server is implemented.
- **Handling Multi-Environment Builds:** 
  1. Inject the environment variables as build arguments (`ARG` and `--build-arg`) during `docker build`.
  2. Alternatively, use a configuration endpoint or inject a shell script in the Nginx entrypoint to replace placeholders in the built Javascript files with runtime env values.

---

## 3. Caching Dependency Layers

To optimize build speed, structure your Dockerfile to take advantage of Docker's layer caching:

```dockerfile
# Copy package manifests first
COPY package.json package-lock.json ./

# Install dependencies (cached unless package files change)
RUN npm ci

# Copy the rest of the application code
COPY . .
```

*Never* copy the entire folder before running `npm install`. Copying all files first invalidates the cached dependency layer whenever any source code file changes, forcing a slow rebuild.

---

## 4. Production Nginx Configuration

To prevent `404 Not Found` errors when users reload pages managed by client-side routing (React Router), configure Nginx to route all requests back to `index.html`:

```nginx
server {
    listen 80;
    server_name localhost;

    location / {
        root /usr/share/nginx/html;
        index index.html index.htm;
        try_files $uri $uri/ /index.html;
    }

    error_page 500 502 503 504 /50x.html;
    location = /50x.html {
        root /usr/share/nginx/html;
    }
}
```

---

## 5. Copy-Pasteable Docker Commands

### Run Frontend in Development
Build and run the Vite dev server with port mapping and live hot-reloading:

```bash
# Build the dev image
docker build -t mern-frontend-dev -f Dockerfile.dev .

# Run the dev image with code bind-mounted
docker run -d \
  -p 5173:5173 \
  -v $(pwd):/app \
  -v /app/node_modules \
  --name mern-frontend-container-dev \
  mern-frontend-dev
```

### Build Production Image
Pass build-time variables (such as the backend API URL) into the multi-stage build:

```bash
docker build \
  --build-arg VITE_API_URL=http://localhost:5000 \
  -t mern-frontend-prod .
```

### Run Production Container
Run the Nginx-hosted production frontend:

```bash
docker run -d \
  -p 80:80 \
  --name mern-frontend-container-prod \
  mern-frontend-prod
```
