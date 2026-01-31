const mongoose = require('mongoose');
const Admin = require('../src/models/Admin');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env') });

const resetAdmin = async () => {
    try {
        await mongoose.connect(process.env.MONGO_URI);
        console.log('Connected to MongoDB');

        const username = process.env.ADMIN_USERNAME || 'admin';
        const password = process.env.ADMIN_PASSWORD || 'admin123';

        // Delete existing admin
        await Admin.deleteOne({ username });
        console.log(`Deleted existing admin: ${username}`);

        // Create new admin
        const admin = new Admin({ username, password });
        await admin.save();
        console.log(`Created new admin: ${username} with password: ${password}`);

        process.exit(0);
    } catch (err) {
        console.error('Error resetting admin:', err);
        process.exit(1);
    }
};

resetAdmin();
