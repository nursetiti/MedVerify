const crypto = require('crypto');
const { Practitioner, Verification, Payout, sequelize } = require('../models');
const squadService = require('../services/squadService');

exports.handleSquadWebhook = async (req, res) => {
    // 1. Capture Header (Using the key from the previous documentation)
    const squadSignature = req.headers['x-squad-encrypted-body'];
    const secret = process.env.SQUAD_SECRET_KEY;
    
    // 2. Hash Verification (Using rawBody for accuracy)
    const hash = crypto.createHmac('sha512', secret)
                    .update(req.rawBody || JSON.stringify(req.body))
                    .digest('hex');

    if (!squadSignature || hash.toUpperCase() !== squadSignature.toUpperCase()) {
        return res.status(401).json({ message: 'Invalid Signature' });
    }

    // 3. Extracting based on the Sample Payload structure
    const { Event, Body } = req.body; 

    const t = await sequelize.transaction();
    try {
        switch (Event) {
            case 'charge_successful': // Updated to match sample
                const verification = await Verification.findOne({ 
                    where: { transaction_ref: Body.transaction_ref }, // Nested in Body
                    include: [{ model: Practitioner }],
                    transaction: t
                });

                if (verification) {
                    // Logic for triggering Payout...
                }
                break;

            default:
                console.log(`ℹ️ Unhandled event: ${Event}`);
        }
        await t.commit();
        return res.status(200).send('OK');
    } catch (error) {
        await t.rollback();
        return res.status(500).json({ error: error.message });
    }
};