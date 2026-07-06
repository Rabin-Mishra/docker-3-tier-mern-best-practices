# Database Dockerization Guide (MongoDB)

This guide documents containerization architecture, persistence strategies, credentials security, health checking, and data recovery patterns for MongoDB inside a MERN application stack.

---

## 1. Using the Official MongoDB Image Directly vs. Custom Dockerfiles

MongoDB is a complex database engine requiring fine-tuned configurations for memory allocation, logging, and security.

### Direct Usage (Recommended)
In most production setups, you should run the official MongoDB image (e.g. `mongo:6.0` or `mongo:7.0`) directly without writing a custom Dockerfile. The official image is already hardened, actively maintained, and configured for secure container operation.

### When is a Custom Dockerfile Justified?
Writing a custom Dockerfile for MongoDB is only justified in specific scenarios:
1. **Pre-loading Database Initializations:** When you need to bundle database seed scripts, user roles, or index definitions that must run automatically on the container's first boot by placing them inside `/docker-entrypoint-initdb.d/`.
2. **Installing Custom Pluggable Engines:** If your application requires specialized enterprise plugins, auditing tools, or LDAP authentication extensions.
3. **Advanced Security Hardening:** Injecting custom configuration templates (`mongod.conf`) directly into the image filesystem for environment lock-downs.

---

## 2. Production Storage: Named Volumes vs. Bind Mounts

### Named Volumes (Recommended for Production)
For MongoDB data persistence, always map `/data/db` to a **Docker Named Volume**:
```yaml
services:
  database:
    image: mongo:6.0
    volumes:
      - mongodb-data:/data/db

volumes:
  mongodb-data:
```
- **Why?** Docker manages the storage area on the host filesystem directly. This ensures optimal disk performance, proper file permission mappings, and compatibility across differing host architectures.

### Why Bind Mounts are Discouraged for Data Directories
- **Permission Mapping Issues:** MongoDB runs as a specific system user (`mongodb`, UID 999) inside the container. Bind mounts force the container to write files directly to a host directory. If the host permissions are not aligned, MongoDB will fail to start due to permission failures (`EACCES` or locked database files).
- **Filesystem Locking Mismatch:** Production databases using the WiredTiger storage engine require strict filesystem locks. Network-attached storage (NAS) or Windows/macOS virtual bind mounts do not support these locks natively, causing silent database corruption or read/write freezes.

---

## 3. High-Security Credentials via Docker Secrets

Hardcoding passwords or injecting them as plain-text environment variables (e.g., `MONGO_INITDB_ROOT_PASSWORD`) is a severe security vulnerability.

### Best Practice: The `*_FILE` Environment Convention
Official database images support appending `_FILE` to credential variables. Instead of passing the raw password, you pass the path to a mounted file containing the password:

```yaml
services:
  database:
    image: mongo:6.0
    environment:
      - MONGO_INITDB_ROOT_USERNAME=dbadmin
      - MONGO_INITDB_ROOT_PASSWORD_FILE=/run/secrets/db_root_password
    secrets:
      - db_root_password

secrets:
  db_root_password:
    file: ./secrets/db_root_password.txt
```

At runtime, MongoDB reads the secure secret file inside the container RAM (`/run/secrets/db_root_password`) to initialize the database admin account. The credentials are never written to disk or shown in `docker inspect` outputs.

---

## 4. Container Healthchecks & Service Dependencies

To prevent the backend API server from failing during boot (due to database connection timeouts), MongoDB must expose its health status:

```yaml
services:
  database:
    image: mongo:6.0
    healthcheck:
      # Pings the DB server to check if it is ready to accept queries
      test: ["CMD", "mongosh", "--eval", "db.adminCommand('ping')"]
      interval: 10s
      timeout: 5s
      retries: 5
      start_period: 10s

  api:
    image: mern-api:latest
    depends_on:
      database:
        condition: service_healthy # Block API boot until database health check succeeds
```

---

## 5. Backups & Disaster Recovery

### A. Database Dumps (WiredTiger Archives)
To run automated backups without bringing down the database container, use `mongodump` inside the running container context:
```bash
# Backup MongoDB database to a compressed archive file on host
docker exec -t mern-mongodb-container mongodump \
  --username dbadmin \
  --password <PASSWORD> \
  --authenticationDatabase admin \
  --db mern_db \
  --archive=/tmp/backup.archive

# Copy the archive file to the host machine backup directory
docker cp mern-mongodb-container:/tmp/backup.archive ./backups/db_backup.archive
```

### B. Decoupled Auditing logs Backup
Our Express backend dual-writes auth logs to a Docker volume (`auth-logs-vol`). For a full security audit trail, back up this volume alongside your database archives:
```bash
# Back up the auth-activity logs directly from the volume
docker run --rm \
  -v auth-logs-vol:/data/logs:ro \
  -v ./backups:/backup \
  alpine tar cvf /backup/auth_audit.tar /data/logs
```

---

## 6. Docker Command Templates

### A. Managing Volumes
```bash
# List all active Docker volumes
docker volume ls

# Inspect host details and mount path of a volume
docker volume inspect mongodb-data
```

### B. Interactive MongoDB Shell
```bash
docker exec -it mern-mongodb-container mongosh \
  -u dbadmin \
  -p <PASSWORD> \
  --authenticationDatabase admin
```

### C. Mounting Seeding Scripts Read-Only at Container Boot
If you want the database container to initialize itself with your seed script on startup without rebuilding the image:
```bash
docker run -d \
  --name mern-mongodb-seed \
  -p 27017:27017 \
  -e MONGO_INITDB_ROOT_USERNAME=dbadmin \
  -e MONGO_INITDB_ROOT_PASSWORD=securepassword \
  -v mongodb-data:/data/db \
  -v $(pwd)/database/seed.js:/docker-entrypoint-initdb.d/seed.js:ro \
  mongo:6.0
```
*(The `:ro` flag ensures the container cannot modify the seed script file on the host.)*
