const express = require('express');
const router = express.Router();
const { getActivityLogs } = require('../controllers/adminController');
const { protect, adminOnly } = require('../middleware/authMiddleware');

// Get session audit log (both MongoDB history and raw JSON-lines file content)
router.get('/activity', protect, adminOnly, getActivityLogs);

module.exports = router;
