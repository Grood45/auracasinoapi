const mongoose = require('mongoose');

const RoyalCasinoSchema = new mongoose.Schema({
    type: { type: String, required: true }, // 'tables' or 'markets'
    gameId: { type: String },
    tableId: { type: String },
    data: { type: mongoose.Schema.Types.Mixed, required: true },
    updatedAt: { type: Date, default: Date.now }
}, { collection: 'royalcasino' });

RoyalCasinoSchema.index({ type: 1, gameId: 1, tableId: 1 });

module.exports = mongoose.model('RoyalCasino', RoyalCasinoSchema);
