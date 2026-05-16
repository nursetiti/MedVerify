// controllers/payoutController.js
const { Verification, Practitioner, Payouts } = require('../models');
const { lookupAccount, executePayout } = require('../services/squadService');
const sequelize = require('../config/database');
const crypto = require('crypto');
const { randomBytes } = require('crypto');

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

exports.executeStep3Payout = async (req, res) => {
    const { verificationId } = req.body; // Only need the ID to trigger the flow
    const t = await sequelize.transaction();

    try {
        // 1. Fetch Records (Include Practitioner to get the base_amount)
        if (!verificationId) {
            await t.rollback();
            return res.status(400).json({ success: false, message: "Verification ID is required." });
        }

        // 🌟 THE FIX: Use the exact capitalized variable name declared in your import statement above
        const verification = await Verification.findByPk(verificationId, { 
            include: [{ 
                model: Practitioner, 
                as: 'practitioner' // 👈 Enforces the exact lowercase alias match
            }] 
        });

        if (!verification) {
            await t.rollback();
            return res.status(404).json({ success: false, message: "Verification record not found." });
        }
        
        const practitioner = verification.practitioner;
        if (!practitioner) {
            await t.rollback();
            return res.status(404).json({ success: false, message: "Associated practitioner profile missing." });
        }

        if (verification.status !== 'APPROVED' || !practitioner.isVerified || !practitioner.isActive) {
            await t.rollback();
            return res.status(403).json({ 
                success: false, 
                message: `Disbursement rejected. Current Verification Status: [${verification.status}]. Core profile must be APPROVED.` 
            });
        }
        
        // SECURITY: Pull the amount assigned by the backend during Signup
        const payoutAmount = practitioner.amount; // Extracted safely from DB state
        if (!payoutAmount || payoutAmount <= 0) {
            await t.rollback();
            return res.status(400).json({ success: false, message: "Invalid backend distribution amount configuration." });
        }

        // --- SQUAD SEQUENCE ---

        const generatedTransactionRef = `TXREF-${crypto.randomBytes(6).toString('hex').toUpperCase()}`;
        const generatedRemark = `VERIFY PAY: ${practitioner.fullName.toUpperCase()} | ${practitioner.licenseNumber}`;

        //  LOOKUP
        const lookup = await lookupAccount(practitioner.bankCode, practitioner.accountNumber);

        if (!lookup.success) {
            await t.rollback();
            return res.status(400).json({ 
                success: false, 
                message: `Bank Account Resolution Failed: ${lookup.error}` 
            });
        }

        // Extracted name directly from Squad's response object
        const verifiedAccountName = lookup.data.account_name;

        await practitioner.update({ 
            accountName: verifiedAccountName 
        }, { transaction: t });

        console.log(`[DB-SYNC] Updated practitioner ${practitioner.id} account name to: ${verifiedAccountName}`);

        // 4. EXECUTE
        const payoutResponse = await executePayout({
            amount: payoutAmount,
            bankCode: practitioner.bankCode,
            currency_id: "NGN",
            accountNumber: practitioner.accountNumber,
            transactionRef: generatedTransactionRef,
            remark: generatedRemark
        });
        if (!payoutResponse.success) throw new Error("Fund Transfer Failed");

        // --- DATABASE SYNC ---

        // 5. Update Statuses & Create Ledger
        // await verification.update({ status: 'APPROVED' }, { transaction: t });
        // await practitioner.update({ isVerified: true }, { transaction: t });

        const payoutRecord = await Payouts.create({
            verification_id: verification.id,
            squad_transaction_ref: payoutResponse.data.transaction_reference,
            amount: payoutAmount,
            status: 'SUCCESS'
        }, { transaction: t });

        await t.commit();

        return res.status(200).json({
            success: true,
            message: "Disbursement finalized.",
            data: {
                amountPaid: payoutAmount,
                recipient: lookup.data.account_name,
                transactionRef: payoutRecord.squad_transaction_ref
            }
        });

    } catch (error) {
        await t.rollback();
        console.error('Payout Finalization Failure:', error.message);
        return res.status(500).json({ success: false, error: error.message });
    }
};