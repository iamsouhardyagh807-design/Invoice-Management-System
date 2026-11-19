const db = require('../config/db');

// GET /api/customers
exports.getCustomers = async (req, res, next) => {
  try {
    const userId = req.user.id;
    const { search, state, sortBy = 'created_at', sortOrder = 'DESC' } = req.query;

    let sql = `
      SELECT 
        c.*,
        COUNT(DISTINCT i.id) as total_invoices,
        COALESCE(SUM(i.grand_total), 0) as total_billed,
        COALESCE(SUM(i.paid_amount), 0) as total_paid,
        COALESCE(SUM(i.due_amount), 0) as outstanding_balance
      FROM customers c
      LEFT JOIN invoices i ON c.id = i.customer_id
      WHERE c.user_id = ?
    `;

    const params = [userId];

    if (search && search.trim() !== '') {
      sql += ` AND (c.name LIKE ? OR c.company_name LIKE ? OR c.email LIKE ? OR c.phone LIKE ?)`;
      const s = `%${search.trim()}%`;
      params.push(s, s, s, s);
    }

    if (state && state.trim() !== '') {
      sql += ` AND c.state = ?`;
      params.push(state.trim());
    }

    sql += ` GROUP BY c.id`;

    // Safe sorting
    const validSortFields = ['name', 'company_name', 'created_at', 'total_billed', 'outstanding_balance'];
    const sortField = validSortFields.includes(sortBy) ? sortBy : 'c.created_at';
    const order = sortOrder.toUpperCase() === 'ASC' ? 'ASC' : 'DESC';

    sql += ` ORDER BY ${sortField} ${order}`;

    const [customers] = await db.query(sql, params);

    return res.json({
      success: true,
      count: customers.length,
      customers
    });
  } catch (err) {
    next(err);
  }
};

// GET /api/customers/:id
exports.getCustomerById = async (req, res, next) => {
  try {
    const userId = req.user.id;
    const customerId = req.params.id;

    const [customers] = await db.query(
      `SELECT 
         c.*,
         COUNT(DISTINCT i.id) as total_invoices,
         COALESCE(SUM(i.grand_total), 0) as total_billed,
         COALESCE(SUM(i.paid_amount), 0) as total_paid,
         COALESCE(SUM(i.due_amount), 0) as outstanding_balance
       FROM customers c
       LEFT JOIN invoices i ON c.id = i.customer_id
       WHERE c.id = ? AND c.user_id = ?
       GROUP BY c.id`,
      [customerId, userId]
    );

    if (!customers || customers.length === 0) {
      return res.status(404).json({ success: false, message: 'Customer not found.' });
    }

    const customer = customers[0];

    // Fetch customer invoices
    const [invoices] = await db.query(
      `SELECT id, invoice_number, invoice_date, due_date, grand_total, paid_amount, due_amount, status, created_at
       FROM invoices
       WHERE customer_id = ? AND user_id = ?
       ORDER BY invoice_date DESC`,
      [customerId, userId]
    );

    // Fetch customer payments
    const [payments] = await db.query(
      `SELECT p.id, p.invoice_id, i.invoice_number, p.payment_date, p.amount, p.payment_method, p.transaction_reference, p.notes
       FROM payments p
       JOIN invoices i ON p.invoice_id = i.id
       WHERE p.customer_id = ? AND p.user_id = ?
       ORDER BY p.payment_date DESC`,
      [customerId, userId]
    );

    return res.json({
      success: true,
      customer,
      invoices,
      payments
    });
  } catch (err) {
    next(err);
  }
};

