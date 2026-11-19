const bcrypt = require('bcryptjs');
const db = require('../config/db');

// GET /api/settings
exports.getSettings = async (req, res, next) => {
  try {
    const userId = req.user.id;

    const [userRows] = await db.query(
      'SELECT id, name, business_name, email, phone, role FROM users WHERE id = ?',
      [userId]
    );

    const [settingRows] = await db.query(
      'SELECT * FROM business_settings WHERE user_id = ?',
      [userId]
    );

    return res.json({
      success: true,
      user: userRows[0] || null,
      settings: settingRows[0] || null
    });
  } catch (err) {
    next(err);
  }
};

// PUT /api/settings
exports.updateSettings = async (req, res, next) => {
  try {
    const userId = req.user.id;
    const {
      business_name,
      email,
      phone,
      address,
      city,
      state,
      postal_code,
      country = 'India',
      gstin,
      currency = 'INR',
      currency_symbol = '₹',
      invoice_prefix = 'INV-',
      next_invoice_number,
      default_tax_rate = 18.00,
      default_payment_terms,
      invoice_footer,
      signature_text,
      signature_title,
      signature_image_url,
      signature_font,
      user_name,
      user_phone
    } = req.body;

    // Update user profile info
    if (user_name || business_name || user_phone) {
      await db.query(
        `UPDATE users SET 
           name = COALESCE(?, name),
           business_name = COALESCE(?, business_name),
           phone = COALESCE(?, phone),
           updated_at = CURRENT_TIMESTAMP
         WHERE id = ?`,
        [user_name || null, business_name || null, user_phone || null, userId]
      );
    }

    // Check existing business_settings
    const [existing] = await db.query('SELECT id FROM business_settings WHERE user_id = ?', [userId]);

    if (!existing || existing.length === 0) {
      await db.query(
        `INSERT INTO business_settings 
         (user_id, business_name, email, phone, address, city, state, postal_code, country, gstin, currency, currency_symbol, invoice_prefix, next_invoice_number, default_tax_rate, default_payment_terms, invoice_footer, signature_text, signature_title, signature_image_url, signature_font)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          userId,
          business_name || '',
          email || '',
          phone || '',
          address || '',
          city || '',
          state || '',
          postal_code || '',
          country,
          gstin ? gstin.toUpperCase() : '',
          currency,
          currency_symbol,
          invoice_prefix,
          next_invoice_number || 1001,
          default_tax_rate,
          default_payment_terms || '',
          invoice_footer || '',
          signature_text || 'INFOTECH',
          signature_title || 'AUTHORIZED SIGNATORY',
          signature_image_url || '',
          signature_font || 'marker'
        ]
      );
    } else {
      await db.query(
        `UPDATE business_settings SET
           business_name = COALESCE(?, business_name),
           email = COALESCE(?, email),
           phone = COALESCE(?, phone),
           address = COALESCE(?, address),
           city = COALESCE(?, city),
           state = COALESCE(?, state),
           postal_code = COALESCE(?, postal_code),
           country = COALESCE(?, country),
           gstin = COALESCE(?, gstin),
           currency = COALESCE(?, currency),
           currency_symbol = COALESCE(?, currency_symbol),
           invoice_prefix = COALESCE(?, invoice_prefix),
           next_invoice_number = COALESCE(?, next_invoice_number),
           default_tax_rate = COALESCE(?, default_tax_rate),
           default_payment_terms = COALESCE(?, default_payment_terms),
           invoice_footer = COALESCE(?, invoice_footer),
           signature_text = COALESCE(?, signature_text),
           signature_title = COALESCE(?, signature_title),
           signature_image_url = COALESCE(?, signature_image_url),
           signature_font = COALESCE(?, signature_font),
           updated_at = CURRENT_TIMESTAMP
         WHERE user_id = ?`,
        [
          business_name,
          email,
          phone,
          address,
          city,
          state,
          postal_code,
          country,
          gstin ? gstin.toUpperCase() : null,
          currency,
          currency_symbol,
          invoice_prefix,
          next_invoice_number ? Number(next_invoice_number) : null,
          default_tax_rate !== undefined ? Number(default_tax_rate) : null,
          default_payment_terms,
          invoice_footer,
          signature_text,
          signature_title,
          signature_image_url,
          signature_font,
          userId
        ]
      );
    }

    const [updatedSettings] = await db.query('SELECT * FROM business_settings WHERE user_id = ?', [userId]);

    return res.json({
      success: true,
      message: 'Business settings updated successfully.',
      settings: updatedSettings[0]
    });
  } catch (err) {
    next(err);
  }
};

// POST /api/settings/upload-logo
exports.uploadLogo = async (req, res, next) => {
  try {
    const userId = req.user.id;

    if (!req.file) {
      return res.status(400).json({ success: false, message: 'No image file uploaded.' });
    }

    const logoUrl = `/uploads/${req.file.filename}`;

    await db.query(
      'UPDATE business_settings SET logo_url = ?, updated_at = CURRENT_TIMESTAMP WHERE user_id = ?',
      [logoUrl, userId]
    );

    return res.json({
      success: true,
      message: 'Business logo uploaded successfully.',
      logoUrl
    });
  } catch (err) {
    next(err);
  }
};

// POST /api/settings/upload-signature
exports.uploadSignature = async (req, res, next) => {
  try {
    const userId = req.user.id;

    if (!req.file) {
      return res.status(400).json({ success: false, message: 'No signature file uploaded.' });
    }

    const signatureUrl = `/uploads/${req.file.filename}`;

    await db.query(
      'UPDATE business_settings SET signature_image_url = ?, updated_at = CURRENT_TIMESTAMP WHERE user_id = ?',
      [signatureUrl, userId]
    );

    return res.json({
      success: true,
      message: 'Signature image uploaded successfully.',
      signatureUrl
    });
  } catch (err) {
    next(err);
  }
};

// POST /api/settings/change-password
exports.changePassword = async (req, res, next) => {
  try {
    const userId = req.user.id;
    const { currentPassword, newPassword } = req.body;

    if (!currentPassword || !newPassword) {
      return res.status(400).json({ success: false, message: 'Current password and new password are required.' });
    }

    if (newPassword.length < 6) {
      return res.status(400).json({ success: false, message: 'New password must be at least 6 characters.' });
    }

    const [users] = await db.query('SELECT password FROM users WHERE id = ?', [userId]);
    if (!users || users.length === 0) {
      return res.status(404).json({ success: false, message: 'User not found.' });
    }

    const isMatch = await bcrypt.compare(currentPassword, users[0].password);
    if (!isMatch) {
      return res.status(400).json({ success: false, message: 'Current password does not match.' });
    }

    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(newPassword, salt);

    await db.query('UPDATE users SET password = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?', [hashedPassword, userId]);

    return res.json({
      success: true,
      message: 'Password changed successfully.'
    });
  } catch (err) {
    next(err);
  }
};
