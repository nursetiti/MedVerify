const { Practitioner, User } = require('../models');
const squadService = require('../services/squadService');
const { initiateDynamicAccount } = require('../services/squadService'); 
// Ensure the path to your service file is correct

/**
 * Controller to generate and assign a dynamic virtual account
 * as per the flow in image_84091b.png
 */
exports.initiateDynamicVirtualAccount = async (req, res) => {
    const { practitionerId } = req.body;

    try {
        // 1. Fetch practitioner from PostgreSQL
        const practitioner = await Practitioner.findByPk(practitionerId, {
            include: [{
                model: User // Only fetch what you need
            }]
        });

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
            phoneNumber: practitioner.user.phone,
            dob: practitioner.user.DOB, // Accessed via association
            address: practitioner.user.address, // Accessed via association
            gender: practitioner.user.gender, // Accessed via association
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
        const { practitionerId, amount } = req.body;

        // 2. Fetch the practitioner
        const practitioner = await Practitioner.findByPk(practitionerId, {
            include: [{ model: User, as: 'user' }]
        });

        if (!practitioner) {
            return res.status(404).json({ success: false, message: "Practitioner not found" });
        }

        // 3. PASS SEPARATELY: practitioner as 1st arg, amount as 2nd arg
        const squadResponse = await initiateDynamicAccount(practitioner, amount);

        if (squadResponse.success) {
            const squadData = squadResponse.data;
            return res.status(200).json({
                status: 200,
                success: true,
                message: "Success",
                data: {
                    is_blocked: false,
                    account_name: squadData.account_name || "SQUAD CHECKOUT",
                    account_number: squadData.virtual_account_number || squadData.account_number,
                    expected_amount: (Number(amount) / 100).toFixed(2), 
                    expires_at: squadData.expiry_date || squadData.expires_at,
                    transaction_reference: squadData.transaction_ref || squadData.transaction_reference,
                    bank: squadData.bank_name || squadData.bank || "GTBank",
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