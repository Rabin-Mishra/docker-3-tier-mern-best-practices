# Database Schema and Seeding

This directory manages Mongoose database models, migration logs, and seeding scripts for local and containerized deployments.

---

## Running Seed Scripts

### 1. Local (Non-Docker) Development
Ensure you have a MongoDB instance running locally (e.g. at `mongodb://localhost:27017`).

1. Install dependencies from the `backend/` folder (or run it after installing dependencies there).
2. Set the environment variable `MONGO_URI` if different from the default.
3. Run the seed script:
   ```bash
   node seed.js
   ```

### 2. Containerized (Docker) Development
When running with Docker / Docker Compose, you can run the seed script on-demand against the containerized MongoDB service:

```bash
# Execute the seed script inside the running backend container
docker exec -it mern-backend-container node /app/database/seed.js
```

Alternatively, copy `seed.js` into your custom mongo Docker build and register it under `/docker-entrypoint-initdb.d` to execute automatically on first start.
