# Step-by-Step Database Dockerization & Management Guide (MongoDB)

This guide provides an exhaustive, step-by-step walkthrough for writing a custom MongoDB `Dockerfile`, building the database image, configuring persistent storage, and running/managing the container using Docker commands.

---

## Phase 1: Step-by-Step Writing of the Dockerfile

When containerizing a database like MongoDB, we start from an official base image and customize it to support custom defaults, network exposure, and automated health checks. Here is how we build the `Dockerfile` step-by-step:

### Step 1.1: Choose the Base Image (`FROM`)
Every Dockerfile must start with a base image. We use the official MongoDB image.
```dockerfile
FROM mongo:6.0
```
* **Why?** Using `mongo:6.0` ensures we have a stable environment that includes the modern MongoDB shell (`mongosh`) pre-installed.

### Step 1.2: Add Metadata Labels (`LABEL`)
Labels add documentation directly to the image, making it easy to identify maintainers, versions, and descriptions when inspecting the image using `docker inspect`.
```dockerfile
LABEL maintainer="Admin <admin@example.com>"
LABEL version="1.0"
LABEL description="Custom MongoDB image with pre-configured settings and healthcheck support"
```

### Step 1.3: Define Environment Defaults (`ENV`)
Define variables that will be used inside the container by default.
```dockerfile
ENV MONGO_INITDB_DATABASE=mern_db
```
* **Why?** This automatically creates an application database named `mern_db` upon initial startup.

### Step 1.4: Document the Port (`EXPOSE`)
MongoDB listens on TCP port `27017` by default.
```dockerfile
EXPOSE 27017
```
* **Why?** The `EXPOSE` instruction serves as documentation to inform developers and orchestration tools that the container will listen on port `27017` at runtime.

### Step 1.5: Define a Health Check (`HEALTHCHECK`)
In production, it is vital to know if the database is actually responsive, not just running as a process.
```dockerfile
HEALTHCHECK --interval=30s --timeout=10s --retries=3 \
  CMD mongosh --eval 'db.runCommand("ping").ok' --quiet || exit 1
```
* **Why?** Every 30 seconds, Docker runs `mongosh` inside the container to ping the database. If it fails 3 times consecutively, Docker marks the container as `unhealthy`.

### Step 1.6: Set the Startup Command (`CMD`)
Specify the default executable for the container.
```dockerfile
CMD ["mongod"]
```
* **Why?** This starts the MongoDB daemon, keeping the database active and listening for connections.

---

## The Database Dockerfile Template

The final `database/Dockerfile` contains the combined steps:

```dockerfile
# Step 1: Define the base image
FROM mongo:6.0

# Step 2: Add metadata labels
LABEL maintainer="Admin <admin@example.com>"
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

---

## Phase 2: MongoDB Persistence (Docker Volumes)

By default, container filesystems are ephemeral. If a container is stopped or deleted, your data is lost. We must create and manage a **Named Volume** to store the database files persistently on the host machine.

### 1. Create a Named Volume
Before running the container, allocate a persistent volume on the host:
```bash
docker volume create db-data-vol
```

### 2. Verify the Volume
List all volumes to verify creation:
```bash
docker volume ls
```

### 3. Inspect the Volume
Find out where the volume is stored physically on your host filesystem:
```bash
docker volume inspect db-data-vol
```

### 4. Delete the Volume (Caution: Destructive!)
If you ever need to perform a clean reset and wipe all database data:
```bash
docker volume rm db-data-vol
```

---

## Phase 3: Building & Running the Database Container

### 1. Build the Custom Image
Navigate to the directory containing the database `Dockerfile` (or specify the path) and run the build command:
```bash
docker build -t mern-mongodb:1.0 ./database
```
* **`-t mern-mongodb:1.0`**: Tags the built image with the name `mern-mongodb` and version tag `1.0`.
* **`./database`**: Specifies the build context (directory containing the `Dockerfile`).

### 2. Run the Container
Launch your newly built image with credentials, volume mapping, and port forwarding:
```bash
docker run -d \
  --name mern-mongodb-container \
  -p 27017:27017 \
  -e MONGO_INITDB_ROOT_USERNAME=dbadmin \
  -e MONGO_INITDB_ROOT_PASSWORD=supersecurepassword \
  -e MONGO_INITDB_DATABASE=mern_db \
  -v db-data-vol:/data/db \
  --restart unless-stopped \
  mern-mongodb:1.0
