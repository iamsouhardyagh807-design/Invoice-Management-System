const express = require('express');
const router = express.Router();
const dashboardController = require('../controllers/dashboardController');
const authMiddleware = require('../middleware/authMiddleware');

router.use(authMiddleware);

router.get('/summary', dashboardController.getSummary);
router.get('/recent-invoices', dashboardController.getRecentInvoices);
router.get('/revenue-chart', dashboardController.getRevenueChart);
router.get('/status-chart', dashboardController.getStatusChart);

module.exports = router;
