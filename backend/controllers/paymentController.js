const db = require('../config/db');
const { round2, determineInvoiceStatus } = require('../services/invoiceService');

// GET /api/payments
exports.getPayments = async (req, res, next) => {
  try {
    const userId = req.user.id;
    const { search, payment_method, customer_id, startDate, endDate, invoice_id, sortBy = 'payment_date', sortOrder = 'DESC' } = req.query;

    let sql = `
      SELECT 
        p.*,
        i.invoice_number,
        i.grand_total as invoice_total,
        i.due_amount as current_invoice_due,
        c.name as customer_name,
        c.company_name as customer_company
      FROM payments p
      JOIN invoices i ON p.invoice_id = i.id
      JOIN customers c ON p.customer_id = c.id
      WHERE p.user_id = ?
    `;

    const params = [userId];

    if (search && search.trim() !== '') {
      sql += ' AND (i.invoice_number LIKE ? OR c.name LIKE ? OR c.company_name LIKE ? OR p.transaction_reference LIKE ?)';
      const s = `%${search.trim()}%`;
      params.push(s, s, s, s);
    }

    if (payment_method && payment_method.trim() !== '') {
      sql += ' AND p.payment_method = ?';
      params.push(payment_method.trim());
    }

    if (customer_id) {
      sql += ' AND p.customer_id = ?';
      params.push(customer_id);
    }

    if (invoice_id) {
      sql += ' AND p.invoice_id = ?';
      params.push(invoice_id);
    }

    if (startDate) {
      sql += ' AND p.payment_date >= ?';
      params.push(startDate);
    }

    if (endDate) {
      sql += ' AND p.payment_date <= ?';
      params.push(endDate);
    }

    const validSorts = ['payment_date', 'amount', 'created_at'];
    const sortField = validSorts.includes(sortBy) ? `p.${sortBy}` : 'p.payment_date';
    const order = sortOrder.toUpperCase() === 'ASC' ? 'ASC' : 'DESC';

    sql += ` ORDER BY ${sortField} ${order}, p.id DESC`;

    const [payments] = await db.query(sql, params);

    return res.json({
      success: true,
      count: payments.length,
      payments
    });
  } catch (err) {
    next(err);
  }
};

// GET /api/payments/:id
exports.getPaymentById = async (req, res, next) => {
  try {
    const userId = req.user.id;
    const paymentId = req.params.id;

    const [payments] = await db.query(
      `SELECT 
         p.*,
         i.invoice_number,
         i.invoice_date,
         i.due_date,
         i.grand_total as invoice_total,
         i.paid_amount as total_invoice_paid,
         i.due_amount as current_invoice_due,
         c.name as customer_name,
         c.company_name as customer_company,
         c.email as customer_email,
         c.phone as customer_phone
       FROM payments p
       JOIN invoices i ON p.invoice_id = i.id
       JOIN customers c ON p.customer_id = c.id
       WHERE p.id = ? AND p.user_id = ?`,
      [paymentId, userId]
    );

    if (!payments || payments.length === 0) {
      return res.status(404).json({ success: false, message: 'Payment record not found.' });
    }

    return res.json({
      success: true,
      payment: payments[0]
    });
  } catch (err) {
    next(err);
  }
};

// POST /api/payments
exports.recordPayment = async (req, res, next) => {
  const conn = await db.getConnection();
  try {
    const userId = req.user.id;
    const {
      invoice_id,
      payment_date,
      amount,
      payment_method = 'UPI',
      transaction_reference,
      notes
    } = req.body;

    if (!invoice_id) {
      return res.status(400).json({ success: false, message: 'Invoice ID is required.' });
    }

    const paymentAmount = round2(amount);
    if (isNaN(paymentAmount) || paymentAmount <= 0) {
      return res.status(400).json({ success: false, message: 'Payment amount must be greater than zero.' });
    }

    if (!payment_date) {
      return res.status(400).json({ success: false, message: 'Payment date is required.' });
    }

    // Fetch invoice with lock / ownership check
    const [invoices] = await conn.query(
      'SELECT id, customer_id, invoice_number, grand_total, paid_amount, due_amount, status, due_date FROM invoices WHERE id = ? AND user_id = ?',
      [invoice_id, userId]
    );

    if (!invoices || invoices.length === 0) {
      return res.status(404).json({ success: false, message: 'Invoice not found.' });
    }

    const inv = invoices[0];
    const currentDue = round2(inv.due_amount);

    // Business Logic: Never allow payments exceeding remaining balance
    if (paymentAmount > currentDue + 0.01) {
      return res.status(400).json({
        success: false,
        message: `Payment amount (₹${paymentAmount.toLocaleString('en-IN')}) cannot exceed the invoice's remaining balance due of ₹${currentDue.toLocaleString('en-IN')}.`
      });
    }

    await conn.beginTransaction();

    // 1. Insert Payment Record
    const [payResult] = await conn.query(
      `INSERT INTO payments 
       (user_id, invoice_id, customer_id, payment_date, amount, payment_method, transaction_reference, notes)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        userId,
        inv.id,
        inv.customer_id,
        payment_date,
        paymentAmount,
        payment_method,
        transaction_reference || '',
        notes || ''
      ]
    );

    // 2. Compute new totals
    const newPaidAmount = round2(Number(inv.paid_amount) + paymentAmount);
    const newDueAmount = Math.max(0, round2(Number(inv.grand_total) - newPaidAmount));
    const newStatus = determineInvoiceStatus(inv.status, inv.due_date, inv.grand_total, newPaidAmount);

    // 3. Update Invoice
    await conn.query(
      `UPDATE invoices SET 
         paid_amount = ?, due_amount = ?, status = ?, updated_at = CURRENT_TIMESTAMP
       WHERE id = ? AND user_id = ?`,
      [newPaidAmount, newDueAmount, newStatus, inv.id, userId]
    );

    await conn.commit();

    return res.status(201).json({
      success: true,
      message: `Payment of ₹${paymentAmount.toLocaleString('en-IN')} recorded successfully for invoice ${inv.invoice_number}.`,
      paymentId: payResult.insertId,
      invoice: {
        id: inv.id,
        invoice_number: inv.invoice_number,
        paid_amount: newPaidAmount,
        due_amount: newDueAmount,
        status: newStatus
      }
    });
  } catch (err) {
    await conn.rollback();
    next(err);
  } finally {
    conn.release();
  }
};
