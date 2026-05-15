const { User, Practitioner } = require('../models');
const sequelize = require('../config/database');
const bcrypt = require('bcrypt');

const seedDatabase = async () => {
    try {
        await sequelize.sync({ force: true });
        console.log('Database synced and cleared.');

        const hashedPassword = await bcrypt.hash('AdminPassword123!', 12);

        // 1. Seed Admin
        await User.create({
            fullName: 'System Administrator',
            email: 'admin@medverify.ng',
            password: hashedPassword,
            phone: '08000000000',
            address: 'Lagos, Nigeria',
            gender: 1, // 1 for Male
            DOB: '1990-01-01',
            role: 'admin'
        });
        console.log('Admin user seeded successfully.');

        // 2. Seed Practitioner User
        // Fix: Pass the integer 1 directly. The String conversion 
        // should happen in the Service, not in the Seeder/Database.
        const docUser = await User.create({
            fullName: 'Ajiboye Peter',
            email: 'practitioner@test.com',
            password: hashedPassword,
            phone: '08123456789',
            address: 'University of Lagos, Akoka, Lagos',
            gender: 1, 
            DOB: '1994-05-15',
            role: 'practitioner'
        });

        // 3. Seed Practitioner Profile
        // This variable is now initialized AFTER the user
        const practitioner = await Practitioner.create({
            userId: docUser.id,
            fullName: 'Ajiboye Peter',
            licenseNumber: 'MDCN/88990',
            specialty: 'General Medicine',
            yearsOfPractice: 5,
            bankCode: '000014',
            accountNumber: '0123456789'
        });

        console.log('--------------------------------------------------');
        console.log('✅ SEEDING COMPLETE');
        console.log(`📌 COPY THIS PRACTITIONER ID FOR POSTMAN: ${practitioner.id}`);
        console.log('--------------------------------------------------');

        process.exit(0);
    } catch (error) {
        if (error.errors) {
            console.error('Validation Errors:', error.errors.map(e => e.message));
        } else {
            console.error('Seeding failed:', error);
        }
        process.exit(1);
    }
};

seedDatabase();