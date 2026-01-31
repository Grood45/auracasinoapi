const mongoose = require('mongoose');

const SrlUpcomingCatalogueSchema = new mongoose.Schema({
    id: {
        type: String,
        default: 'srl_upcoming', // Global record
        unique: true
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

module.exports = mongoose.model('SrlUpcomingCatalogue', SrlUpcomingCatalogueSchema);
