const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');
const { type } = require('node:os');

const User = sequelize.define('user', {
    id: {
        type: DataTypes.UUID,
        allowNull: false,
        primaryKey: true,
        defaultValue: DataTypes.UUIDV4,
    },
    fullName: {
        type: DataTypes.STRING,
        allowNull: false,
        validate: { notEmpty: true }
    },
    email: {
        type: DataTypes.STRING,
        unique: true,
        allowNull: false,
        validate: { isEmail: true }
    },
    // phone: {
    //     type: DataTypes.STRING,
    //     allowNull: false,
    // },
    // DOB: {
    //     type: DataTypes.DATEONLY,
    //     allowNull: false,
    // },
    // address: {
    //     type: DataTypes.STRING,
    //     allowNull: true,
    // },
    password: {
        type: DataTypes.STRING,
        allowNull: false,
        comment: 'Hashed using bcrypt'
    },
    // gender: {
    //     type: DataTypes.STRING,
    //     allowNull: true,
    //     validate: {
    //         min: 1,
    //         max: 2
    //     } 
    // },
    role: {
        type: DataTypes.ENUM('admin', 'practitioner'),
        allowNull: false,
        defaultValue: 'practitioner' // Changed to practitioner as the standard user
    },
    // Professional Credentials (Added)
    // licenseNumber: {
    //     type: DataTypes.STRING,
    //     unique: true,
    //     allowNull: true, // Null until submission
    // },
    // specialty: {
    //     type: DataTypes.STRING,
    //     allowNull: true,
    // },
    // yearsOfPractice: {
    //     type: DataTypes.INTEGER,
    //     allowNull: true,
    // },
    // hospitalAffiliation: {
    //     type: DataTypes.STRING,
    //     allowNull: true,
    // },
    // Security & State (Added)
    isVerified: {
        type: DataTypes.BOOLEAN,
        defaultValue: false
    },
    isActive: {
        type: DataTypes.BOOLEAN,
        defaultValue: true,
        comment: 'Used to block accounts flagged by AI fraud detection'
    },
    lastLogin: {
        type: DataTypes.DATE
    }
});

module.exports = User;