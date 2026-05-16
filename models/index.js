// models/index.js  (or associations.js)
const User = require('./user');
const Practitioner = require('./practitioners');
const Verification = require('./verifications');
const Payouts = require('./payouts');        // ← Add this

// Associations
// User.hasOne(Practitioner, { 
//     foreignKey: 'userId', 
//     as: 'profile', 
//     onDelete: 'CASCADE' 
// });

// Practitioner.belongsTo(User, { foreignKey: 'userId', as: 'user' });

Practitioner.hasMany(Verification, { 
    foreignKey: 'practitioner_id',   // Make sure this matches your model
    as: 'verificationLogs' 
});

Verification.belongsTo(Practitioner, { 
    foreignKey: 'practitioner_id', 
    as: 'practitioner' 
});

// Add Payouts associations
Practitioner.hasMany(Payouts, { 
    foreignKey: 'practitioner_id', 
    as: 'payouts' 
});

Payouts.belongsTo(Practitioner, { 
    foreignKey: 'practitioner_id' 
});

module.exports = { 
    User, 
    Practitioner, 
    Verification, 
    Payouts          // ← Must export this
};