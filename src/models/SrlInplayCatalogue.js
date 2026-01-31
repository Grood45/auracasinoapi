const mongoose = require('mongoose');

const SrlInplayCatalogueSchema = new mongoose.Schema({
    id: {
        type: String,
        default: 'srl_inplay', // Global record
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

module.exports = mongoose.model('SrlInplayCatalogue', SrlInplayCatalogueSchema);
