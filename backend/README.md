# Express Backend Server

An API server built with Express and Mongoose featuring cookie-based JWT authentication, a health verification endpoint, and a dual-write auth logging engine.

---

## Environment Variables

Create a `.env` file in this directory based on the `.env.example` file:

```env
PORT=5000
NODE_ENV=development
MONGO_URI=mongodb://localhost:27017/mern_db
JWT_SECRET=supersecretsomewhereinuniverse
JWT_EXPIRES_IN=24h
LOG_DIR=./logs
SEED_ADMIN_PASSWORD=admin123
SEED_USER_PASSWORD=user123
CLIENT_URL=http://localhost:5173
```

---

## Local Development (Non-Docker)

1. Make sure you have a MongoDB server running locally.
2. Install dependencies:
   ```bash
   npm install
   ```
3. Run the development server (with nodemon):
   ```bash
   npm run dev
   ```
4. Run the production start command:
   ```bash
   npm start
   ```

---

## API Documentation

- **Healthcheck:** `GET /health` - Returns container status code 200/503.
- **Authentication:**
  - `POST /api/auth/login` - Authenticates user and sets HttpOnly cookie `token`.
  - `POST /api/auth/logout` - Clears `token` cookie and updates active session.
  - `GET /api/auth/me` - Validates token and returns current user payload.
- **Docker Guides:**
  - `GET /api/guides/:tier` - Fetches markdown source dynamically for `frontend`, `backend`, or `database`.
- **Admin Audit Dashboard:**
  - `GET /api/admin/activity` - Restricted to `admin` role. Returns current active sessions, full DB authentication logs, and the raw lines of `auth-activity.log` from host file.
