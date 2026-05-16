const Joi = require('joi');

const userSchema = Joi.object({
    fullName: Joi.string().required(),
    email: Joi.string().email().required(),
    // phone: Joi.string().pattern(/^[0-9]{10,15}$/).required(),
    password: Joi.string().min(6).max(30).required(),
    // DOB: Joi.date().iso().required(), // Changed to date for better validation
    role: Joi.string().valid('practitioner', 'admin').required(),
    
    // Fields for Practitioner (Optional for Admin)
    // licenseNumber: Joi.string().allow(null, ''),
    // specialty: Joi.string().allow(null, ''),
    // yearsOfPractice: Joi.number().integer().min(0).allow(null),
    // hospitalAffiliation: Joi.string().allow(null, ''),
    
    // // Fields for Payout Logic
    // bankCode: Joi.string().pattern(/^[0-9]{3}$/).allow(null, ''), // e.g., "058"
    // accountNumber: Joi.string().pattern(/^[0-9]{10}$/).allow(null, ''), // Exactly 10 digits
    // address: Joi.string().allow(null, ''),
    // gender: Joi.string().valid('1', '2').allow(null, '') // Matches your model's validation
});

const loginSchema = Joi.object({
    email: Joi.string().email().required(),
    password: Joi.string().required()
});

module.exports = { userSchema, loginSchema };