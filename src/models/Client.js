const mongoose = require('mongoose');

const ClientSchema = new mongoose.Schema({
    name: {
        type: String,
        required: true,
        trim: true
    },
    domain: {
        type: String,
        trim: true,
        unique: true,
        sparse: true // Allows null/undefined to be non-unique, but if present must be unique
    },
    numericId: {
        type: Number,
        unique: true,
        sparse: true
    },
    whatsapp: {
        type: String,
        trim: true
    },
    status: {
        type: String,
        enum: ['active', 'blocked', 'expired'],
        default: 'active'
    },
    rentAmount: {
        type: Number,
        default: 0
    },
    billingDate: {
        type: Number, // Day of the month (1-31)
        default: 1
    },
    clientType: {
        type: String,
        enum: ['demo', 'production'],
        default: 'demo'
    },
    apiToken: {
        type: String,
        unique: true,
        index: true
    },
    monthlyHits: {
        type: Number,
        default: 0
    },
    totalHitsToday: {
        type: Number,
        default: 0
    },
    totalBlockedToday: {
        type: Number,
        default: 0
    },
    startDate: {
        type: Date,
        default: Date.now
    },
    endDate: {
        type: Date
    },
    apiPermissions: [{
        provider: String,
        enabled: { type: Boolean, default: false },
        apis: [String]
    }],
    createdAt: {
        type: Date,
        default: Date.now
    }
});

module.exports = mongoose.model('Client', ClientSchema);

