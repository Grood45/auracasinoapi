const mongoose = require('mongoose');

const SessionSchema = new mongoose.Schema({
    adminId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Admin',
        required: true
    },
    sessionKey: {
        type: String,
        required: true,
        unique: true
    },
    ip: String,
    userAgent: String,
    lastActive: {
        type: Date,
        default: Date.now
    },
    createdAt: {
        type: Date,
        default: Date.now,
        expires: '24h' // Automatically delete session after 24 hours
    }
});

module.exports = mongoose.model('Session', SessionSchema);
