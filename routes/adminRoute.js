const express = require('express');
const router = express.Router();
const adminController = require('../controllers/adminController');
const verificationController = require('../controllers/verificationController');
const payoutController = require('../controllers/payoutController');
const PractitionerController = require('../controllers/practitionerController');
const upload = require('../middleware/upload');
const { protect, isAdmin } = require('../services/authService');


// TEST ROUTE: No protection, no admin check
router.post('/debug-test', (req, res) => {
    console.log("--- DEBUG BYPASS ---");
    console.log("Body:", req.body);
    res.json({ received: req.body });
});

// This route is correctly configured
router.post('/submit', protect, isAdmin, upload.fields([
    { name: 'mdcnCertificate', maxCount: 1 },
    { name: 'governmentId', maxCount: 1 }
    ]), verificationController.submitCredentials);

router.get('/board', isAdmin, adminController.getAdminStats);

// routes/adminRoutes.js
router.post(
    '/process-payment', 
    protect, 
    isAdmin, 
    upload.single('mdcnCertificate'), // Set to single and name it 'mdcnCertificate'
    verificationController.processVerificationAndPayment
);

router.post('/process-verification', protect, isAdmin, upload.single('mdcnCertificate'), verificationController.processVerification);

router.post('/process-payout', protect, isAdmin, verificationController.initiateManualPayout);

router.get('/flagged-cases', isAdmin, adminController.getFlaggedCases);

router.post('/execute-payout', protect, isAdmin, payoutController.executeManualPayout);

router.post('/virtual-account', protect, isAdmin, PractitionerController.initiateDynamicVirtualAccount);

router.post('/initiate-verification', protect, isAdmin, PractitionerController.initiateVerificationPayment);

module.exports = router;