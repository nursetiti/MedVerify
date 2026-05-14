const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const Verification = sequelize.define('verification', {
    id: {
        type: DataTypes.UUID,
        allowNull: false, 
        defaultValue: DataTypes.UUIDV4,
        primaryKey: true,
    },
    practitioner_id: {
        type: DataTypes.UUID,
        allowNull: false,
        references: {
            model: 'practitioners',
            key: 'id'
        }
    },
    document_url: {
        type: DataTypes.TEXT,
        allowNull: false,
    },
    trust_score: {
        type: DataTypes.INTEGER,
        allowNull: false,
        defaultValue: 0,
        validate: {
            min: 0,
            max: 100
        }
    },
    ml_flags: {
        type: DataTypes.JSONB,
        allowNull: false,
        defaultValue: {},
        comment: 'Stores detailed AI analysis: tampering, seal_check, registry_match'
    },
    status: {
        type: DataTypes.ENUM('UNDER_REVIEW', 'APPROVED', 'REJECTED', 'FLAGGED', 'BLOCKED'),
        allowNull: false,
        defaultValue: 'UNDER_REVIEW'
    },
    adminNote: {
        type: DataTypes.TEXT,
        allowNull: true,
        comment: 'Optional field for admin comments during manual review'
    },
    metadata: {
        type: DataTypes.JSONB,
        allowNull: true,
        comment: 'Storage for OCR-extracted data like License Expiry or Name'
    },
    ml_flags: {
    type: DataTypes.JSON, // Use JSONB if using PostgreSQL for better querying
    allowNull: true,
    defaultValue: []
    }
}, {
    timestamps: true,
    tableName: 'verifications',
    indexes: [
        {
            fields: ['practitioner_id']
        },
        {
            fields: ['status']
        }
    ]
});

module.exports = Verification;