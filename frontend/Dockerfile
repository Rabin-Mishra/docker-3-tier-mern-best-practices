#build for stage 1 using the concpet of multi-stage build
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