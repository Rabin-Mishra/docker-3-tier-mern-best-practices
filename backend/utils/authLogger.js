const fs = require('fs');
const path = require('path');
const AuthActivity = require('../../database/models/AuthActivity');

// Helper to write to JSON-lines audit log file
const appendToJsonLinesLog = async (logData) => {
  const logDir = process.env.LOG_DIR || './data/logs';
  const logFilePath = path.join(logDir, 'auth-activity.log');

  try {
    // Ensure the log directory exists
    if (!fs.existsSync(logDir)) {
      fs.mkdirSync(logDir, { recursive: true });
    }

    const logString = JSON.stringify(logData) + '\n';
    
    // Append to file asynchronously
    fs.appendFile(logFilePath, logString, 'utf8', (err) => {
      if (err) {
        console.error(`Failed to write to JSON-lines audit log file: ${err.message}`);
      }
    });
  } catch (error) {
    console.error(`Error in JSON-lines logger setup: ${error.message}`);
  }
};

/**
 * Logs a login attempt (success or failure)
 */
const logLogin = async ({ userId, username, ip, userAgent, status }) => {
  const timestamp = new Date();
  
  try {
    // 1. Write to MongoDB using active/failed states
    const mongoLog = await AuthActivity.create({
      userId,
      username,
      ip,
      userAgent,
      loginAt: timestamp,
      status: status === 'success' ? 'active' : 'failed'
    });

    // 2. Append to JSON-lines log file
    const fileLogData = {
      timestamp: timestamp.toISOString(),
      logId: mongoLog._id,
      userId: userId || null,
      username,
      ip,
      userAgent,
      action: status === 'success' ? 'login_success' : 'login_failed'
    };

    await appendToJsonLinesLog(fileLogData);
    return mongoLog;
  } catch (error) {
    console.error(`Failed to record login audit: ${error.message}`);
  }
};

/**
 * Logs a logout event
 */
const logLogout = async ({ userId, username, ip, userAgent }) => {
  const timestamp = new Date();

  try {
    // 1. Update the latest active session in MongoDB to 'ended'
    const latestActiveLog = await AuthActivity.findOneAndUpdate(
      {
        userId,
        status: 'active',
        logoutAt: null
      },
      { 
        logoutAt: timestamp,
        status: 'ended'
      },
      { new: true, sort: { loginAt: -1 } }
    );

    // 2. Append logout event to JSON-lines audit file
    const fileLogData = {
      timestamp: timestamp.toISOString(),
      logId: latestActiveLog ? latestActiveLog._id : null,
      userId,
      username,
      ip,
      userAgent,
      action: 'logout'
    };

    await appendToJsonLinesLog(fileLogData);
    return latestActiveLog;
  } catch (error) {
    console.error(`Failed to record logout audit: ${error.message}`);
  }
};

module.exports = {
  logLogin,
  logLogout
};
