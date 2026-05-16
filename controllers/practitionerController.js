const { Verification, Practitioner, User } = require('../models');
// 🌟 THE FIX: Ensure both methods are cleanly destructured here
const squadService = require('../services/squadService');
// Ensure the path to your service file is correct

/**
 * Controller to generate and assign a dynamic virtual account
 * as per the flow in image_84091b.png
 */
exports.initiateDynamicVirtualAccount = async (req, res) => {
    const { practitionerId } = req.body;

    try {
        // 1. Fetch practitioner from PostgreSQL
        const practitioner = await Practitioner.findByPk(practitionerId);

        if (!practitioner) {
            return res.status(404).json({
                success: false,
                message: "Practitioner not found."
            });
        }

        // 2. Call the updated service matching image_84091b.png parameters
        const squadResponse = await squadService.generateVirtualAccount({
            id: practitioner.id,
            firstName: practitioner.firstName || practitioner.fullName?.split(' ')[0],
            lastName: practitioner.lastName || practitioner.fullName?.split(' ')[1],
            beneficiaryAccount: practitioner.beneficiaryAccount || practitioner.accountNumber, // Optional field
        });

        if (squadResponse.success) {
            // 3. Persist the virtual account number (Integer) to your DB
            await practitioner.update({
                virtual_account_number: squadResponse.data.virtual_account_number,
                bank_name: squadResponse.data.bank_name
            });

            return res.status(200).json({
                success: true,
                message: "Dynamic virtual account assigned successfully.",
                data: {
                    virtual_account_number: squadResponse.data.virtual_account_number,
                    bank_name: squadResponse.data.bank_name,
                    account_name: squadResponse.data.account_name
                }
            });
        } else {
            return res.status(400).json({
                success: false,
                message: squadResponse.message
            });
        }

    } catch (error) {
        console.error("Controller Error [Virtual Account]:", error);
        return res.status(500).json({
            success: false,
            message: "Internal server error during account generation.",
            error: process.env.NODE_ENV === 'development' ? error.message : undefined
        });
    }
};
exports.initiateVerificationPayment = async (req, res) => {
    try {
        // 1. Destructure carefully
        const { practitionerId } = req.body;

        // 2. Fetch the practitioner
        // 🌟 THE FIX: Ensure the inclusion alias matches your models/index.js configuration perfectly
    const practitioner = await Practitioner.findByPk(practitionerId);

        if (!practitioner) {
            return res.status(404).json({ success: false, message: "Practitioner not found" });
        }

        const databaseAmount = practitioner.amount; 

        if (!databaseAmount || databaseAmount <= 0) {
            return res.status(400).json({ 
                success: false, 
                message: "Invalid payout configuration: No locked amount found for this practitioner profile." 
            });
        }

        // 3. PASS SEPARATELY: practitioner as 1st arg, amount as 2nd arg
        const squadResponse = await squadService.initiateDynamicAccount(practitioner, databaseAmount);

        if (squadResponse.success) {
            const squadData = squadResponse.data;
            const generatedAccountNumber = squadData.virtual_account_number || squadData.account_number;

            // 🌟 RULE 2: Persist the generated dynamic checkout account number back to the practitioner model record
            await practitioner.update({
                accountNumber: String(generatedAccountNumber)
            });
            return res.status(200).json({
                status: 200,
                success: true,
                message: "Success",
                data: {
                    is_blocked: false,
                    account_name: squadData.account_name || "SQUAD CHECKOUT",
                    account_number: generatedAccountNumber,
                    expected_amount: Number(databaseAmount).toFixed(2), 
                    expires_at: squadData.expiry_date || squadData.expires_at,
                    transaction_reference: squadData.transaction_ref || squadData.transaction_reference,
                    bank: squadData.bank_name || squadData.bank,
                    currency: "NGN"
                }
            });
        }

        return res.status(400).json({ success: false, message: squadResponse.message });

    } catch (error) {
        console.error('Controller Error:', error);
        return res.status(500).json({ success: false, message: "Internal Server Error" });
    }
};

exports.triggerPaymentSimulation = async (req, res) => {
    try {
        const { practitionerId } = req.body;

        if (!practitionerId) {
            return res.status(400).json({ success: false, message: "Practitioner ID is required." });
        }

        // 1. Fetch the practitioner to extract their assigned dynamic account and locked amount
        const practitioner = await Practitioner.findByPk(practitionerId);

        if (!practitioner) {
            return res.status(404).json({ success: false, message: "Practitioner record not found." });
        }

        const targetAccount = practitioner.accountNumber;
        const targetAmount = practitioner.amount;

        if (!targetAccount) {
            return res.status(400).json({ 
                success: false, 
                message: "No active dynamic virtual account found for this practitioner. Please run initiation endpoint first." 
            });
        }

        // 2. Execute the sandbox transfer simulation
        const simulationResult = await squadService.simulateSquadPayment(targetAccount, targetAmount);

        if (simulationResult.success) {
            return res.status(200).json({
                success: true,
                message: "Squad sandbox payment simulation triggered successfully. Check your webhook terminal log next!",
                data: simulationResult.data
            });
        }

        return res.status(424).json({ success: false, message: simulationResult.message });

    } catch (error) {
        console.error('❌ Controller Error [Simulation]:', error);
        return res.status(500).json({ success: false, message: "Internal Server Error executing simulation." });
    }
};