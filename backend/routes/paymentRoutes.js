const express = require('express');
const router = express.Router();
const { body } = require('express-validator');
const paymentController = require('../controllers/paymentController');
const authMiddleware = require('../middleware/authMiddleware');
const validatorMiddleware = require('../middleware/validatorMiddleware');

router.use(authMiddleware);

const paymentValidation = [
  body('invoice_id').notEmpty().withMessage('Invoice selection is required.'),
  body('amount').isFloat({ min: 0.01 }).withMessage('Payment amount must be greater than zero.'),
  body('payment_date').notEmpty().withMessage('Payment date is required.'),
  validatorMiddleware
];

router.get('/', paymentController.getPayments);
router.post('/', paymentValidation, paymentController.recordPayment);
router.get('/:id', paymentController.getPaymentById);

module.exports = router;
