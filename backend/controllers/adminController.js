const fs = require('fs');
const path = require('path');
const AuthActivity = require('../../database/models/AuthActivity');

/**
 * @desc    Get all auth activity, active sessions, and raw volume log lines
 * @route   GET /api/admin/activity
 * @access  Private/Admin
 */
const getActivityLogs = async (req, res, next) => {
  try {
    // 1. Fetch latest login history from MongoDB
    const mongoLogs = await AuthActivity.find()
      .sort({ loginAt: -1 })
      .limit(100);

    // 2. Derive active sessions
    // Active session = status is 'active', logoutAt is null, and loginAt is within JWT expiry (default 24h)
    const jwtDurationMs = 24 * 60 * 60 * 1000; // 24 hours
    const activeSessionCutoff = new Date(Date.now() - jwtDurationMs);

    const activeSessions = await AuthActivity.find({
      status: 'active',
      logoutAt: null,
      loginAt: { $gte: activeSessionCutoff }
    }).sort({ loginAt: -1 });

    // 3. Read raw JSON-lines audit log from Docker volume destination
    const logDir = process.env.LOG_DIR || './data/logs';
    const logFilePath = path.join(logDir, 'auth-activity.log');
    let fileLogLines = [];

    if (fs.existsSync(logFilePath)) {
      try {
        const fileContent = fs.readFileSync(logFilePath, 'utf8');
        const lines = fileContent.trim().split('\n');
        
        // Parse each JSON line, filter empty lines, and reverse to get newest first
        fileLogLines = lines
          .filter(line => line.trim() !== '')
          .map(line => {
            try {
              return JSON.parse(line);
            } catch (err) {
              return { error: 'Malformed JSON line', raw: line };
            }
          })
          .reverse()
          .slice(0, 50); // Cap at 50 for performance
      } catch (fileErr) {
        console.error(`Error reading log file: ${fileErr.message}`);
        fileLogLines = [{ error: `Failed to read log file: ${fileErr.message}` }];
      }
    } else {
      fileLogLines = [{ warning: `Log file not found at ${logFilePath}. It will be created upon next login/logout event.` }];
    }

    return res.status(200).json({
      success: true,
      data: {
        activeSessions,
        history: mongoLogs,
        rawFileLogs: fileLogLines,
        logFilePath
      }
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getActivityLogs
};
