// controllers/payoutController.js
const { Practitioner, Payouts } = require('../models');
const { lookupAccount, executePayout } = require('../services/squadService');

/**
 * Manually executes a payout to a verified practitioner after confirming bank details.
 * Optimized for Security-First Audit Trails.
 */
exports.executeManualPayout = async (req, res) => {
    const { practitionerId, amount } = req.body;

    try {
        // 1. Fetch practitioner from PostgreSQL
        const practitioner = await Practitioner.findByPk(practitionerId);
        if (!practitioner) {
            return res.status(404).json({ success: false, message: "Practitioner not found" });
        }

        // 2. Verification Guardrail
        if (!practitioner.isVerified) {
            return res.status(403).json({ 
                success: false, 
                message: "Security Block: Payout denied for unverified practitioner." 
            });
        }

        // 3. Squad Account Lookup 
        console.log(`[PAYOUT] Validating account for: ${practitioner.accountNumber}`);
        const lookup = await lookupAccount(practitioner.bankCode, practitioner.accountNumber);
        
        if (!lookup.success) {
            return res.status(400).json({ 
                success: false, 
                message: `Bank Validation Failed: ${lookup.error}` 
            });
        }

        // 4. Name Matching Logic (Prevents Fat-Finger Fraud)
        const bankAccountName = lookup.data.account_name.toUpperCase();
        const localName = practitioner.fullName.toUpperCase();
        
        // Simple check: Ensure at least one part of the name matches
        const nameParts = localName.split(' ');
        const isMatch = nameParts.some(part => bankAccountName.includes(part));

        if (!isMatch) {
            return res.status(400).json({ 
                success: false, 
                message: `Identity Mismatch: Bank returns '${bankAccountName}' but profile is '${localName}'` 
            });
        }

        // 5. Execute Squad Payout (The 'image_a2e731.png' infrastructure)
        const payoutResponse = await executePayout({
            amount,
            bankCode: practitioner.bankCode,
            accountNumber: practitioner.accountNumber,
            licenseNumber: practitioner.licenseNumber,
            practitionerId: practitioner.id
        });

        if (!payoutResponse.success) {
            return res.status(400).json({ 
                success: false, 
                message: `Squad Transfer Error: ${payoutResponse.message}` 
            });
        }

        // 6. Finalize Audit Trail in DB
        const payoutRecord = await Payouts.create({
            practitioner_id: practitioner.id,
            squad_transaction_ref: payoutResponse.data.transaction_reference,
            amount: amount,
            status: 'SUCCESS' // Or 'PENDING' if awaiting webhook
        });

        return res.status(200).json({
            success: true,
            message: "Payout executed and logged successfully.",
            data: {
                recipient: bankAccountName,
                transactionRef: payoutRecord.squad_transaction_ref,
                amountPaid: amount
            }
        });

    } catch (error) {
        console.error('Payout Execution Error:', error);
        res.status(500).json({ success: false, error: "Internal processing error during payout." });
    }
};