const db = require('../config/db');
const {
  round2,
  calculateInvoiceTotals,
  determineInvoiceStatus,
  generateNextInvoiceNumber
} = require('../services/invoiceService');
const { generateInvoicePDF } = require('../services/pdfService');

// GET /api/invoices
exports.getInvoices = async (req, res, next) => {
  try {
    const userId = req.user.id;
    const { search, status, customer_id, startDate, endDate, sortBy = 'invoice_date', sortOrder = 'DESC' } = req.query;

    let sql = `
      SELECT 
        i.*,
        c.name as customer_name,
        c.company_name as customer_company,
        c.email as customer_email,
        c.phone as customer_phone,
        c.avatar_url as customer_avatar_url
      FROM invoices i
      JOIN customers c ON i.customer_id = c.id
      WHERE i.user_id = ?
    `;

    const params = [userId];

    if (search && search.trim() !== '') {
      sql += ' AND (i.invoice_number LIKE ? OR c.name LIKE ? OR c.company_name LIKE ?)';
      const s = `%${search.trim()}%`;
      params.push(s, s, s);
    }

    if (status && status.trim() !== '') {
      sql += ' AND i.status = ?';
      params.push(status.trim().toLowerCase());
    }

    if (customer_id) {
      sql += ' AND i.customer_id = ?';
      params.push(customer_id);
    }

    if (startDate) {
      sql += ' AND i.invoice_date >= ?';
      params.push(startDate);
    }

    if (endDate) {
      sql += ' AND i.invoice_date <= ?';
      params.push(endDate);
    }

    // Sort order
    const validSortFields = ['invoice_number', 'invoice_date', 'due_date', 'grand_total', 'paid_amount', 'due_amount', 'status'];
    const sortField = validSortFields.includes(sortBy) ? `i.${sortBy}` : 'i.invoice_date';
    const order = sortOrder.toUpperCase() === 'ASC' ? 'ASC' : 'DESC';

    sql += ` ORDER BY ${sortField} ${order}, i.id DESC`;

    const [invoices] = await db.query(sql, params);

    return res.json({
      success: true,
      count: invoices.length,
      invoices
    });
  } catch (err) {
    next(err);
  }
};

// GET /api/invoices/next-number
exports.getNextInvoiceNumber = async (req, res, next) => {
  try {
    const userId = req.user.id;
    const { invoiceNumber } = await generateNextInvoiceNumber(userId);
    return res.json({
      success: true,
      invoiceNumber
    });
  } catch (err) {
    next(err);
  }
};

// GET /api/invoices/:id
exports.getInvoiceById = async (req, res, next) => {
  try {
    const userId = req.user.id;
    const invoiceId = req.params.id;

    // Fetch invoice with customer info
    const [invoices] = await db.query(
      `SELECT 
         i.*,
         c.name as customer_name,
         c.company_name as customer_company,
         c.email as customer_email,
         c.phone as customer_phone,
         c.billing_address as customer_address,
         c.city as customer_city,
         c.state as customer_state,
         c.postal_code as customer_postal_code,
         c.gstin as customer_gstin,
         c.avatar_url as customer_avatar_url
       FROM invoices i
       JOIN customers c ON i.customer_id = c.id
       WHERE i.id = ? AND i.user_id = ?`,
      [invoiceId, userId]
    );

    if (!invoices || invoices.length === 0) {
      return res.status(404).json({ success: false, message: 'Invoice not found.' });
    }

    const invoice = invoices[0];

    // Fetch line items
    const [items] = await db.query(
      `SELECT 
         ii.*,
         p.category as product_category,
         p.product_type,
         p.image_url as product_image_url
       FROM invoice_items ii
       LEFT JOIN products p ON ii.product_id = p.id
       WHERE ii.invoice_id = ?
       ORDER BY ii.id ASC`,
      [invoiceId]
    );

    // Fetch payment history for this invoice
    const [payments] = await db.query(
      `SELECT * FROM payments WHERE invoice_id = ? AND user_id = ? ORDER BY payment_date DESC, id DESC`,
      [invoiceId, userId]
    );

    // Fetch business settings
    const [settings] = await db.query(
      'SELECT * FROM business_settings WHERE user_id = ?',
      [userId]
    );

    return res.json({
      success: true,
      invoice,
      items,
      payments,
      settings: settings[0] || {}
    });
  } catch (err) {
    next(err);
  }
};

