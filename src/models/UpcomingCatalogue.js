const mongoose = require('mongoose');

const UpcomingCatalogueSchema = new mongoose.Schema({
    sportId: {
        type: String,
        required: true,
        unique: true,
        index: true
    },
    data: {
        type: mongoose.Schema.Types.Mixed, // Stores the exact JSON response from the API
        required: true
    },
    lastUpdated: {
        type: Date,
        default: Date.now
    }
});

module.exports = mongoose.model('UpcomingCatalogue', UpcomingCatalogueSchema);
