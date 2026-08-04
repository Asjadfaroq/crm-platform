require('dotenv').config();
const mongoose = require('mongoose');
const User = require('./src/models/User');

const seedAdmin = async () => {
    try {
        await mongoose.connect(process.env.MONGODB_URI);
        console.log('Connected to MongoDB');

        const existingAdmin = await User.findOne({ email: 'admin@Mini CRM.com' });
        if (existingAdmin) {
            console.log('Admin user already exists');
            process.exit(0);
        }

        await User.create({
            name: 'Admin',
            email: 'admin@Mini CRM.com',
            password: 'admin123',
            role: 'admin',
        });

        console.log('Admin user created successfully');
        console.log('Email: admin@Mini CRM.com');
        console.log('Password: admin123');

        // Create a sample editor
        await User.create({
            name: 'Editor User',
            email: 'editor@Mini CRM.com',
            password: 'editor123',
            role: 'editor',
        });

        console.log('Editor user created successfully');
        console.log('Email: editor@Mini CRM.com');
        console.log('Password: editor123');

        process.exit(0);
    } catch (error) {
        console.error('Seed failed:', error.message);
        process.exit(1);
    }
};

seedAdmin();
