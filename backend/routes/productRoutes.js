const express = require('express');
const router = express.Router();
const { body } = require('express-validator');
const productController = require('../controllers/productController');
const authMiddleware = require('../middleware/authMiddleware');
const validatorMiddleware = require('../middleware/validatorMiddleware');
const upload = require('../middleware/uploadMiddleware');

router.use(authMiddleware);

const productValidation = [
  body('name').trim().notEmpty().withMessage('Product/Service name is required.'),
  validatorMiddleware
];

router.post('/upload-image', upload.single('image'), productController.uploadImage);
router.get('/', productController.getProducts);
router.post('/', productValidation, productController.createProduct);
router.get('/:id', productController.getProductById);
router.put('/:id', productValidation, productController.updateProduct);
router.delete('/:id', productController.deleteProduct);

module.exports = router;
