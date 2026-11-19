const express = require('express');
const router = express.Router();
const { body } = require('express-validator');
const customerController = require('../controllers/customerController');
const authMiddleware = require('../middleware/authMiddleware');
const validatorMiddleware = require('../middleware/validatorMiddleware');
const upload = require('../middleware/uploadMiddleware');

router.use(authMiddleware);

const customerValidation = [
  body('name').trim().notEmpty().withMessage('Customer name is required.'),
  validatorMiddleware
];

router.post('/upload-avatar', upload.single('avatar'), customerController.uploadAvatar);
router.get('/', customerController.getCustomers);
router.post('/', customerValidation, customerController.createCustomer);
router.get('/:id', customerController.getCustomerById);
router.put('/:id', customerValidation, customerController.updateCustomer);
router.delete('/:id', customerController.deleteCustomer);

module.exports = router;
