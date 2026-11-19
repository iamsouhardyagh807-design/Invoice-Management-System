const express = require('express');
const router = express.Router();
const invoiceController = require('../controllers/invoiceController');
const authMiddleware = require('../middleware/authMiddleware');

router.use(authMiddleware);

router.get('/next-number', invoiceController.getNextInvoiceNumber);
router.get('/', invoiceController.getInvoices);
router.post('/', invoiceController.createInvoice);
router.get('/:id', invoiceController.getInvoiceById);
router.put('/:id', invoiceController.updateInvoice);
router.patch('/:id/signature', invoiceController.updateInvoiceSignature);
router.delete('/:id', invoiceController.deleteInvoice);
router.get('/:id/pdf', invoiceController.downloadPdf);

module.exports = router;
