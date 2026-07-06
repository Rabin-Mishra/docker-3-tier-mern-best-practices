const jwt = require('jsonwebtoken');
const User = require('../models/User');
const { logLogin, logLogout } = require('../utils/authLogger');

// Helper to sign JWT
const signToken = (id) => {
  return jwt.sign({ id }, process.env.JWT_SECRET || 'supersecretsomewhereinuniverse', {
    expiresIn: process.env.JWT_EXPIRES_IN || '24h'
  });
};

/**
 * @desc    Login user & set cookie + audit log
 * @route   POST /api/auth/login
 * @access  Public
 */
const login = async (req, res, next) => {
  const { username, password } = req.body;
  const ip = req.headers['x-forwarded-for'] || req.socket.remoteAddress || 'unknown';
  const userAgent = req.headers['user-agent'] || 'unknown';

  try {
    // 1. Validation
    if (!username || !password) {
      res.status(400);
      throw new Error('Please provide both username and password');
    }

    // 2. Find user
    const user = await User.findOne({ username });
    if (!user) {
      // Log failed attempt
      await logLogin({ username, ip, userAgent, status: 'failed' });
      return res.status(401).json({ success: false, message: 'Invalid credentials' });
    }

    // 3. Verify password
    const isMatch = await user.matchPassword(password);
    if (!isMatch) {
      // Log failed attempt
      await logLogin({ userId: user._id, username, ip, userAgent, status: 'failed' });
      return res.status(401).json({ success: false, message: 'Invalid credentials' });
    }

    // 4. Generate JWT
    const token = signToken(user._id);

    // 5. Calculate cookie max age
    // Default 24 hours, or read standard env (parse to ms if needed, simplified to 24h default)
    const cookieMaxAge = 24 * 60 * 60 * 1000;

    // 6. Set HttpOnly Cookie
    res.cookie('token', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax', // Lax is appropriate for standard local development
      maxAge: cookieMaxAge
    });

    // 7. Write Audit Log (Success)
    await logLogin({
      userId: user._id,
      username: user.username,
      ip,
      userAgent,
      status: 'success'
    });

    // 8. Return response
    return res.status(200).json({
      success: true,
      user: {
        _id: user._id,
        username: user.username,
        role: user.role
      }
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Logout user & clear cookie + audit log
 * @route   POST /api/auth/logout
 * @access  Private
 */
const logout = async (req, res, next) => {
  const ip = req.headers['x-forwarded-for'] || req.socket.remoteAddress || 'unknown';
  const userAgent = req.headers['user-agent'] || 'unknown';

  try {
    if (!req.user) {
      return res.status(400).json({ success: false, message: 'No session to close' });
    }

    // 1. Audit Log (Logout)
    await logLogout({
      userId: req.user._id,
      username: req.user.username,
      ip,
      userAgent
    });

    // 2. Clear Cookie server-side
    res.clearCookie('token', {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax'
    });

    return res.status(200).json({ success: true, message: 'Logged out successfully' });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Register user
 * @route   POST /api/auth/register
 * @access  Public
 */
const register = async (req, res, next) => {
  const { username, email, password, role } = req.body;

  try {
    if (!username || !email || !password) {
      res.status(400);
      throw new Error('Please provide username, email, and password');
    }

    // Check if user already exists by username or email
    const userExists = await User.findOne({
      $or: [{ username }, { email }]
    });
    if (userExists) {
      res.status(400);
      throw new Error('Username or email already exists');
    }

    // Create user (passwordHash is automatically hashed by model pre-save hook)
    const user = await User.create({
      username,
      email,
      passwordHash: password,
      role: role || 'user'
    });

    return res.status(201).json({
      success: true,
      user: {
        _id: user._id,
        username: user.username,
        role: user.role
      }
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Get current user profile
 * @route   GET /api/auth/me
 * @access  Private
 */
const getMe = async (req, res, next) => {
  try {
    if (!req.user) {
      return res.status(401).json({ success: false, message: 'Not authenticated' });
    }
    return res.status(200).json({ success: true, user: req.user });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  register,
  login,
  logout,
  getMe
};
