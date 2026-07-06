const express = require('express');
const router = express.Router();
const { getGuideContent } = require('../controllers/guideController');

// Serve guide markdown files dynamically
router.get('/:tier', getGuideContent);

module.exports = router;