// POST /api/invoices
exports.createInvoice = async (req, res, next) => {
  const conn = await db.getConnection();
  try {
    const userId = req.user.id;
    const {
      customer_id,
      invoice_number,
      invoice_date,
      due_date,
      payment_terms,
      tax_type = 'cgst_sgst',
      items,
      notes,
      terms,
      signature_text,
      signature_title,
      signature_image_url,
      signature_font,
      status = 'pending'
    } = req.body;

    if (!customer_id) {
      return res.status(400).json({ success: false, message: 'Customer selection is required.' });
    }

    if (!items || !Array.isArray(items) || items.length === 0) {
      return res.status(400).json({ success: false, message: 'At least one line item is required.' });
    }

    // Verify customer belongs to user
    const [customers] = await conn.query('SELECT id FROM customers WHERE id = ? AND user_id = ?', [customer_id, userId]);
    if (!customers || customers.length === 0) {
      return res.status(400).json({ success: false, message: 'Invalid customer selected.' });
    }

    // Handle invoice number
    let finalInvNumber = invoice_number ? invoice_number.trim() : '';
    if (!finalInvNumber) {
      const generated = await generateNextInvoiceNumber(userId);
      finalInvNumber = generated.invoiceNumber;
    }

    // Check unique invoice number for this user
    const [existing] = await conn.query(
      'SELECT id FROM invoices WHERE user_id = ? AND invoice_number = ?',
      [userId, finalInvNumber]
    );
    if (existing && existing.length > 0) {
      return res.status(400).json({
        success: false,
        message: `Invoice number "${finalInvNumber}" already exists. Please choose another.`
      });
    }

    // Calculate totals
    const calculation = calculateInvoiceTotals(items, tax_type);
    const paidAmount = 0.00;
    const dueAmount = calculation.grand_total;
    const computedStatus = determineInvoiceStatus(status, due_date, calculation.grand_total, paidAmount);

    await conn.beginTransaction();

    // Insert invoice header
    const [invResult] = await conn.query(
      `INSERT INTO invoices 
       (user_id, customer_id, invoice_number, invoice_date, due_date, payment_terms, tax_type, subtotal, discount_total, tax_total, cgst_amount, sgst_amount, igst_amount, grand_total, paid_amount, due_amount, status, notes, terms, signature_text, signature_title, signature_image_url, signature_font)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        userId,
        customer_id,
        finalInvNumber,
        invoice_date,
        due_date,
        payment_terms || 'Due within 15 days',
        tax_type,
        calculation.subtotal,
        calculation.discount_total,
        calculation.tax_total,
        calculation.cgst_amount,
        calculation.sgst_amount,
        calculation.igst_amount,
        calculation.grand_total,
        paidAmount,
        dueAmount,
        computedStatus,
        notes || '',
        terms || '',
        signature_text || null,
        signature_title || null,
        signature_image_url || null,
        signature_font || null
      ]
    );

    const invoiceId = invResult.insertId;

    // Insert items
    for (const item of calculation.processedItems) {
      await conn.query(
        `INSERT INTO invoice_items 
         (invoice_id, product_id, item_name, description, quantity, unit_price, discount_percent, tax_percent, line_total)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          invoiceId,
          item.product_id || null,
          item.item_name || 'Item',
          item.description || '',
          item.quantity,
          item.unit_price,
          item.discount_percent,
          item.tax_percent,
          item.line_total
        ]
      );
    }

    // Update next_invoice_number in business_settings
    await conn.query(
      'UPDATE business_settings SET next_invoice_number = next_invoice_number + 1 WHERE user_id = ?',
      [userId]
    );

    await conn.commit();

    return res.status(201).json({
      success: true,
      message: 'Invoice created successfully.',
      invoiceId,
      invoiceNumber: finalInvNumber
    });
  } catch (err) {
    await conn.rollback();
    next(err);
  } finally {
    conn.release();
  }
};

