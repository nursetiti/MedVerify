const {Practitioner, Verification, Payout} = require('../models');

exports.handleWebhook = async (req, res) => {
    const { event, data } = req.body;
    // Security Tip: Implement SQUAD_HASH validation here to verify sender identity

    try {
        switch (event) {
            // STAGE 1: Collection Success (Trigger the Payout)
            case 'transaction_approved': 
                const verification = await Verification.findOne({ 
                    where: { transaction_ref: data.transaction_ref },
                    include: [Practitioner] 
                });

                if (verification && verification.status === 'APPROVED') {
                    // Logic Gate: Only trigger payout if ML trust_score was sufficient
                    const payoutResult = await executePayout({
                        amount: data.amount, // Or your custom disbursement amount
                        bankCode: verification.Practitioner.bankCode,
                        accountNumber: verification.Practitioner.accountNumber,
                        licenseNumber: verification.license_number,
                        practitionerId: verification.practitioner_id
                    });

                    if (payoutResult.success) {
                        await Payout.create({
                            verification_id: verification.id,
                            squad_transaction_ref: payoutResult.data.transaction_reference,
                            status: 'PROCESSING'
                        });
                    }
                }
                break;

            // STAGE 2: Payout Result (Update Audit Trail)
            case 'payout.success':
                await Payout.update(
                    { status: 'SUCCESS' }, 
                    { where: { squad_transaction_ref: data.transaction_reference } }
                );
                break;

            case 'payout.failed':
                const failedPayout = await Payout.findOne({ 
                    where: { squad_transaction_ref: data.transaction_reference } 
                });
                await failedPayout.update({ status: 'FAILED' });
                // Flag for manual review in your Security-First dashboard
                await Verification.update(
                    { status: 'FLAGGED' }, 
                    { where: { id: failedPayout.verification_id } }
                );
                break;

            default:
                console.log(`Unhandled event type: ${event}`);
        }
        res.status(200).send('OK');
    } catch (error) {
        console.error('Webhook processing error:', error);
        res.status(500).json({ error: error.message });
    }
};