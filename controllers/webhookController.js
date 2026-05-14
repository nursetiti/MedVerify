const {Practitioner, Verification, Payout} = require('../models');

exports.handleWebhook = async (req, res) => {
    const { event, data } = req.body;
    console.log(`[Webhook Received] Event: ${event}, Ref: ${data.transaction_reference}`);

    const payout = await Payout.findOne({
        where: {squad_transaction_ref: data.transaction_reference}
    });


    try {
        switch (event) {
            case 'payout.success':
                await payout.update({ status: 'SUCCESS' });
                console.log(` Payout marked as SUCCESS for Ref: ${data.transaction_reference}`);
                break;
            case 'payout.failed':
                await payout.update({ status: 'FAILED' });
                const verification = await Verification.findOne({ where: { id: payout.verification_id } });
                await verification.update({ status: 'FLAGGED' });
                console.log(` Payout marked as FAILED for Ref: ${data.transaction_reference}`);
                break;
            default:
                console.log(`Unhandled event: ${event}`);
        }
        res.status(200).json({ message: 'Webhook processed successfully' });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};