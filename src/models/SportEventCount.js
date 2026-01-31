const mongoose = require('mongoose');

const SportEventCountSchema = new mongoose.Schema({
    id: {
        type: String,
        default: 'global_count', // Only one record needed
        unique: true
    },
    data: {
        type: mongoose.Schema.Types.Mixed, // Stores the exact JSON response
        required: true
    },
    lastUpdated: {
        type: Date,
        default: Date.now
    }
});

module.exports = mongoose.model('SportEventCount', SportEventCountSchema);
