const {User, Practitioner, Verification} = require('../models');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const sequelize = require('../config/database');
const {userSchema, loginSchema} = require('../validators/userValidate')
const {hashPassword, comparePassword} = require('../utils/bcrypt');
const { generateToken } = require('../services/authService');

// 1. Define the Compensation Matrix (Price List)
const SPECIALTY_RATES = {
    'General Practitioner': 5000,
    'Surgeon': 15000,
    'Pediatrician': 10000,
    'Cardiologist': 12000,
    'Nurse': 4000,
    'Default': 5000
};

// 2. Helper function to calculate merit-based pay
const calculateBaseAmount = (specialty, years) => {
    const base = SPECIALTY_RATES[specialty] || SPECIALTY_RATES['Default'];
    // 5% increase per year, capped at 100% bonus (max 20 years)
    const multiplier = 1 + Math.min((years * 0.05), 1.0); 
    return Math.floor(base * multiplier);
};

exports.signUp = async (req, res) => {
    const t = await sequelize.transaction();

    try {
        const { error, value } = userSchema.validate(req.body);
        if (error) return res.status(400).json({ error: error.message });
        
        const { fullName, email, password, role } = value;

        const existingUser = await User.findOne({ where: { email } });
        if (existingUser) return res.status(400).json({ error: 'Email already exists' });
        
        const hashedPassword = await hashPassword(password);
        
        // 1. Create the User record
        const user = await User.create(
            { 
                ...value, 
                password: hashedPassword, 
                isVerified: true // Now starts as false until Step 2/3
            }, 
            { transaction: t }
        );

        await t.commit();

        const responseData = user.toJSON();
        delete responseData.password;

        res.status(201).json({ 
            message: 'Account created. Please proceed to verification (Step 2).', 
            data: responseData 
        });

    } catch (error) {
        await t.rollback();
        if (error.name === 'SequelizeUniqueConstraintError') {
            return res.status(400).json({ error: 'License Number or Email already registered' });
        }
        res.status(500).json({ error: error.message });
    }
};

exports.login = async (req, res) => {
    try {
        const {error, value} = loginSchema.validate(req.body);
        if(error) return res.status(400).json({ error: error.message});

        const {email, password} = value;
        const user = await User.findOne({ where: { email } });
        
        if (!user) {
            return res.status(404).json({ message: 'User not found' });
        }

        const isMatch = await comparePassword(password, user.password);
        if (!isMatch) {
            return res.status(401).json({ message: 'Invalid credentials' });
        }

        // Generate the JWT for the frontend to store
        const token = generateToken(user);

        res.status(200).json({ 
            message: 'Login successful', 
            token, 
            userId: user.id 
        });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};