const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const path = require('path');

// Load environment variables from the backend folder first, or local path
require('dotenv').config({ path: path.join(__dirname, '../backend/.env') });
require('dotenv').config();

const MONGO_URI = process.env.MONGO_URI || 'mongodb://localhost:27017/mern_db';
const SEED_ADMIN_EMAIL = process.env.SEED_ADMIN_EMAIL || 'admin@example.com';
const SEED_ADMIN_PASSWORD = process.env.SEED_ADMIN_PASSWORD || 'admin123';
const SEED_USER_EMAIL = process.env.SEED_USER_EMAIL || 'user@example.com';
const SEED_USER_PASSWORD = process.env.SEED_USER_PASSWORD || 'user123';

// Central schemas inline for seed execution independence
const UserSchema = new mongoose.Schema({
  username: { type: String, required: true, unique: true },
  email: { type: String, required: true, unique: true },
  passwordHash: { type: String, required: true },
  role: { type: String, enum: ['user', 'admin'], default: 'user' }
});

const AuthActivitySchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  username: { type: String, required: true },
  ip: { type: String, required: true },
  userAgent: { type: String, required: true },
  loginAt: { type: Date, required: true },
  logoutAt: { type: Date, default: null },
  status: { type: String, enum: ['active', 'ended', 'failed'], required: true }
});

const User = mongoose.models.User || mongoose.model('User', UserSchema);
const AuthActivity = mongoose.models.AuthActivity || mongoose.model('AuthActivity', AuthActivitySchema);

async function seedDatabase() {
  console.log(`Connecting to MongoDB at: ${MONGO_URI}`);
  try {
    await mongoose.connect(MONGO_URI);
    console.log('Database connected successfully.');

    // Clear existing collections
    await User.deleteMany({});
    await AuthActivity.deleteMany({});
    console.log('Cleared existing collections.');

    // Hash passwords
    const hashedAdminPassword = await bcrypt.hash(SEED_ADMIN_PASSWORD, 10);
    const hashedUserPassword = await bcrypt.hash(SEED_USER_PASSWORD, 10);

    // Create users matching schemas
    const adminUser = await User.create({
      username: 'admin',
      email: SEED_ADMIN_EMAIL,
      passwordHash: hashedAdminPassword,
      role: 'admin'
    });

    const standardUser = await User.create({
      username: 'user',
      email: SEED_USER_EMAIL,
      passwordHash: hashedUserPassword,
      role: 'user'
    });

    console.log(`Seeded Users:`);
    console.log(`- Admin: email=${SEED_ADMIN_EMAIL}, role=admin (Password from environment or 'admin123')`);
    console.log(`- Standard: email=${SEED_USER_EMAIL}, role=user (Password from environment or 'user123')`);

    // Create sample logs
    const now = new Date();
    const records = [
      {
        userId: adminUser._id,
        username: adminUser.username,
        ip: '::ffff:127.0.0.1',
        userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        loginAt: new Date(now.getTime() - 2 * 60 * 60 * 1000), // 2 hours ago
        logoutAt: new Date(now.getTime() - 1.5 * 60 * 60 * 1000), // 1.5 hours ago
        status: 'ended'
      },
      {
        userId: standardUser._id,
        username: standardUser.username,
        ip: '::ffff:192.168.1.50',
        userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_1_1 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.1 Mobile/15E148 Safari/604.1',
        loginAt: new Date(now.getTime() - 1 * 60 * 60 * 1000), // 1 hour ago
        logoutAt: null, // Active
        status: 'active'
      },
      {
        username: 'hackerguy',
        ip: '::ffff:203.0.113.19',
        userAgent: 'curl/7.81.0',
        loginAt: new Date(now.getTime() - 30 * 60 * 1000), // 30 mins ago
        logoutAt: null,
        status: 'failed'
      },
      {
        userId: adminUser._id,
        username: adminUser.username,
        ip: '::ffff:127.0.0.1',
        userAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36',
        loginAt: new Date(now.getTime() - 10 * 60 * 1000), // 10 mins ago (active admin)
        logoutAt: null,
        status: 'active'
      }
    ];

    await AuthActivity.insertMany(records);
    console.log('Seeded sample AuthActivity history logs.');

    console.log('Seeding complete!');
  } catch (error) {
    console.error('Error seeding database:', error);
  } finally {
    await mongoose.connection.close();
    console.log('Database connection closed.');
  }
}

seedDatabase();
