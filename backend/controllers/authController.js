const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const dayjs = require('dayjs');
const db = require('../config/db');

const JWT_SECRET = process.env.JWT_SECRET || 'super_secret_jwt_key_invoice_pro_2026_secure!';
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || '7d';

function signToken(userId, email) {
  return jwt.sign({ id: userId, email }, JWT_SECRET, { expiresIn: JWT_EXPIRES_IN });
}

// POST /api/auth/register
exports.register = async (req, res, next) => {
  try {
    const { name, business_name, email, phone, password, confirmPassword } = req.body;

    if (!name || !business_name || !email || !password) {
      return res.status(400).json({
        success: false,
        message: 'Name, business name, email, and password are required.'
      });
    }

    if (confirmPassword && password !== confirmPassword) {
      return res.status(400).json({
        success: false,
        message: 'Passwords do not match.'
      });
    }

    const normalizedEmail = email.trim().toLowerCase();

    // Check if email already registered
    const [existing] = await db.query('SELECT id FROM users WHERE email = ?', [normalizedEmail]);
    if (existing && existing.length > 0) {
      return res.status(409).json({
        success: false,
        message: 'An account with this email address already exists. Please log in.'
      });
    }

    // Hash password
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    // Create user
    const [userResult] = await db.query(
      `INSERT INTO users (name, business_name, email, phone, password, role)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [name.trim(), business_name.trim(), normalizedEmail, phone || '', hashedPassword, 'admin']
    );

    const userId = userResult.insertId;

    // Create default business settings row
    await db.query(
      `INSERT INTO business_settings 
       (user_id, business_name, email, phone, invoice_prefix, next_invoice_number, default_tax_rate, default_payment_terms, invoice_footer)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        userId,
        business_name.trim(),
        normalizedEmail,
        phone || '',
        'INV-',
        1001,
        18.00,
        'Due within 15 days of invoice date',
        'Thank you for your business!'
      ]
    );

    const token = signToken(userId, normalizedEmail);

    return res.status(201).json({
      success: true,
      message: 'Account registered successfully.',
      token,
      user: {
        id: userId,
        name: name.trim(),
        business_name: business_name.trim(),
        email: normalizedEmail,
        phone: phone || '',
        role: 'admin'
      }
    });
  } catch (err) {
    next(err);
  }
};

// POST /api/auth/login
exports.login = async (req, res, next) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({
        success: false,
        message: 'Email and password are required.'
      });
    }

    const normalizedEmail = email.trim().toLowerCase();

    const [users] = await db.query('SELECT * FROM users WHERE email = ?', [normalizedEmail]);
    if (!users || users.length === 0) {
      return res.status(401).json({
        success: false,
        message: 'Invalid email or password.'
      });
    }

    const user = users[0];
    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(401).json({
        success: false,
        message: 'Invalid email or password.'
      });
    }

    const token = signToken(user.id, user.email);

    return res.json({
      success: true,
      message: 'Logged in successfully.',
      token,
      user: {
        id: user.id,
        name: user.name,
        business_name: user.business_name,
        email: user.email,
        phone: user.phone,
        role: user.role
      }
    });
  } catch (err) {
    next(err);
  }
};

// GET /api/auth/me
exports.getMe = async (req, res, next) => {
  try {
    const userId = req.user.id;
    const [users] = await db.query(
      'SELECT id, name, business_name, email, phone, role, created_at FROM users WHERE id = ?',
      [userId]
    );

    if (!users || users.length === 0) {
      return res.status(404).json({ success: false, message: 'User not found.' });
    }

    const [settings] = await db.query('SELECT * FROM business_settings WHERE user_id = ?', [userId]);

    return res.json({
      success: true,
      user: users[0],
      settings: settings[0] || null
    });
  } catch (err) {
    next(err);
  }
};

// POST /api/auth/logout
exports.logout = async (req, res) => {
  // Stateless JWT logout - frontend clears localStorage
  return res.json({
    success: true,
    message: 'Logged out successfully.'
  });
};

// POST /api/auth/forgot-password
exports.forgotPassword = async (req, res, next) => {
  try {
    const { email } = req.body;
    if (!email) {
      return res.status(400).json({ success: false, message: 'Email is required.' });
    }

    const normalizedEmail = email.trim().toLowerCase();
    const [users] = await db.query('SELECT id, email, name FROM users WHERE email = ?', [normalizedEmail]);

    if (!users || users.length === 0) {
      // Don't leak user existence for security
      return res.json({
        success: true,
        message: 'If an account exists with this email, a password reset link has been dispatched.'
      });
    }

    const user = users[0];
    const resetToken = crypto.randomBytes(32).toString('hex');
    const expiresAt = dayjs().add(1, 'hour').format('YYYY-MM-DD HH:mm:ss');

    await db.query(
      'INSERT INTO password_resets (user_id, token, expires_at, used) VALUES (?, ?, ?, 0)',
      [user.id, resetToken, expiresAt]
    );

    return res.json({
      success: true,
      message: 'Password reset token generated successfully. In development/testing, use the provided reset token.',
      resetToken // Convenience for instant testing
    });
  } catch (err) {
    next(err);
  }
};

// POST /api/auth/reset-password
exports.resetPassword = async (req, res, next) => {
  try {
    const { token, newPassword } = req.body;

    if (!token || !newPassword) {
      return res.status(400).json({ success: false, message: 'Token and new password are required.' });
    }

    if (newPassword.length < 6) {
      return res.status(400).json({ success: false, message: 'Password must be at least 6 characters.' });
    }

    const [records] = await db.query(
      'SELECT * FROM password_resets WHERE token = ? AND used = 0 ORDER BY id DESC LIMIT 1',
      [token]
    );

    if (!records || records.length === 0) {
      return res.status(400).json({ success: false, message: 'Invalid or already used password reset token.' });
    }

    const record = records[0];
    if (dayjs().isAfter(dayjs(record.expires_at))) {
      return res.status(400).json({ success: false, message: 'Password reset token has expired.' });
    }

    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(newPassword, salt);

    await db.query('UPDATE users SET password = ? WHERE id = ?', [hashedPassword, record.user_id]);
    await db.query('UPDATE password_resets SET used = 1 WHERE id = ?', [record.id]);

    return res.json({
      success: true,
      message: 'Password reset successful. You can now log in with your new password.'
    });
  } catch (err) {
    next(err);
  }
};
