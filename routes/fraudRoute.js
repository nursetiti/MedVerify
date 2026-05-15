const express = require('express');
const router = express.Router();
const fraudController = require('../controllers/fraudController');

// GET endpoint for fraud alerts
router.get('/alerts', fraudController.getFraudAlerts);

module.exports = router;