// POST /api/customers
exports.createCustomer = async (req, res, next) => {
  try {
    const userId = req.user.id;
    const {
      name,
      company_name,
      email,
      phone,
      billing_address,
      city,
      state,
      postal_code,
      gstin,
      avatar_url,
      notes
    } = req.body;

    if (!name || name.trim() === '') {
      return res.status(400).json({ success: false, message: 'Customer full name is required.' });
    }

    const [result] = await db.query(
      `INSERT INTO customers 
       (user_id, name, company_name, email, phone, billing_address, city, state, postal_code, gstin, avatar_url, notes)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        userId,
        name.trim(),
        company_name ? company_name.trim() : '',
        email ? email.trim().toLowerCase() : '',
        phone ? phone.trim() : '',
        billing_address || '',
        city || '',
        state || '',
        postal_code || '',
        gstin ? gstin.trim().toUpperCase() : '',
        avatar_url || '',
        notes || ''
      ]
    );

    const [newCustomer] = await db.query('SELECT * FROM customers WHERE id = ?', [result.insertId]);

    return res.status(201).json({
      success: true,
      message: 'Customer added successfully.',
      customer: newCustomer[0]
    });
  } catch (err) {
    next(err);
  }
};

// PUT /api/customers/:id
exports.updateCustomer = async (req, res, next) => {
  try {
    const userId = req.user.id;
    const customerId = req.params.id;
    const {
      name,
      company_name,
      email,
      phone,
      billing_address,
      city,
      state,
      postal_code,
      gstin,
      avatar_url,
      notes
    } = req.body;

    // Verify customer ownership
    const [existing] = await db.query('SELECT id FROM customers WHERE id = ? AND user_id = ?', [customerId, userId]);
    if (!existing || existing.length === 0) {
      return res.status(404).json({ success: false, message: 'Customer not found.' });
    }

    if (!name || name.trim() === '') {
      return res.status(400).json({ success: false, message: 'Customer name is required.' });
    }

    await db.query(
      `UPDATE customers SET 
         name = ?, company_name = ?, email = ?, phone = ?, 
         billing_address = ?, city = ?, state = ?, postal_code = ?, 
         gstin = ?, avatar_url = COALESCE(?, avatar_url), notes = ?, updated_at = CURRENT_TIMESTAMP
       WHERE id = ? AND user_id = ?`,
      [
        name.trim(),
        company_name ? company_name.trim() : '',
        email ? email.trim().toLowerCase() : '',
        phone ? phone.trim() : '',
        billing_address || '',
        city || '',
        state || '',
        postal_code || '',
        gstin ? gstin.trim().toUpperCase() : '',
        avatar_url !== undefined ? avatar_url : null,
        notes || '',
        customerId,
        userId
      ]
    );

    const [updated] = await db.query('SELECT * FROM customers WHERE id = ?', [customerId]);

    return res.json({
      success: true,
      message: 'Customer updated successfully.',
      customer: updated[0]
    });
  } catch (err) {
    next(err);
  }
};

// DELETE /api/customers/:id
exports.deleteCustomer = async (req, res, next) => {
  try {
    const userId = req.user.id;
    const customerId = req.params.id;

    const [existing] = await db.query('SELECT id, name FROM customers WHERE id = ? AND user_id = ?', [customerId, userId]);
    if (!existing || existing.length === 0) {
      return res.status(404).json({ success: false, message: 'Customer not found.' });
    }

    // Check for existing invoices to prevent data integrity violation
    const [invoices] = await db.query(
      'SELECT id, invoice_number FROM invoices WHERE customer_id = ? AND user_id = ?',
      [customerId, userId]
    );

    if (invoices && invoices.length > 0) {
      return res.status(400).json({
        success: false,
        message: `Cannot delete customer "${existing[0].name}" because they have ${invoices.length} active invoice(s). Please delete or reassign those invoices first.`
      });
    }

    await db.query('DELETE FROM customers WHERE id = ? AND user_id = ?', [customerId, userId]);

    return res.json({
      success: true,
      message: 'Customer deleted successfully.'
    });
  } catch (err) {
    next(err);
  }
};

// POST /api/customers/upload-avatar
exports.uploadAvatar = async (req, res, next) => {
  try {
    if (!req.file) {
      return res.status(400).json({ success: false, message: 'No image file uploaded.' });
    }
    const avatarUrl = `/uploads/${req.file.filename}`;
    return res.json({
      success: true,
      message: 'Avatar uploaded successfully.',
      avatarUrl
    });
  } catch (err) {
    next(err);
  }
};