// PUT /api/invoices/:id
exports.updateInvoice = async (req, res, next) => {
  const conn = await db.getConnection();
  try {
    const userId = req.user.id;
    const invoiceId = req.params.id;
    const {
      customer_id,
      invoice_date,
      due_date,
      payment_terms,
      tax_type = 'cgst_sgst',
      items,
      notes,
      terms,
      signature_text,
      signature_title,
      signature_image_url,
      signature_font,
      status
    } = req.body;

    // Check invoice existence
    const [existing] = await conn.query(
      'SELECT * FROM invoices WHERE id = ? AND user_id = ?',
      [invoiceId, userId]
    );

    if (!existing || existing.length === 0) {
      return res.status(404).json({ success: false, message: 'Invoice not found.' });
    }

    const currentInvoice = existing[0];

    if (!items || !Array.isArray(items) || items.length === 0) {
      return res.status(400).json({ success: false, message: 'At least one line item is required.' });
    }

    const calculation = calculateInvoiceTotals(items, tax_type);
    const paidAmount = Number(currentInvoice.paid_amount) || 0;
    const dueAmount = round2(calculation.grand_total - paidAmount);
    const targetStatus = status || currentInvoice.status;
    const computedStatus = determineInvoiceStatus(targetStatus, due_date || currentInvoice.due_date, calculation.grand_total, paidAmount);

    await conn.beginTransaction();

    // Update invoice header
    await conn.query(
      `UPDATE invoices SET
         customer_id = ?, invoice_date = ?, due_date = ?, payment_terms = ?,
         tax_type = ?, subtotal = ?, discount_total = ?, tax_total = ?,
         cgst_amount = ?, sgst_amount = ?, igst_amount = ?, grand_total = ?,
         due_amount = ?, status = ?, notes = ?, terms = ?,
         signature_text = COALESCE(?, signature_text),
         signature_title = COALESCE(?, signature_title),
         signature_image_url = COALESCE(?, signature_image_url),
         signature_font = COALESCE(?, signature_font),
         updated_at = CURRENT_TIMESTAMP
       WHERE id = ? AND user_id = ?`,
      [
        customer_id || currentInvoice.customer_id,
        invoice_date || currentInvoice.invoice_date,
        due_date || currentInvoice.due_date,
        payment_terms || currentInvoice.payment_terms,
        tax_type,
        calculation.subtotal,
        calculation.discount_total,
        calculation.tax_total,
        calculation.cgst_amount,
        calculation.sgst_amount,
        calculation.igst_amount,
        calculation.grand_total,
        dueAmount,
        computedStatus,
        notes !== undefined ? notes : currentInvoice.notes,
        terms !== undefined ? terms : currentInvoice.terms,
        signature_text !== undefined ? signature_text : currentInvoice.signature_text,
        signature_title !== undefined ? signature_title : currentInvoice.signature_title,
        signature_image_url !== undefined ? signature_image_url : currentInvoice.signature_image_url,
        signature_font !== undefined ? signature_font : currentInvoice.signature_font,
        invoiceId,
        userId
      ]
    );

    // Delete previous items and insert updated items
    await conn.query('DELETE FROM invoice_items WHERE invoice_id = ?', [invoiceId]);

    for (const item of calculation.processedItems) {
      await conn.query(
        `INSERT INTO invoice_items 
         (invoice_id, product_id, item_name, description, quantity, unit_price, discount_percent, tax_percent, line_total)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          invoiceId,
          item.product_id || null,
          item.item_name || 'Item',
          item.description || '',
          item.quantity,
          item.unit_price,
          item.discount_percent,
          item.tax_percent,
          item.line_total
        ]
      );
    }

    await conn.commit();

    return res.json({
      success: true,
      message: 'Invoice updated successfully.'
    });
  } catch (err) {
    await conn.rollback();
    next(err);
  } finally {
    conn.release();
  }
};

// DELETE /api/invoices/:id
exports.deleteInvoice = async (req, res, next) => {
  try {
    const userId = req.user.id;
    const invoiceId = req.params.id;

    const [existing] = await db.query(
      'SELECT id, invoice_number, paid_amount FROM invoices WHERE id = ? AND user_id = ?',
      [invoiceId, userId]
    );

    if (!existing || existing.length === 0) {
      return res.status(404).json({ success: false, message: 'Invoice not found.' });
    }

    if (Number(existing[0].paid_amount) > 0) {
      return res.status(400).json({
        success: false,
        message: `Cannot delete invoice ${existing[0].invoice_number} because it has existing payments recorded. Delete payments first if necessary.`
      });
    }

    await db.query('DELETE FROM invoices WHERE id = ? AND user_id = ?', [invoiceId, userId]);

    return res.json({
      success: true,
      message: `Invoice ${existing[0].invoice_number} deleted successfully.`
    });
  } catch (err) {
    next(err);
  }
};

// PATCH /api/invoices/:id/signature
exports.updateInvoiceSignature = async (req, res, next) => {
  try {
    const userId = req.user.id;
    const invoiceId = req.params.id;
    const {
      signature_text,
      signature_title,
      signature_image_url,
      signature_font,
      save_as_default
    } = req.body;

    const [existing] = await db.query(
      'SELECT id FROM invoices WHERE id = ? AND user_id = ?',
      [invoiceId, userId]
    );

    if (!existing || existing.length === 0) {
      return res.status(404).json({ success: false, message: 'Invoice not found.' });
    }

    await db.query(
      `UPDATE invoices SET
         signature_text = ?,
         signature_title = ?,
         signature_image_url = ?,
         signature_font = ?,
         updated_at = CURRENT_TIMESTAMP
       WHERE id = ? AND user_id = ?`,
      [
        signature_text !== undefined ? signature_text : null,
        signature_title !== undefined ? signature_title : null,
        signature_image_url !== undefined ? signature_image_url : null,
        signature_font !== undefined ? signature_font : null,
        invoiceId,
        userId
      ]
    );

    if (save_as_default) {
      await db.query(
        `UPDATE business_settings SET
           signature_text = COALESCE(?, signature_text),
           signature_title = COALESCE(?, signature_title),
           signature_image_url = COALESCE(?, signature_image_url),
           signature_font = COALESCE(?, signature_font),
           updated_at = CURRENT_TIMESTAMP
         WHERE user_id = ?`,
        [
          signature_text || null,
          signature_title || null,
          signature_image_url || null,
          signature_font || null,
          userId
        ]
      );
    }

    return res.json({
      success: true,
      message: 'Invoice signature updated successfully.',
      signature: {
        signature_text,
        signature_title,
        signature_image_url,
        signature_font
      }
    });
  } catch (err) {
    next(err);
  }
};

// GET /api/invoices/:id/pdf
exports.downloadPdf = async (req, res, next) => {
  try {
    const userId = req.user.id;
    const invoiceId = req.params.id;

    // Get invoice with customer
    const [invoices] = await db.query(
      `SELECT i.*, 
              c.name, c.company_name, c.email, c.phone, c.billing_address, c.city, c.state, c.postal_code, c.gstin, c.avatar_url
       FROM invoices i
       JOIN customers c ON i.customer_id = c.id
       WHERE i.id = ? AND i.user_id = ?`,
      [invoiceId, userId]
    );

    if (!invoices || invoices.length === 0) {
      return res.status(404).json({ success: false, message: 'Invoice not found.' });
    }

    const inv = invoices[0];

    const customer = {
      name: inv.name,
      company_name: inv.company_name,
      email: inv.email,
      phone: inv.phone,
      billing_address: inv.billing_address,
      city: inv.city,
      state: inv.state,
      postal_code: inv.postal_code,
      gstin: inv.gstin,
      avatar_url: inv.avatar_url
    };

    // Get items with product images
    const [items] = await db.query(
      `SELECT ii.*, p.image_url as product_image_url 
       FROM invoice_items ii 
       LEFT JOIN products p ON ii.product_id = p.id 
       WHERE ii.invoice_id = ? 
       ORDER BY ii.id ASC`,
      [invoiceId]
    );

    // Get business settings
    const [settingsRows] = await db.query(
      'SELECT * FROM business_settings WHERE user_id = ?',
      [userId]
    );
    const settings = settingsRows[0] || {};

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="Invoice-${inv.invoice_number}.pdf"`);

    generateInvoicePDF({ invoice: inv, items, customer, settings }, res);
  } catch (err) {
    next(err);
  }
};
