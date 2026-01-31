const mongoose = require('mongoose');

const BillingSchema = new mongoose.Schema({
    invoiceId: {
        type: String,
        required: true,
        unique: true
    },
    client: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Client',
        required: true
    },
    billingPeriod: {
        type: String, // e.g., "January 2026"
        required: true
    },
    amountDue: {
        type: Number,
        required: true
    },
    amountPaid: {
        type: Number,
        default: 0
    },
    balance: {
        type: Number,
        required: true
    },
    status: {
        type: String,
        enum: ['paid', 'partial', 'unpaid'],
        default: 'unpaid'
    },
    paymentMode: {
        type: String,
        trim: true
    },
    transactionRef: {
        type: String,
        trim: true
    },
    remarks: {
        type: String,
        trim: true
    },
    createdAt: {
        type: Date,
        default: Date.now
    }
});

module.exports = mongoose.model('Billing', BillingSchema);
