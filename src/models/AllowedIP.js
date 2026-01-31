const mongoose = require('mongoose');

const AllowedIPSchema = new mongoose.Schema({
    ip: {
        type: String,
        required: true,
        unique: true,
        trim: true
    },
    clientId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Client',
        required: true
    },
    status: {
        type: String,
        enum: ['active', 'blocked'],
        default: 'active'
    },
    mode: {
        type: String,
        enum: ['demo', 'production'],
        default: 'production'
    },
    notes: {
        type: String,
        trim: true
    },
    hitsToday: {
        type: Number,
        default: 0
    },
    blockedToday: {
        type: Number,
        default: 0
    },
    createdAt: {
        type: Date,
        default: Date.now
    }
});

module.exports = mongoose.model('AllowedIP', AllowedIPSchema);

