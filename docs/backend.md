# Backend Dockerization Guide (Node.js + Express)

This guide covers Node.js and Express backend containerization best practices, environment configuration, persistent volume mounts for auth auditing, healthchecks, and the stateless active session derivation logic.

---

## 1. Node.js Production Best Practices

When running Node.js in production containers:
- **Use the Non-Root User:** By default, Node.js docker images run as `root`. This is a security risk. Use the built-in `node` user by declaring `USER node` in your Dockerfile. Make sure files and directories have appropriate owner permissions.
- **Node Environment (`NODE_ENV`):** Set `NODE_ENV=production`. This optimizes Express performance and limits stack traces in error messages.
- **Process Management:** Node.js should not be run as PID 1 because it does not handle kernel signals (like `SIGTERM`) properly, leading to zombie processes and ungraceful shutdowns. Use a minimal init system like `tini` (using the `--init` flag in docker run) or configure your process manager inside PM2.

---

## 2. API Healthcheck (`GET /health`)

Containers must expose their health status so that orchestration systems (like Docker Compose, Swarm, or Kubernetes) can monitor them:
- Our Express server exposes a `GET /health` endpoint that checks database connection health and system status.
- In the Dockerfile/Compose file, we can specify a healthcheck:
  ```yaml
  healthcheck:
    test: ["CMD", "curl", "-f", "http://localhost:5000/health"]
    interval: 30s
    timeout: 10s
    retries: 3
    start_period: 10s
  ```

---

## 3. Dual-Write Auth Logging & Docker Volumes

### Why Dual-Write? (MongoDB + JSON-lines file)
We implement a hybrid logging mechanism for security audits:
1. **MongoDB:** Serves as the application's relational database query source, allowing rapid querying, filtering, and pagination of login/logout logs in the admin dashboard.
2. **JSON-lines File (`/data/logs/auth-activity.log`):** Serves as an immutable, low-overhead audit trail. Because it is written directly to a mounted volume, it:
   - Survives database service crashes or corruption.
   - Allows external log forwarding agents (like Filebeat, Fluentd, or Logstash) to stream auth events in real-time.
   - Can be shared read-only with other secure monitor containers.

### JSON-lines Format (JSONL)
Each log entry is written as a single, newline-separated JSON object. This eliminates JSON parsing overhead for the entire file (which grows over time) and enables simple sequential parsing:
```json
{"timestamp":"2026-07-06T11:28:00.000Z","userId":"64b0f...","username":"admin","ip":"::ffff:127.0.0.1","userAgent":"Mozilla...","action":"login_success"}
```

---

## 4. Stateless JWT "Active Sessions" Derivation

Because JWT authentication is stateless, the server does not store active sessions in RAM or a Redis table. Instead, "Active Sessions" are dynamically derived from `AuthLog` entries:

### Derivation Criteria:
A session is determined to be active if:
1. There is a successful login record (`status: "success"`).
2. There is no subsequent logout event (`logoutAt: null`) for that user.
3. The session age (`loginAt`) is within the token's lifetime (`JWT_EXPIRES_IN`).

### Implementation Query:
```javascript
const jwtExpiresInMs = 24 * 60 * 60 * 1000; // e.g., 24 hours
const cutoffTime = new Date(Date.now() - jwtExpiresInMs);

const activeSessions = await AuthLog.find({
  status: 'success',
  logoutAt: null,
  loginAt: { $gte: cutoffTime }
});
```

---

## 5. Copy-Pasteable Docker Commands

### Setup a Named Volume for Logs
Create a persistent Docker volume dedicated to the authentication logs:

```bash
docker volume create auth-logs-vol
```

### Build the Backend Image
Build the production-ready Node.js container:

```bash
docker build -t mern-backend-prod .
```

### Run Backend Container (With Volume & Environment Variables)
Run the container using the non-root user, load environment variables, and mount the auth-logs volume:

```bash
docker run -d \
  -p 5000:5000 \
  --name mern-backend-container \
  --env-file .env \
  -v auth-logs-vol:/data/logs \
  mern-backend-prod
```

### View Live Backend Logs
Stream backend stdout logs:

```bash
docker logs -f mern-backend-container
```

### Inspect the Log File (Inside the Volume)
Inspect the auth audit log directly:

```bash
docker exec -it mern-backend-container cat /data/logs/auth-activity.log
```
