const dayjs = require('dayjs');
const db = require('../config/db');
const { round2 } = require('../services/invoiceService');

// GET /api/reports/monthly-revenue
exports.getMonthlyRevenueReport = async (req, res, next) => {
  try {
    const userId = req.user.id;
    const year = parseInt(req.query.year || dayjs().year(), 10);

    const [invoices] = await db.query(
      `SELECT invoice_date, grand_total, paid_amount, due_amount, status
       FROM invoices
       WHERE user_id = ? AND invoice_date LIKE ?`,
      [userId, `${year}-%`]
    );

    const [payments] = await db.query(
      `SELECT payment_date, amount
       FROM payments
       WHERE user_id = ? AND payment_date LIKE ?`,
      [userId, `${year}-%`]
    );

    const monthNames = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
    const monthlyReport = monthNames.map((name, idx) => ({
      month: name,
      monthIndex: idx + 1,
      year,
      total_invoices: 0,
      total_billed: 0,
      total_collected: 0,
      total_due: 0
    }));

    invoices.forEach(inv => {
      const m = dayjs(inv.invoice_date).month();
      if (m >= 0 && m < 12) {
        monthlyReport[m].total_invoices += 1;
        monthlyReport[m].total_billed = round2(monthlyReport[m].total_billed + Number(inv.grand_total));
        monthlyReport[m].total_due = round2(monthlyReport[m].total_due + Number(inv.due_amount));
      }
    });

    payments.forEach(p => {
      const m = dayjs(p.payment_date).month();
      if (m >= 0 && m < 12) {
        monthlyReport[m].total_collected = round2(monthlyReport[m].total_collected + Number(p.amount));
      }
    });

    const totalAnnualRevenue = monthlyReport.reduce((acc, curr) => round2(acc + curr.total_collected), 0);
    const totalAnnualBilled = monthlyReport.reduce((acc, curr) => round2(acc + curr.total_billed), 0);

    return res.json({
      success: true,
      year,
      summary: {
        totalAnnualRevenue,
        totalAnnualBilled
      },
      monthlyReport
    });
  } catch (err) {
    next(err);
  }
};

// GET /api/reports/yearly-revenue
exports.getYearlyRevenueReport = async (req, res, next) => {
  try {
    const userId = req.user.id;

    // Fetch all payments
    const [payments] = await db.query(
      'SELECT payment_date, amount FROM payments WHERE user_id = ? ORDER BY payment_date ASC',
      [userId]
    );

    // Fetch all invoices
    const [invoices] = await db.query(
      'SELECT invoice_date, grand_total, due_amount FROM invoices WHERE user_id = ? ORDER BY invoice_date ASC',
      [userId]
    );

    const yearMap = {};

    invoices.forEach(inv => {
      const y = dayjs(inv.invoice_date).year();
      if (!yearMap[y]) {
        yearMap[y] = { year: y, total_invoices: 0, total_billed: 0, total_collected: 0, total_due: 0 };
      }
      yearMap[y].total_invoices += 1;
      yearMap[y].total_billed = round2(yearMap[y].total_billed + Number(inv.grand_total));
      yearMap[y].total_due = round2(yearMap[y].total_due + Number(inv.due_amount));
    });

    payments.forEach(p => {
      const y = dayjs(p.payment_date).year();
      if (!yearMap[y]) {
        yearMap[y] = { year: y, total_invoices: 0, total_billed: 0, total_collected: 0, total_due: 0 };
      }
      yearMap[y].total_collected = round2(yearMap[y].total_collected + Number(p.amount));
    });

    const yearlyReport = Object.values(yearMap).sort((a, b) => b.year - a.year);

    return res.json({
      success: true,
      yearlyReport
    });
  } catch (err) {
    next(err);
  }
};

// GET /api/reports/invoice-status
exports.getInvoiceStatusReport = async (req, res, next) => {
  try {
    const userId = req.user.id;
    const { startDate, endDate } = req.query;

    let sql = `
      SELECT 
        status,
        COUNT(*) as count,
        COALESCE(SUM(grand_total), 0) as total_amount,
        COALESCE(SUM(paid_amount), 0) as paid_amount,
        COALESCE(SUM(due_amount), 0) as due_amount
      FROM invoices
      WHERE user_id = ?
    `;

    const params = [userId];

    if (startDate) {
      sql += ' AND invoice_date >= ?';
      params.push(startDate);
    }
    if (endDate) {
      sql += ' AND invoice_date <= ?';
      params.push(endDate);
    }

    sql += ' GROUP BY status';

    const [rows] = await db.query(sql, params);

    return res.json({
      success: true,
      statusBreakdown: rows.map(r => ({
        status: r.status,
        count: Number(r.count),
        total_amount: round2(Number(r.total_amount)),
        paid_amount: round2(Number(r.paid_amount)),
        due_amount: round2(Number(r.due_amount))
      }))
    });
  } catch (err) {
    next(err);
  }
};

// GET /api/reports/customer-wise
exports.getCustomerWiseReport = async (req, res, next) => {
  try {
    const userId = req.user.id;
    const { search } = req.query;

    let sql = `
      SELECT 
        c.id as customer_id,
        c.name as customer_name,
        c.company_name,
        c.email,
        c.phone,
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
      sql += ' AND (c.name LIKE ? OR c.company_name LIKE ? OR c.email LIKE ?)';
      const s = `%${search.trim()}%`;
      params.push(s, s, s);
    }

    sql += ' GROUP BY c.id ORDER BY total_billed DESC';

    const [rows] = await db.query(sql, params);

    return res.json({
      success: true,
      customerReport: rows.map(r => ({
        customer_id: r.customer_id,
        customer_name: r.customer_name,
        company_name: r.company_name,
        email: r.email,
        phone: r.phone,
        total_invoices: Number(r.total_invoices),
        total_billed: round2(Number(r.total_billed)),
        total_paid: round2(Number(r.total_paid)),
        outstanding_balance: round2(Number(r.outstanding_balance))
      }))
    });
  } catch (err) {
    next(err);
  }
};
