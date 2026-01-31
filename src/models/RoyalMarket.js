const mongoose = require('mongoose');

const RoyalMarketSchema = new mongoose.Schema({
    marketId: { type: String, required: true },
    marketName: { type: String, required: true },
    marketType: { type: String },
    status: { type: String },
    runners: [mongoose.Schema.Types.Mixed],
    tableId: { type: String, required: true },
    gameId: { type: String, required: true },
    tableName: { type: String },
    gameName: { type: String },
    providerId: { type: String },
    providerName: { type: String },
    updatedAt: { type: Date, default: Date.now }
});

// Compound index for fast lookup
RoyalMarketSchema.index({ tableId: 1, gameId: 1, marketId: 1 }, { unique: true });

module.exports = mongoose.model('RoyalMarket', RoyalMarketSchema);