```

#### Detailed Breakdown of Run Flags:
* **`-d`**: Runs the container in detached mode (in the background).
* **`--name mern-mongodb-container`**: Assigns a human-readable name to the running container.
* **`-p 27017:27017`**: Maps port `27017` of the host to port `27017` of the container.
* **`-e MONGO_INITDB_ROOT_USERNAME=dbadmin`**: Configures the root database administrator username.
* **`-e MONGO_INITDB_ROOT_PASSWORD=supersecurepassword`**: Configures the password for the root administrator.
* **`-e MONGO_INITDB_DATABASE=mern_db`**: Automatically creates the default database `mern_db` upon initial startup.
* **`-v db-data-vol:/data/db`**: Mounts our persistent Docker volume to MongoDB's internal data directory `/data/db`.
* **`--restart unless-stopped`**: Ensures the container starts up automatically if the host machine restarts or if the container crashes.

---

## Phase 4: Database Administration & Seeding Commands

Once the database container is running, use these commands to manage it.

### 1. Access the MongoDB Shell (Interactive Mode)
Log into the MongoDB console directly inside the container using the security credentials you set up:
```bash
docker exec -it mern-mongodb-container mongosh -u dbadmin -p supersecurepassword --authenticationDatabase admin
```

### 2. Database Seeding Options
For seeding dummy data or default schemas, you have two options:

#### Option A: Run the seed script via the backend Node environment (Recommended)
This uses your existing `seed.js` Node script which connects to MongoDB via Mongoose:
```bash
docker exec -it mern-backend-container node /app/database/seed.js
```

#### Option B: Automated Seeding at Build/Run Time (Init Directory)
MongoDB containers automatically execute scripts inside `/docker-entrypoint-initdb.d/` **only on the first startup** (when `/data/db` is empty).
1. Place a JavaScript shell-compatible file (not Mongoose code, but standard Mongo shell code, e.g., `db.users.insertOne(...)`) in the database directory.
2. In the `Dockerfile`, copy it into the initialization directory:
   ```dockerfile
   COPY ./init-data.js /docker-entrypoint-initdb.d/
   ```

---

## Phase 5: Backup & Restore Operations

Maintaining regular backups is crucial. Docker lets you execute commands inside a running database container and stream the output to the host.

### 1. Create a Backup Archive (Export)
We run `mongodump` inside the container and output a compressed archive file, then copy it to the host:
```bash
# 1. Execute mongodump to create the backup archive inside the container's temporary directory
docker exec -t mern-mongodb-container mongodump \
  -u dbadmin -p supersecurepassword \
  --authenticationDatabase admin \
  --db mern_db \
  --archive=/tmp/db_backup.archive

# 2. Copy the backup file from the container to your current host directory
docker cp mern-mongodb-container:/tmp/db_backup.archive ./db_backup.archive

# 3. Clean up the backup file inside the container
docker exec -t mern-mongodb-container rm /tmp/db_backup.archive
```

### 2. Restore from a Backup Archive (Import)
To restore the database from a backup file stored on your host:
```bash
# 1. Copy the backup file from your host into the container's temporary directory
docker cp ./db_backup.archive mern-mongodb-container:/tmp/db_backup.archive

# 2. Execute mongorestore inside the container to restore the database structure and data
docker exec -t mern-mongodb-container mongorestore \
  -u dbadmin -p supersecurepassword \
  --authenticationDatabase admin \
  --archive=/tmp/db_backup.archive \
  --drop

# 3. Clean up the temporary archive inside the container
docker exec -t mern-mongodb-container rm /tmp/db_backup.archive
```
* **`--drop`**: Drops collections from the target database before restoring them from the backup to prevent duplicates.

---

## Phase 6: Monitoring & Lifecycle Management

Use these commands to manage the container lifecycle and check its health.

### 1. View Logs (Debugging)
Check database startup sequences or connection errors:
```bash
# View last 100 log lines
docker logs --tail 100 mern-mongodb-container

# Stream logs in real-time (follow)
docker logs -f mern-mongodb-container
```

### 2. Check Container Health Status
Inspect the container to see if the custom healthcheck is passing:
```bash
docker inspect --format='{{json .State.Health}}' mern-mongodb-container
```

### 3. Monitor Resource Usage
Check CPU, Memory, and Network usage of the database container:
```bash
docker stats mern-mongodb-container
```

### 4. Lifecycle Control
```bash
# Stop the database container
docker stop mern-mongodb-container

# Start the database container back up
docker start mern-mongodb-container

# Restart the database container
docker restart mern-mongodb-container

# Remove the database container (data remains safe in the Docker volume)
docker rm mern-mongodb-container
```
