const jwt = require('jsonwebtoken');
const SECRET_KEY = process.env.JWT_SECRET;

// Standardize the payload to use 'userId'
const generateToken = (user) => {
    const payload = {
        userId: user.id, 
        email: user.email,
        role: user.role 
    };
    return jwt.sign(payload, SECRET_KEY, { expiresIn: '8h' });
};

// Unified Protect Middleware
const protect = async (req, res, next) => {
    let token;
    if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
        token = req.headers.authorization.split(' ')[1];
    }

    if (!token) return res.status(401).json({ message: 'Access denied. No token provided.' });

    try {
        const decoded = jwt.verify(token, SECRET_KEY);
        // Ensure we attach the user consistently
        req.user = decoded; 
        next();
    } catch (err) {
        return res.status(401).json({ message: 'Session expired or invalid token.' });
    }
};

const isAdmin = (req, res, next) => {
    if (req.user && req.user.role === 'admin') {
        next();
    } else {
        res.status(403).json({ message: 'Access denied. Admin privileges required.' });
    }
};

module.exports = { generateToken, protect, isAdmin };