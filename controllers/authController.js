const {User} = require('../models');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const {userSchema, loginSchema} = require('../validators/userValidate')
const {hashPassword, comparePassword} = require('../utils/bcrypt');
const { generateToken } = require('../services/authService');

exports.signUp = async (req, res) => {
    try {
        const {error, value} = userSchema.validate(req.body);
        if (error) return res.status(400).json({error : error.message});
        const {fullName, email, phone, password, DOB, role } = value;

        const existingUser = await User.findOne({ where: {email} });
        if (existingUser) return res.status(400).json({ error: 'Email already exist'});
        
        const hashedPassword = await hashPassword(password);
        
        const user = await User.create({ ...req.body, password: hashedPassword });
        
        // Don't send the password back in the response
        const responseData = user.toJSON();
        delete responseData.password;

        res.status(201).json({ 
            message: 'User signed up successfully', 
            data: responseData 
        });
    } catch (error) {
        // Handle unique constraint errors (e.g., email already exists)
        if (error.name === 'SequelizeUniqueConstraintError') {
            return res.status(400).json({ error: 'Email or License Number already registered' });
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