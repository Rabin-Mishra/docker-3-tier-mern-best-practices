const fs = require('fs');
const path = require('path');

/**
 * @desc    Get markdown documentation for a specific tier
 * @route   GET /api/guides/:tier
 * @access  Public
 */
const getGuideContent = (req, res, next) => {
  const { tier } = req.params;
  const validTiers = [
    'frontend', 'backend', 'database', 
    'frontend-docker-guide', 'backend-docker-guide', 'database-docker-guide'
  ];

  try {
    if (!validTiers.includes(tier)) {
      res.status(400);
      throw new Error(`Invalid tier requested. Choose from: ${validTiers.join(', ')}`);
    }

    // Docs directory is located at root /docs
    const docsDir = path.join(__dirname, '../../docs');
    
    // Map tier name to actual filename
    let filename = `${tier}.md`;
    if (tier === 'frontend' || tier === 'frontend-docker-guide') {
      filename = 'frontend-docker-guide.md';
    } else if (tier === 'backend' || tier === 'backend-docker-guide') {
      filename = 'backend-docker-guide.md';
    } else if (tier === 'database' || tier === 'database-docker-guide') {
      filename = 'database-docker-guide.md';
    }
      
    const filePath = path.join(docsDir, filename);

    if (!fs.existsSync(filePath)) {
      res.status(404);
      throw new Error(`Guide for '${tier}' not found on server.`);
    }

    const markdown = fs.readFileSync(filePath, 'utf8');

    return res.status(200).json({
      success: true,
      tier,
      content: markdown
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getGuideContent
};
