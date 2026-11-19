const express = require('express');
const router = express.Router();
const settingController = require('../controllers/settingController');
const authMiddleware = require('../middleware/authMiddleware');
const upload = require('../middleware/uploadMiddleware');

router.use(authMiddleware);

router.get('/', settingController.getSettings);
router.put('/', settingController.updateSettings);
router.post('/upload-logo', upload.single('logo'), settingController.uploadLogo);
router.post('/upload-signature', upload.single('signature'), settingController.uploadSignature);
router.post('/change-password', settingController.changePassword);

module.exports = router;
