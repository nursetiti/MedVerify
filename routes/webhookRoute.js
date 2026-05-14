const express = require('express');
const router = express.Router();
const webhookController = require('../controllers/webhookController');
const upload = require('../middleware/upload');
const { protect } = require('../services/authService');

router.post('/squad', protect, upload.single('document'), webhookController.handleWebhook);

module.exports = router;