const { analyzeMedicalCredential } = require('../services/mlService');
const { initiatePayout } = require('../services/squadService');
const { Verification, Payouts, Practitioner, Sequelize } = require('../models');
const { Op } = require('sequelize');


exports.submitCredentials = async (req, res) => {
    try {
        console.log("User from Request:", req.user); 
        
        const practitionerId = req.user?.id || req.user?.userId; 

        if (!practitionerId) {
            return res.status(401).json({
                success: false,
                error: "User identity not found. Ensure you are logged in and using the 'protect' middleware."
            });
        }

        const { fullName, mdcnNumber, specialty, yearsOfPractice, bankCode, accountNumber } = req.body;

        if (!req.files || !req.files['mdcnCertificate'] || !req.files['governmentId']) {
            return res.status(400).json({ 
                success: false, 
                message: "Both MDCN Certificate and Government ID are required." 
            });
        }

        // 1. Run AI Analysis
        const aiResult = await analyzeMedicalCredential(req.files, { 
            fullName, 
            mdcnNumber 
        });

        // 2. UPSERT Practitioner Profile First
        // This ensures we have a valid ID for the Verification table
        let practitioner = await Practitioner.findOne({ where: { userId: practitionerId } });

        const practitionerData = {
            userId: practitionerId,
            fullName,
            licenseNumber: mdcnNumber,
            specialty,
            yearsOfPractice,
            bankCode,
            accountNumber
        };

        if (practitioner) {
            await practitioner.update(practitionerData);
        } else {
            practitioner = await Practitioner.create(practitionerData);
        }

        // 3. HARD BLOCK: Security Gate for score < 30
        if (aiResult.trust_score < 30) {
            await Verification.create({
                practitioner_id: practitioner.id, // Now valid
                trust_score: aiResult.trust_score,
                status: 'REJECTED',
                ml_flags: aiResult.flags,
                document_url: req.files['mdcnCertificate'][0].path
            });

            return res.status(403).json({
                success: false,
                message: "Verification failed: Credentials do not meet security standards.",
                trustScore: aiResult.trust_score
            });
        }

        // 4. Standard Audit Trail for scores >= 30
        const verification = await Verification.create({
            practitioner_id: practitioner.id,
            trust_score: aiResult.trust_score,
            status: aiResult.trust_score > 70 ? 'APPROVED' : 'UNDER_REVIEW',
            ml_flags: aiResult.flags,
            document_url: req.files['mdcnCertificate'][0].path
        });

        res.status(200).json({
            success: true,
            message: "Credentials submitted and analysis complete",
            trustScore: aiResult.trust_score,
            status: verification.status
        });

    } catch (error) {
        console.error("Sequelize Validation Details:", error.errors?.map(e => e.message));
        res.status(500).json({ success: false, error: error.message });
    }
};

/**
 * Verification Controller: The "Trust Gate" for the Telemedicine Platform
 * Logic:
 * Score > 70: Auto-Onboard & Pay (Legit)
 * Score 30-70: Manual Review (Flagged)
 * Score < 30: Block & Report (Fraud)
 */
exports.processVerificationAndPayment = async (req, res) => {
    // In the Admin workflow, the admin selects a practitioner to verify
    const { practitionerId, amount, licenseNumber } = req.body;

    try {
        const licenseRegex = /^MDN\/\d{4,6}$/;
        if (!licenseRegex.test(licenseNumber)) {
            return res.status(400).json({ 
                success: false, 
                message: "Invalid MDCN License format. Format should be MDN/ followed by 4-6 digits." 
            });
        }
        
        const practitioner = await Practitioner.findByPk(practitionerId);
        if (!practitioner) {
            return res.status(404).json({ success: false, message: "Practitioner not found" });
        }

        const licenseInUse = await User.findOne({ 
            where: { licenseNumber, id: { [Op.ne]: practitionerId } } 
        });
        if (licenseInUse) {
            return res.status(400).json({ success: false, message: "This license number is already linked to another account." });
        }
        
        if (!req.file) {
            return res.status(400).json({ success: false, message: "No credential document provided" });
        }
        const documentPath = req.file.path;

        // 3. AI ANALYSIS (Bridge to Python Service)
        const aiResult = await analyzeMedicalCredential(documentPath);

        // 4. THE TRUST HIERARCHY LOGIC
        let status;
        let message;
        let triggerPayment = false;
        const score = aiResult.trust_score;

        if (score > 70) {
            status = 'APPROVED';
            message = "Practitioner verified as Legit. Onboarding/Payment authorized.";
            triggerPayment = true;
        } else if (score >= 30) {
            status = 'UNDER_REVIEW';
            message = "Credentials flagged for manual audit. Onboarding paused.";
        } else {
            status = 'BLOCKED';
            message = "Extreme fraud risk detected. Account suspended and reported to MDCN.";
        }

        // 5. DATABASE UPDATES (Audit Trail)
        // Record the verification attempt
        const verification = await Verification.create({
            practitioner_id: practitioner.id,
            document_url: documentPath,
            trust_score: score,
            ml_flags: aiResult.ml_flags,
            status: status
        });

        // If score is < 30, deactivate the practitioner account immediately
        if (status === 'BLOCKED') {
            await practitioner.update({ 
                isActive: false, 
                isVerified: false 
            });
            const primaryReason = aiResult.ml_flags.length > 0 
            ? aiResult.ml_flags.join(', ') 
            : "Low Trust Score";

            console.log(`\x1b[41m%s\x1b[0m`, `[SECURITY ALERT] Account Deactivated.`);
            console.log(`\x1b[33m%s\x1b[0m`, `Reason: ${primaryReason}`);
            console.log(`\x1b[33m%s\x1b[0m`, `License: ${licenseNumber} | ID: ${practitionerId}`);
            console.log(`\x1b[41m%s\x1b[0m`, `[FRAUD ALERT] MDCN Report generated for License: ${licenseNumber}`);
        }

        // 6. SQUAD PAYOUT TRIGGER (Only for 'APPROVED')
        let payoutInfo = null;
        if (triggerPayment && amount > 0) {
            const squadResponse = await initiatePayout({
                amount,
                licenseNumber,
                practitionerId,
                bankCode: practitioner.bankCode,
                accountNumber: practitioner.accountNumber
            });

            if (squadResponse.success) {
                const payout = await Payouts.create({
                    verification_id: verification.id,
                    squad_transaction_ref: squadResponse.data.transaction_reference,
                    amount: amount,
                    status: 'PENDING' // Awaiting Webhook confirmation
                });
                
                // Mark practitioner as verified in the platform
                await practitioner.update({ isVerified: true });
                payoutInfo = squadResponse.data.transaction_reference;
            } else {
                message += " Note: Squad payout failed to initiate.";
            }
        }

        // 7. FINAL RESPONSE
        return res.status(200).json({
            success: true,
            status,
            message,
            data: {
                trustScore: score,
                flags: aiResult.ml_flags,
                transactionRef: payoutInfo,
                verificationId: verification.id
            }
        });

    } catch (error) {
        console.error('Verification Error:', error);
        res.status(500).json({ success: false, error: "Internal processing error" });
    }
};