#!/bin/sh

# Generate config.js with environment variables at runtime
cat > /usr/share/nginx/html/config.js << EOF
window._env_ = {
  API_URL: '${VITE_API_URL:-http://localhost:5000/api}',
  ENVIRONMENT: '${ENVIRONMENT:-production}'
};
EOF

# Start Nginx
exec nginx -g "daemon off;"
