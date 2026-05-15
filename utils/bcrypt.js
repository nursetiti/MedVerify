const bcrypt = require('bcrypt');

// Hash password
const hashPassword = async (password) => {
    const salt = await bcrypt.genSalt(10)
    return await bcrypt.hash(password, salt)
};

// Compare Password
const comparePassword = async(password, hashedPassword) => {
    return await bcrypt.compare(password, hashedPassword);
};

module.exports = {hashPassword, comparePassword}