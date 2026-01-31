const mongoose = require('mongoose');
const dotenv = require('dotenv');
const AllowedIP = require('../src/models/AllowedIP');
const Client = require('../src/models/Client');
const connectDB = require('../src/services/db');

dotenv.config();

const clientName = process.argv[2];
const ip = process.argv[3];

if (!clientName || !ip) {
    console.log('Usage: node scripts/add-ip.js "<CLIENT_NAME>" <IP_ADDRESS>');
    process.exit(1);
}

const addIP = async () => {
    await connectDB();
    try {
        // 1. Find or create client
        let client = await Client.findOne({ name: clientName });
        if (!client) {
            client = await Client.create({ name: clientName });
            console.log(`👤 Created new client: ${clientName}`);
        }

        // 2. Add IP to client
        const newIP = await AllowedIP.create({ ip, clientId: client._id });
        console.log(`✅ Successfully whitelisted: ${ip} for ${clientName}`);
    } catch (err) {
        if (err.code === 11000) {
            console.error(`❌ Error: IP ${ip} is already in the whitelist.`);
        } else {
            console.error('❌ Error adding IP:', err.message);
        }
    } finally {
        mongoose.connection.close();
    }
};

addIP();
