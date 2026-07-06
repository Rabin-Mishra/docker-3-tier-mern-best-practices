# Vite React Frontend client

A documentation reference client built with Vite and React, styled using a custom Vanilla CSS dark-mode design system. It renders markdown guides fetched dynamically from the API server and displays admin active sessions/history and raw log files.

---

## Configuration

During development, the frontend communicates with the API backend at `http://localhost:5000/api` by default.

To configure a different API URL, define `VITE_API_URL` during build-time or in a local `.env` configuration file:

```env
VITE_API_URL=http://localhost:5000/api
```

---

## Local Development (Non-Docker)

1. Navigate to this directory.
2. Install dependencies:
   ```bash
   npm install
   ```
3. Launch the Vite development server:
   ```bash
   npm run dev
   ```
   Open [http://localhost:5173](http://localhost:5173) in your browser.

---

## Production Build

To compile the React files into static assets (under `/dist` directory):

```bash
npm run build
```

These assets can then be served by static hosts or web servers like Nginx.
