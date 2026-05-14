const Sequelize = require('sequelize');
require("dotenv").config();

const sequelize = new Sequelize(
    process.env.DB_NAME,
    process.env.DB_USER,
    process.env.DB_PASS,
    {
        host: process.env.DB_HOST,
        port: process.env.DB_PORT,
        dialect: 'postgres',
        // 1. Logging: Set to false to keep terminal clean, or console.log to debug SQL
        logging: process.env.NODE_ENV === 'development' ? console.log : false,
        
        // 2. Connection Pool: Prevents 'Too many connections' errors
        pool: {
            max: 5,       
            min: 0,       
            acquire: 30000,
            idle: 10000    
        },

        dialectOptions: {
            ssl: process.env.DB_SSL === 'true' ? {
                require: true,
                rejectUnauthorized: false // Helps with self-signed certs in dev/staging
            } : false
        }
    }
);

module.exports = sequelize;