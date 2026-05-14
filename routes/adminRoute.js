const express = require('express');
const router = express.Router();
const adminController = require('../controllers/adminController');
const verificationController = require('../controllers/verificationController');
const upload = require('../middleware/upload');
const { protect, isAdmin } = require('../services/authService');

router.get('/board', isAdmin, adminController.getAdminStats);
router.post('/process-payment', protect, isAdmin, upload.single('document'), verificationController.processVerificationAndPayment);
router.get('/flagged-cases', isAdmin, adminController.getFlaggedCases);

module.exports = router;
