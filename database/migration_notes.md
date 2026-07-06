# Database Migrations & Version Control in Docker

This document explains how database migrations, schema evolution, and indexing are managed in a Docker-containerized MongoDB deployment.

---

## 1. Schema Evolution in Mongoose vs. Raw Mongo

Because MongoDB is schema-less by nature, schema enforcement is handled at the application layer by **Mongoose**.

- **No Strict Migrations Needed for Additions:** Adding new properties with default values in Mongoose does not require running dynamic update queries on the database. Mongoose handles default values at runtime:
  ```javascript
  const UserSchema = new mongoose.Schema({
    username: { type: String, required: true },
    role: { type: String, default: 'user' } // Automatically applied when queried via Mongoose
  });
  ```
- **Breaking Changes:** If a field is renamed or removed, we must write a migration script to update existing database documents.

---

## 2. Running Migration Scripts Inside Docker Containers

When schema changes require data transformation:
1. **Write a standard Node.js script** that connects to the database via mongoose and runs updates (e.g. `db.collection.updateMany(...)`).
2. **Execute it via docker exec:**
   ```bash
   docker exec -it mern-backend-container node /app/database/migration-v2.js
   ```
3. **Automate via container entrypoints:** For production deployments, run migration scripts as a pre-start step in the container’s startup script (`CMD` or `ENTRYPOINT`), ensuring the migration completes before the Express web server starts listening.

---

## 3. Creating and Managing Indexes

Indexes improve query performance (e.g., searching for active sessions by date).
- **Mongoose Auto-Indexes:** By default, Mongoose runs `ensureIndex` on startup for schemas containing index rules (like `unique: true`). In production, this can degrade startup performance or lock tables.
- **Production Indexing Best Practice:** Set `autoIndex: false` in production configuration, and create indexes manually or via a migrations container:
  ```javascript
  // In Mongoose config
  mongoose.connect(process.env.MONGO_URI, { autoIndex: false });
  ```
  Then create them in MongoDB shell:
  ```bash
  docker exec -it mern-mongodb-container mongosh -u dbadmin -p supersecurepassword \
    --eval "db.getSiblingDB('mern_db').users.createIndex({ username: 1 }, { unique: true })"
  ```
