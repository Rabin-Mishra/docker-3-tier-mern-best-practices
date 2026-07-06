const express = require('express');
const router = express.Router();
const mongoose = require('mongoose');

router.get('/', (req, res) => {
  const dbState = mongoose.connection.readyState;
  let dbStatus = 'disconnected';
  
  if (dbState === 1) dbStatus = 'connected';
  else if (dbState === 2) dbStatus = 'connecting';
  else if (dbState === 3) dbStatus = 'disconnecting';

  const health = {
    status: dbStatus === 'connected' ? 'UP' : 'DOWN',
    timestamp: new Date(),
    uptime: process.uptime(),
    services: {
      database: {
        status: dbStatus,
        readyState: dbState
      },
      api: {
        status: 'UP'
      }
    }
  };

  if (dbStatus === 'connected') {
    res.status(200).json(health);
  } else {
    // Return a 503 Service Unavailable so Docker Healthcheck registers it as unhealthy
    res.status(503).json(health);
  }
});

module.exports = router;
