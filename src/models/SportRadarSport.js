const mongoose = require('mongoose');

const SportRadarSportSchema = new mongoose.Schema({
    sportId: {
        type: String,
        required: true,
        unique: true,
        index: true
    },
    sportName: {
        type: String,
        required: true
    },
    status: {
        type: String,
        default: 'ACTIVE'
    },
    partnerId: {
        type: String,
        default: ''
    },
    lastUpdated: {
        type: Date,
        default: Date.now
    }
});

module.exports = mongoose.model('SportRadarSport', SportRadarSportSchema);
