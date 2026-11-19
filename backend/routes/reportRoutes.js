const express = require('express');
const router = express.Router();
const reportController = require('../controllers/reportController');
const authMiddleware = require('../middleware/authMiddleware');

router.use(authMiddleware);

router.get('/monthly-revenue', reportController.getMonthlyRevenueReport);
router.get('/yearly-revenue', reportController.getYearlyRevenueReport);
router.get('/invoice-status', reportController.getInvoiceStatusReport);
router.get('/customer-wise', reportController.getCustomerWiseReport);

module.exports = router;
