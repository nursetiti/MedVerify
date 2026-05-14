const express = require('express');
const router = express.Router();
const verificationController = require('../controllers/verificationController');
const upload = require('../middleware/upload');
const { protect } = require('../services/authService');

router.post('/submit', protect, upload.single('document'), verificationController.submitCredentials);

module.exports = router;