#development and dependency resolution stage
FROM node:20-alpine AS deps

WORKDIR /app

# Copy package manifests and install dependencies (compatible without BuildKit)
# This approach uses standard COPY so builds work even if BuildKit is not enabled.
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