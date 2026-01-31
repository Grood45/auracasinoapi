const mongoose = require('mongoose');

const SportUpcomingListSchema = new mongoose.Schema({
    sportId: {
        type: String,
        required: true,
        unique: true,
        index: true
    },
    data: {
        type: mongoose.Schema.Types.Mixed,
        required: true
    },
    lastUpdated: {
        type: Date,
        default: Date.now
    }
});

module.exports = mongoose.model('SportUpcomingList', SportUpcomingListSchema);
