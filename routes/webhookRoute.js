const express = require('express');
const router = express.Router();
const webhookController = require('../controllers/webhookController'); // Path to your file

// Make sure it is a POST request and matches the path you put in the dashboard
router.post('/squad', webhookController.handleSquadWebhook);

module.exports = router;