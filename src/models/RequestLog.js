const mongoose = require('mongoose');

const requestLogSchema = new mongoose.Schema({
    clientIp: {
        type: String,
        required: true,
        index: true
    },
    endpoint: {
        type: String,
        required: true
    },
    method: {
        type: String,
        required: true
    },
    timestamp: {
        type: Date,
        default: Date.now,
        expires: 86400 * 7 // Automatically delete logs after 7 days to save space
    },
    userAgent: String,
    statusCode: Number,
    responseTime: Number,
    clientId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Client',
        index: true
    },
    status: {
        type: String, // 'allowed' | 'blocked'
        index: true
    },
    targetUrl: String,
    requestBody: mongoose.Schema.Types.Mixed,
    responseBody: mongoose.Schema.Types.Mixed
});

module.exports = mongoose.model('RequestLog', requestLogSchema);
