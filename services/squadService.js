const axios = require('axios');
const crypto = require('crypto');

// Payouts and Lookups use the 'api-d' subdomain in sandbox
const SQUAD_PAYOUT_URL = 'https://sandbox-api-d.squadco.com';
// Standard transactions use the standard sandbox subdomain
const SQUAD_TRANSACTION_URL = 'https://sandbox-api-d.squadco.com';

const SQUAD_SECRET_KEY = process.env.SQUAD_SECRET_KEY;

/**
 * 1. COLLECTION: Initiate a payment from a practitioner
 */
// New function for actual payouts (bank disbursement)
// services/squadService.js



// services/squadService.js
const initiatePayout = async (paymentData) => {
    try {
        // Use 'amount' to match your controller destructuring
        const amountInNaira = Number(paymentData.amount);
        
        // Final safety check for NaN before sending to Squad
        if (isNaN(amountInNaira)) {
            throw new Error("Invalid numeric amount received in Service");
        }

        const amountInKobo = Math.floor(amountInNaira * 100);
        const txnRef = `MV-COLL-${crypto.randomBytes(4).toString('hex').toUpperCase()}`;

        const payload = {
            amount: amountInKobo,
            email: paymentData.email,
            currency: "NGN",
            initiate_type: "inline",
            transaction_ref: txnRef,
            callback_url: "https://webhook.site/test",
            metadata: {
                practitioner_id: paymentData.practitionerId,
                license_number: paymentData.licenseNumber
            }
        };

        console.log(`[HNG-DEMO] Type: ${typeof payload.amount} | Kobo: ${payload.amount}`);

        const response = await axios.post(
            'https://sandbox-api-d.squadco.com/transaction/initiate',
            payload,
            {
                headers: {
                    'Authorization': `Bearer ${process.env.SQUAD_SECRET_KEY}`,
                    'Content-Type': 'application/json'
                }
            }
        );

        return {
            success: true,
            data: response.data.data
        };

    } catch (error) {
        console.error('--- 403 Security Check ---');
        console.error('URL Called:', error.config?.url);
        console.error('Auth Header Present:', !!error.config?.headers?.Authorization);
        console.error('Squad Response:', error.response?.data);
        
        return { success: false, message: "Security/Permission Error" };
    }
};

/**
 * 2. LOOKUP: Verify account name before sending money
 */

const lookupAccount = async (bankCode, accountNumber) => {
    try {
        const response = await axios.post(`${SQUAD_PAYOUT_URL}/payout/account/lookup`, {
            bank_code: bankCode,
            account_number: accountNumber
        }, {
            headers: { Authorization: `Bearer ${SQUAD_SECRET_KEY}` }
        });
        return { success: true, data: response.data.data };
    } catch (error) {
        // Log the full structure in your terminal for deeper debugging
        console.error('❌ Squad Account Lookup Raw Error:', error.response?.data || error.message);
        
        // 🌟 THE FIX: Extract the exact nested error message returned by Squad's API gateway
        const exactSquadErrorMessage = error.response?.data?.message || error.message || "Account lookup failed";
        
        return { 
            success: false, 
            error: exactSquadErrorMessage 
        };
    }
};

/**
 * 3. TRANSFER: Send money to a practitioner
 */
const executePayout = async (payoutData) => {
    try {
        const response = await axios.post(
            `${SQUAD_PAYOUT_URL}/payout/transfer`,
            {
                amount: Math.round(payoutData.amount * 100), 
                remark: `MedVerify Payout: ${payoutData.licenseNumber}`,
                bank_code: payoutData.bankCode,
                account_number: payoutData.accountNumber,
                currency_id: 'NGN',
                transaction_reference: `MV-${Date.now()}-${payoutData.practitionerId.split('-')[0]}`
            },
            {
                headers: {
                    'Authorization': `Bearer ${SQUAD_SECRET_KEY}`,
                    'Content-Type': 'application/json'
                }
            }
        );

        return {
            success: true,
            data: response.data.data
        };
    } catch (error) {
        console.error('Squad Payout Error:', error.response?.data || error.message);
        return {
            success: false,
            message: error.response?.data?.message || 'Payment initiation failed'
        };
    }
};

/**
 * GENERATE DYNAMIC VIRTUAL ACCOUNT
 */
const generateVirtualAccount = async (practitioner) => {
    try {
        const payload = { 
            beneficiary_account: practitioner.accountNumber ? Number(practitioner.accountNumber) : undefined
        };

        const response = await axios.post(
            'https://sandbox-api-d.squadco.com/virtual-account/create-dynamic-virtual-account',
            payload,
            {
                headers: {
                    'Authorization': `Bearer ${process.env.SQUAD_SECRET_KEY}`,
                    'Content-Type': 'application/json'
                }
            }
        );

        return {
            success: true,
            data: {
                virtual_account_number: response.data.data.virtual_account_number,
                bank_name: response.data.data.bank_name,
                account_name: response.data.data.account_name
            }
        };

    } catch (error) {
        // Logging the full response is key for debugging these strict KYC fields
        console.error('Virtual Account Error:', error.response?.data || error.message);
        return { 
            success: false, 
            message: error.response?.data?.message || "Could not generate account" 
        };
    }
};

// services/squadService.js
// squadService.js
const initiateDynamicAccount = async (practitioner, amount) => {
    try {
        // Force the input to a number
        const koboAmount = Math.floor(Number(amount));

        // Strict validation: Must be a number and greater than 0
        if (!amount || isNaN(koboAmount) || koboAmount <= 0) {
            console.error(`Validation Failed: Received amount is ${amount}`);
            return { success: false, message: "Invalid payment amount format" };
        }

        const payload = {
            amount: koboAmount, 
            email: practitioner.email,
            duration: 3600, // 1 hour in seconds per your rule image
            transaction_ref: `MV-DYN-${Date.now()}-${String(practitioner.id).slice(0, 4)}`,
        };

        const response = await axios.post(
            'https://sandbox-api-d.squadco.com/virtual-account/initiate-dynamic-virtual-account',
            payload,
            {
                headers: {
                    'Authorization': `Bearer ${process.env.SQUAD_SECRET_KEY}`,
                    'Content-Type': 'application/json'
                }
            }
        );

        return { success: true, data: response.data.data };

    } catch (error) {
        console.error('Squad API Error:', error.response?.data || error.message);
        return { 
            success: false, 
            message: error.response?.data?.message || "Squad API error" 
        };
    }
};

/**
 * SIMULATION ONLY: Triggers a mock payment in Sandbox
 */
const simulateSquadPayment = async (accountNumber, koboAmount) => {
    try {
        const cleanAmountString = String(Math.floor(Number(koboAmount)));

        const payload = {
            virtual_account_number: String(accountNumber), 
            amount: cleanAmountString // 👈 Enforced as a strict string literal (e.g., "520000")
        };

        const response = await axios.post(
            'https://sandbox-api-d.squadco.com/virtual-account/simulate/payment',
            payload,
            {
                headers: {
                    'Authorization': `Bearer ${process.env.SQUAD_SECRET_KEY}`,
                    'Content-Type': 'application/json'
                }
            }
        );

        return {
            success: true,
            message: response.data.message || "Payment simulation successful"
        };

    } catch (error) {
        console.error('Simulation Error:', error.response?.data || error.message);
        return {
            success: false,
            message: error.response?.data?.message || "Simulation failed"
        };
    }
};

module.exports = { initiatePayout, executePayout, lookupAccount, generateVirtualAccount, initiateDynamicAccount, simulateSquadPayment };