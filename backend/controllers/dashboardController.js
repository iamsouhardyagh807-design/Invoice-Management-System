const dayjs = require('dayjs');
const db = require('../config/db');
const { round2 } = require('../services/invoiceService');

// GET /api/dashboard/summary
exports.getSummary = async (req, res, next) => {
  try {
    const userId = req.user.id;

    // 1. Invoices Count and Totals
    const [invoiceStats] = await db.query(
      `SELECT 
         COUNT(*) as total_invoices,
         COUNT(CASE WHEN status = 'paid' THEN 1 END) as paid_invoices,
         COUNT(CASE WHEN status = 'pending' THEN 1 END) as pending_invoices,
         COUNT(CASE WHEN status = 'partially_paid' THEN 1 END) as partially_paid_invoices,
         COUNT(CASE WHEN status = 'overdue' THEN 1 END) as overdue_invoices,
         COUNT(CASE WHEN status = 'draft' THEN 1 END) as draft_invoices,
         COALESCE(SUM(grand_total), 0) as total_billed,
         COALESCE(SUM(paid_amount), 0) as total_collected,
         COALESCE(SUM(due_amount), 0) as total_outstanding
       FROM invoices
       WHERE user_id = ?`,
      [userId]
    );

    // 2. Total Payments (True revenue received)
    const [revenueStats] = await db.query(
      `SELECT COALESCE(SUM(amount), 0) as total_revenue
       FROM payments
       WHERE user_id = ?`,
      [userId]
    );

    // 3. Customer count
    const [customerStats] = await db.query(
      'SELECT COUNT(*) as total_customers FROM customers WHERE user_id = ?',
      [userId]
    );

    const stats = invoiceStats[0] || {};
    const totalRevenue = round2(revenueStats[0] ? revenueStats[0].total_revenue : 0);

    return res.json({
      success: true,
      summary: {
        total_invoices: Number(stats.total_invoices || 0),
        paid_invoices: Number(stats.paid_invoices || 0),
        pending_invoices: Number(stats.pending_invoices || 0),
        partially_paid_invoices: Number(stats.partially_paid_invoices || 0),
        overdue_invoices: Number(stats.overdue_invoices || 0),
        draft_invoices: Number(stats.draft_invoices || 0),
        total_customers: Number(customerStats[0] ? customerStats[0].total_customers : 0),
        total_revenue: totalRevenue,
        outstanding_amount: round2(stats.total_outstanding || 0),
        total_billed: round2(stats.total_billed || 0)
      }
    });
  } catch (err) {
    next(err);
  }
};

// GET /api/dashboard/recent-invoices
exports.getRecentInvoices = async (req, res, next) => {
  try {
    const userId = req.user.id;
    const limit = parseInt(req.query.limit || '6', 10);

    const [invoices] = await db.query(
      `SELECT 
         i.id,
         i.invoice_number,
         i.invoice_date,
         i.due_date,
         i.grand_total,
         i.paid_amount,
         i.due_amount,
         i.status,
         c.name as customer_name,
         c.company_name as customer_company
       FROM invoices i
       JOIN customers c ON i.customer_id = c.id
       WHERE i.user_id = ?
       ORDER BY i.invoice_date DESC, i.id DESC
       LIMIT ?`,
      [userId, limit]
    );

    return res.json({
      success: true,
      recentInvoices: invoices
    });
  } catch (err) {
    next(err);
  }
};

// GET /api/dashboard/revenue-chart
exports.getRevenueChart = async (req, res, next) => {
  try {
    const userId = req.user.id;
    const targetYear = parseInt(req.query.year || dayjs().year(), 10);

    // Fetch payments for this year
    const [payments] = await db.query(
      `SELECT payment_date, amount
       FROM payments
       WHERE user_id = ? AND payment_date LIKE ?`,
      [userId, `${targetYear}-%`]
    );

    // Fetch invoices billed for this year
    const [invoices] = await db.query(
      `SELECT invoice_date, grand_total, status
       FROM invoices
       WHERE user_id = ? AND invoice_date LIKE ?`,
      [userId, `${targetYear}-%`]
    );

    const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    const monthlyData = monthNames.map((name, idx) => ({
      month: name,
      monthNum: idx + 1,
      revenue: 0,
      billed: 0,
      invoicesCount: 0
    }));

    // Aggregate payments by month
    payments.forEach(p => {
      const month = dayjs(p.payment_date).month(); // 0 to 11
      if (month >= 0 && month < 12) {
        monthlyData[month].revenue = round2(monthlyData[month].revenue + Number(p.amount));
      }
    });

    // Aggregate billed invoices by month
    invoices.forEach(inv => {
      const month = dayjs(inv.invoice_date).month();
      if (month >= 0 && month < 12) {
        monthlyData[month].billed = round2(monthlyData[month].billed + Number(inv.grand_total));
        monthlyData[month].invoicesCount += 1;
      }
    });

    return res.json({
      success: true,
      year: targetYear,
      monthlyData
    });
  } catch (err) {
    next(err);
  }
};

// GET /api/dashboard/status-chart
exports.getStatusChart = async (req, res, next) => {
  try {
    const userId = req.user.id;

    const [rows] = await db.query(
      `SELECT status, COUNT(*) as count, COALESCE(SUM(grand_total), 0) as total_value
       FROM invoices
       WHERE user_id = ?
       GROUP BY status`,
      [userId]
    );

    const statuses = ['paid', 'pending', 'partially_paid', 'overdue', 'draft'];
    const statusMap = {
      paid: { name: 'Paid', color: '#16A34A', count: 0, total_value: 0 },
      pending: { name: 'Pending', color: '#2563EB', count: 0, total_value: 0 },
      partially_paid: { name: 'Partially Paid', color: '#D97706', count: 0, total_value: 0 },
      overdue: { name: 'Overdue', color: '#DC2626', count: 0, total_value: 0 },
      draft: { name: 'Draft', color: '#64748B', count: 0, total_value: 0 }
    };

    rows.forEach(r => {
      if (statusMap[r.status]) {
        statusMap[r.status].count = Number(r.count);
        statusMap[r.status].total_value = round2(Number(r.total_value));
      }
    });

    const statusChartData = statuses.map(s => statusMap[s]);

    return res.json({
      success: true,
      statusChartData
    });
  } catch (err) {
    next(err);
  }
};
