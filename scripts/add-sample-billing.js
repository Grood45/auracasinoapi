// Script to add sample billing data to MongoDB
const mongoose = require('mongoose');
require('dotenv').config();

const billingSchema = new mongoose.Schema({
    invoiceId: String,
    client: { type: mongoose.Schema.Types.ObjectId, ref: 'Client' },
    billingPeriod: String,
    amountDue: Number,
    amountPaid: Number,
    balance: Number,
    status: String,
    paymentMode: String,
    transactionRef: String,
    remarks: String,
    createdAt: { type: Date, default: Date.now }
});

const Billing = mongoose.model('Billing', billingSchema);

const clientSchema = new mongoose.Schema({
    name: String,
    whatsapp: String,
    status: String,
    rentAmount: Number,
    billingDate: Number,
    clientType: String,
    apiToken: String,
    monthlyHits: Number,
    totalHitsToday: Number,
    totalBlockedToday: Number,
    startDate: Date,
    endDate: Date,
    createdAt: Date
});

const Client = mongoose.model('Client', clientSchema);

async function addSampleBillingData() {
    try {
        await mongoose.connect(process.env.MONGO_URI || 'mongodb://localhost:27017/aura-proxy');
        console.log('✅ Connected to MongoDB');

        // Get all clients
        const clients = await Client.find();
        console.log(`📊 Found ${clients.length} clients`);

        if (clients.length === 0) {
            console.log('❌ No clients found. Please add clients first.');
            process.exit(1);
        }

        // Create sample billing records for each client
        const sampleBillings = [];

        for (let i = 0; i < Math.min(clients.length, 3); i++) {
            const client = clients[i];
            const now = new Date();
            const year = now.getFullYear().toString().slice(-2);
            const month = (now.getMonth() + 1).toString().padStart(2, '0');
            const random = Math.floor(1000 + Math.random() * 9000);

            // Create 2 invoices per client
            sampleBillings.push({
                invoiceId: `INV-${year}-${month}-${random}`,
                client: client._id,
                billingPeriod: 'January 2026',
                amountDue: client.rentAmount || 50000,
                amountPaid: (client.rentAmount || 50000),
                balance: 0,
                status: 'paid',
                paymentMode: 'Bank Transfer',
                transactionRef: `TXN${Math.floor(100000 + Math.random() * 900000)}`,
                remarks: 'Payment received on time'
            });

            sampleBillings.push({
                invoiceId: `INV-${year}-${month}-${random + 1}`,
                client: client._id,
                billingPeriod: 'December 2025',
                amountDue: client.rentAmount || 50000,
                amountPaid: Math.floor((client.rentAmount || 50000) * 0.6),
                balance: Math.floor((client.rentAmount || 50000) * 0.4),
                status: 'partial',
                paymentMode: 'USDT (Crypto)',
                transactionRef: `0x${Math.random().toString(16).substr(2, 8)}`,
                remarks: 'Partial payment received'
            });
        }

        // Insert billing records
        const result = await Billing.insertMany(sampleBillings);
        console.log(`✅ Created ${result.length} billing records`);

        // Show summary
        const totalBillings = await Billing.countDocuments();
        console.log(`📊 Total billing records in database: ${totalBillings}`);

        mongoose.connection.close();
        console.log('✅ Done!');
    } catch (error) {
        console.error('❌ Error:', error);
        process.exit(1);
    }
}

addSampleBillingData();
