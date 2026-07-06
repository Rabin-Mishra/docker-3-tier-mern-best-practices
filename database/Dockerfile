# ==========================================
# MongoDB Custom Dockerfile
# ==========================================

# Step 1: Define the base image
# We use the official, stable MongoDB 6.0 image. This version includes
# the modern MongoDB Shell (mongosh) and is highly compatible with Mongoose.
FROM mongo:6.0

# Step 2: Add metadata labels
# Labels provide useful documentation such as maintainer details and descriptions.
LABEL maintainer="Admin <rabin@rabinmishra.com.np>"
LABEL version="1.0"
LABEL description="Custom MongoDB image with pre-configured settings and healthcheck support"

# Step 3: Define environment variables (optional defaults)
# These act as fallbacks if not provided during container startup.
ENV MONGO_INITDB_DATABASE=mern_db

# Step 4: Expose the standard MongoDB port
# This exposes the standard database port to other containers in the Docker network.
EXPOSE 27017

# Step 5: (Optional) Setup default configurations
# If custom configurations are needed, uncomment the line below.
# COPY mongod.conf /etc/mongod.conf

# Step 6: Define a Container Healthcheck
# This ensures that Docker can monitor the health of the MongoDB service.
# It checks if mongosh can connect and ping the database.
HEALTHCHECK --interval=30s --timeout=10s --retries=3 \
    CMD mongosh --eval 'db.runCommand("ping").ok' --quiet || exit 1

# Step 7: Specify the default command
# Start the MongoDB daemon process.
CMD ["mongod"]
