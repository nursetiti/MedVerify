const { DataTypes, UUIDV4 } = require('sequelize');
const sequelize = require('../config/database');

const Payouts = sequelize.define('payouts', {
    id: {
        type: DataTypes.UUID,
        allowNull: false,
        defaultValue: UUIDV4,
        primaryKey: true,
    },
    verification_id: {
        type: DataTypes.UUID,
        allowNull: false,
        references: {
            model: 'verifications', 
            key: 'id'
        }
    },
    squad_transaction_ref: {
        type: DataTypes.STRING,
        allowNull: true,
    },
    amount: {
        type: DataTypes.DECIMAL(12, 2),
        allowNull: false,
    },
    status: {
        type: DataTypes.ENUM('HELD', 'PENDING', 'SUCCESS', 'FAILED', 'FLAGGED'),
        defaultValue: 'HELD',
        allowNull: false,
    },
    currency: {
        type: DataTypes.STRING,
        defaultValue: 'NGN',
    }
}, {
    timestamps: true,
});

module.exports = Payouts;