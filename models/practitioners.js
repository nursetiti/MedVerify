const { DataTypes, UUID } = require('sequelize');
const sequelize = require('../config/database');

const Practitioner = sequelize.define('practitioner', {
    id: {
        type: DataTypes.UUID,
        allowNull: false,
        defaultValue: DataTypes.UUIDV4,
        primaryKey: true,
    },
    fullName: {
        type: DataTypes.STRING,
        allowNull: false,
        validate: {
            notEmpty: true
        }
    },
    licenseNumber: {
        type: DataTypes.STRING,
        //unique: true,
        allowNull: false,
        comment: 'Official MDCN or Pharmaceutical Council Registration Number'
    },
    specialty: {
        type: DataTypes.STRING,
        allowNull: false,
        defaultValue: 'General Practitioner'
    },
    yearsOfPractice: {
        type: DataTypes.INTEGER,
        allowNull: false,
    },
    // Squad-specific fields for payouts
    bankCode: {
        type: DataTypes.STRING,
        allowNull: true,
        comment: 'Required for Squad Payout API (e.g., 058 for GTBank)'
    },
    accountNumber: {
        type: DataTypes.STRING,
        allowNull: true,
        validate: {
            len: [10, 10]
        }
    },
    // beneficiaryAccount: {
    //     type: DataTypes.STRING,
    //     allowNull: true,
    //     validate: {
    //         len: [10, 10]
    //     },
    //     comment: 'Secondary account for payouts if different from accountNumber'
    // },
    walletAddress: {
        type: DataTypes.STRING,
        allowNull: true,
        comment: 'Internal virtual wallet or crypto address if applicable'
    },
    isActive: {
        type: DataTypes.BOOLEAN,
        defaultValue: true
    },
    isVerified: {
        type: DataTypes.BOOLEAN,
        defaultValue: false,
        comment: 'Global verification flag based on latest trust score'
    },
    userId: {
        type: DataTypes.UUID,
        allowNull: false,
        unique: true,
        references: {
            model: 'users',
            key: 'id'
        }
    }
}, {
    timestamps: true,
    tableName: 'practitioners',
    hooks: {
        // You can add a beforeCreate hook here later for bcrypt hashing
    }
});

module.exports = Practitioner;