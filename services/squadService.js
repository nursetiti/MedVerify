const axios = require('axios');

const SQUAD_BASE_URL = 'https://sandbox-api-d.squadco.com'; // Use sandbox for the hackathon
const SQUAD_SECRET_KEY = process.env.SQUAD_SECRET_KEY;

const initiatePayout = async (paymentData) => {
    try {
        const response = await axios.post(
            `${SQUAD_BASE_URL}/transaction/initiate`,
            {
                amount: Math.round(paymentData.feeAmount * 100), // In Kobo
                email: paymentData.email,
                currency: "NGN",
                initiate_type: "inline", // Or "dynamic_virtual_account" if you prefer
                transaction_ref: `COLL-${Date.now()}-${paymentData.practitionerId.slice(0, 5)}`,
                callback_url: "https://your-frontend.com/verify-payment", // Redirect after payment
                metadata: {
                    practitioner_id: paymentData.practitionerId,
                    license_number: paymentData.licenseNumber,
                    trust_score: paymentData.trustScore // Log the ML result here for audit
                }
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
            checkoutUrl: response.data.data.checkout_url,
            transactionRef: response.data.data.transaction_ref
        };
    } catch (error) {
        console.error('Squad Collection Error:', error.response?.data || error.message);
        return { success: false, message: 'Could not generate payment request' };
    }
};

const executePayout = async (payoutData) => {
    try {
        const response = await axios.post(
            `${SQUAD_BASE_URL}/payout/transfer`,
            {
                amount: Math.round(payoutData.amount * 100), // Squad expects amount in Kobo
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

module.exports = { initiatePayout, executePayout };