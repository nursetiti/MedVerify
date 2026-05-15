const Joi = require('joi');

const userSchema = Joi.object({
    fullName: Joi.string().required(),
    email: Joi.string().email().required(),
    phone: Joi.string().pattern(/^[0-9]{10,15}$/).required(),
    password: Joi.string().min(6).max(30).required(),
    DOB: Joi.string().required(),
    role: Joi.string().valid('practitioner', 'admin').required(),
});

const loginSchema = Joi.object({
    email: Joi.string().email().required(),
    password: Joi.string().required()
});

module.exports = {userSchema, loginSchema};