const { Sequelize } = require('sequelize');
require("dotenv").config();

let sequelize;

// 🌟 PRODUCTION CHECK: Use unified connection string if available, otherwise fallback to individual pieces
if (process.env.DATABASE_URL) {
    sequelize = new Sequelize(process.env.DATABASE_URL, {
        dialect: 'postgres',
        logging: process.env.NODE_ENV === 'development' ? console.log : false, // Disable verbose logging in production
        
        // 🔹 1. Connection Pooling Configuration
        pool: {
            max: 5,        // Maximum number of connection instances in pool
            min: 0,        // Minimum number of connection instances in pool
            acquire: 30000, // Maximum time (ms) that pool will try to get connection before throwing error
            idle: 10000    // Maximum time (ms) that a connection can be idle before being released
        },

        // 🔹 2. Production Security SSL Rules
        dialectOptions: {
            ssl: {
                require: true,
                rejectUnauthorized: false // Necessary for hosting providers like Render/Heroku using self-signed certs
            }
        }
    });
} else {
    // 🏠 Local Development Fallback Layer
    sequelize = new Sequelize(
        process.env.DB_NAME,
        process.env.DB_USER,
        process.env.DB_PASS,
        {
            host: process.env.DB_HOST,
            port: process.env.DB_PORT,
            dialect: 'postgres',
            logging: true
        }
    );
}

module.exports = sequelize;