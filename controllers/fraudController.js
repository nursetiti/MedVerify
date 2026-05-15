const fs = require('fs');
const path = require('path');

exports.getFraudAlerts = (req, res) => {
    try {
        // Path to the file discovered in your teammate's ML directory
        const filePath = path.join(__dirname, '../ML/data/fraud_alerts.json');
        
        const data = fs.readFileSync(filePath, 'utf8');
        const alerts = JSON.parse(data);

        res.status(200).json({
            status: 'success',
            results: alerts.length,
            data: { alerts }
        });
    } catch (error) {
        res.status(500).json({ error: 'Failed to retrieve fraud data' });
    }
};