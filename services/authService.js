const jwt = require('jsonwebtoken');
const { User } = require('../models');
require('dotenv').config();

const SECRET_KEY = process.env.JWT_SECRET;

/**
 * Generates a token with Role-Based Access Control (RBAC)
 */
const generateToken = (User) => {
    const payload = {
        id: User.id,
        email: User.email,
        role: User.role 
    };
    return jwt.sign(payload, SECRET_KEY, { expiresIn: '8h' });
};

const verifyToken = (token) => {
    try {
        return jwt.verify(token, SECRET_KEY);
    } catch (error) {
        return null;
    }
};

const refreshToken = async (oldToken) => {
    const decoded = verifyToken(oldToken);
    if (!decoded) {
        throw new Error('Invalid token');
    }
    const user = await User.findByPk(decoded.id);
    if (!user) {
        throw new Error('User not found');
    }
    return generateToken(user);
};

const authenticate = (req, res, next) => {
    const authHeader = req.headers.authorization;

    if(!authHeader || !authHeader.startsWith('Bearer')) {
        return res.status(401).json({ error: 'Access denied. No token provided.'});
    };

    const token = authHeader.split(' ')[1];
    if (!token) return res.status(401).json({ error: 'No token provided'})

    try{
        const decoded = jwt.verify(token, SECRET_KEY);
        console.log("DEBUG: Decoded Token Content:", decoded);
        req.user = {
            userId: decoded.userId,  // match your User model
            email: decoded.email,
            role: decoded.role,
        };
        next();
    }catch(err){
        res.status(400).json({ error: 'Invalid or expired token'})
    }
};

const authorize = (roles = []) => (req, res, next) => {
    if (typeof roles === 'string') {
        roles = [roles];
    }

    if (!req.user) {
        return res.status(401).json({ error: 'Not authorized, no user found' });
    }

    if(!roles.includes(req.user.role)) {
        console.log(req.user.role);
        return res.status(403).json({ error: 'Access denied'});
    }
    next();
}

const protect = async (req, res, next) => {
    let token;

    if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
        token = req.headers.authorization.split(' ')[1];
    }

    if (!token) {
        return res.status(401).json({ message: 'Access denied. No token provided.' });
    }

    const decoded = verifyToken(token);
    if (!decoded) {
        return res.status(401).json({ message: 'Session expired or invalid token.' });
    }

    // Attach decoded user to request
    req.user = decoded;
    next();
};

/**
 * Middleware: IsAdmin
 * Restricts access to the Admin Board and Squad Payout triggers
 */
const isAdmin = (req, res, next) => {
    if (req.user && req.user.role === 'admin') {
        next();
    } else {
        res.status(403).json({ message: 'Access denied. Admin privileges required.' });
    }
};

module.exports = { generateToken, verifyToken, refreshToken, protect, isAdmin, authenticate };