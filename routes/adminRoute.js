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

router.get('/board', protect,  isAdmin, adminController.getAdminStats);

// routes/adminRoutes.js
// router.post(
//     '/process-payment', 
//     protect, 
//     isAdmin, 
//     upload.single('mdcnCertificate'), // Set to single and name it 'mdcnCertificate'
//     verificationController.processVerificationAndPayment
// );

router.post(
    '/process-verification-ML', 
    protect, 
    isAdmin, 
    verificationController.processVerificationML // Ensure this matches your exported controller name exactly
);

router.post(
    '/process-verification', 
    protect, 
    isAdmin, 
    verificationController.processVerificationBypass // Ensure this matches your exported controller name exactly
);

// router.post('/payout', protect, isAdmin, payoutController.executeStep3Payout);
// router.post('/process-payout', protect, isAdmin, verificationController.initiateManualPayout);

router.get('/flagged-cases',protect, isAdmin, adminController.getFlaggedCases);

// router.post('/execute-payout', protect, isAdmin, payoutController.executeManualPayout);

router.post('/virtual-account', protect, isAdmin, PractitionerController.initiateDynamicVirtualAccount);

router.post('/initiate-virtual-account', protect, isAdmin, PractitionerController.initiateVerificationPayment);

router.post('/simulate-payment', protect, isAdmin, PractitionerController.triggerPaymentSimulation)

module.exports = router;