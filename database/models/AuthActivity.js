const mongoose = require('mongoose');

const AuthActivitySchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    default: null
  },
  username: {
    type: String,
    required: true
  },
  ip: {
    type: String,
    required: true
  },
  userAgent: {
    type: String,
    required: true
  },
  loginAt: {
    type: Date,
    required: true,
    default: Date.now
  },
  logoutAt: {
    type: Date,
    default: null
  },
  status: {
    type: String,
    enum: ['active', 'ended', 'failed'],
    required: true,
    default: 'active'
  }
});

// Configure indexes for fast recent-activity queries
AuthActivitySchema.index({ userId: 1, loginAt: -1 });
AuthActivitySchema.index({ loginAt: -1 });

module.exports = mongoose.models.AuthActivity || mongoose.model('AuthActivity', AuthActivitySchema);
