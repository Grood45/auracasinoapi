const mongoose = require('mongoose');

const RoyalTableSchema = new mongoose.Schema({
    tableId: { type: String, required: true, unique: true },
    tableName: { type: String, required: true },
    gameId: { type: String, required: true },
    gameName: { type: String },
    providerId: { type: String },
    providerName: { type: String },
    status: { type: String },
    minBet: { type: Number },
    maxBet: { type: Number },
    updatedAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('RoyalTable', RoyalTableSchema);
