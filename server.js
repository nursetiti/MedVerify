const express = require('express');
const cors = require('cors');
const path = require('path');
require('dotenv').config();
const { sequelize } = require('./models');

// Route Imports
const adminRoutes = require('./routes/adminRoute');
// Assuming you'll create these based on your existing controllers
const authRoutes = require('./routes/authRoute'); 
const verificationRoutes = require('./routes/verificationRoute');
const webhookRoutes = require('./routes/webhookRoute');

const app = express();

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Static folder for uploads (Security note: Ensure .gitignore handles this)
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// Routes
app.use('/api/admin', adminRoutes);
app.use('/api/auth', authRoutes);
app.use('/api/verify', verificationRoutes);
app.use('/api/webhooks', webhookRoutes);

// Health Check
app.get('/', (req, res) => {
    res.status(200).json({ message: "MedVerify API is running smoothly." });
});

// Database Sync and Server Start
const PORT = process.env.PORT || 5000;

const startServer = async () => {
    try {
        await sequelize.authenticate();
        console.log('Database connected successfully.');
        
        // Use { alter: true } only in development; never in production
        await sequelize.sync({ alter: false }); 

        app.listen(PORT, () => {
            console.log(`Server is running on port ${PORT}`);
        });
    } catch (error) {
        console.error('Unable to connect to the database:', error);
        process.exit(1);
    }
};

startServer();