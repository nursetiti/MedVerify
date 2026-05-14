const User = require('./user');
const Practitioner = require('./practitioners');
const Verification = require('./verifications');

// 1. One-to-One: A User (Role: Practitioner) has one professional profile
User.hasOne(Practitioner, { foreignKey: 'userId', as: 'profile', onDelete: 'CASCADE' });
Practitioner.belongsTo(User, { foreignKey: 'userId' });

// 2. One-to-Many: A Practitioner has many verification attempts over time
Practitioner.hasMany(Verification, { foreignKey: 'practitionerId', as: 'verificationLogs' });
Verification.belongsTo(Practitioner, { foreignKey: 'practitionerId' });

module.exports = { User, Practitioner, Verification };