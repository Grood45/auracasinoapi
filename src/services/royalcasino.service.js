const axios = require('axios');
const RoyalCasino = require('../models/RoyalCasino');

const syncTables = async () => {
    try {
        console.log('🔄 Fetching Royal Gaming Tables...');
        const response = await axios.post('https://api.rgcbe2025.co/api/v1/core/gettables', {
            operatorId: 'rggap',
            token: '678a5b15-c9f9-422e-9093-d7b915342c9d',
            providerId: 'RGONLINE'
        }, {
            headers: { 'Content-Type': 'application/json' }
        });

        if (response.data && response.data.tables) {
            await RoyalCasino.findOneAndUpdate(
                { type: 'tables' },
                {
                    data: response.data,
                    updatedAt: new Date()
                },
                { upsert: true, new: true }
            );
            console.log(`✅ Successfully synced ${response.data.tables.length} tables to MongoDB.`);
            return response.data;
        } else {
            console.error('❌ Invalid response from Royal Gaming API:', response.data);
            return null;
        }
    } catch (err) {
        console.error('❌ Sync Error (Royal Gaming):', err.message);
        return null;
    }
};

const syncMarkets = async () => {
    try {
        console.log('🔄 Fetching Markets for all Royal Gaming Tables...');
        const tableEntry = await RoyalCasino.findOne({ type: 'tables' });

        if (!tableEntry || !tableEntry.data || !tableEntry.data.tables) {
            console.error('❌ No tables found in DB to sync markets for.');
            return;
        }

        const tables = tableEntry.data.tables;
        console.log(`📡 Found ${tables.length} tables. Starting market sync...`);

        // We'll process them in small batches or one by one to avoid overwhelming the API or timing out
        for (const table of tables) {
            try {
                // console.log(`   - Syncing markets for ${table.tableName} (${table.tableId})...`);
                const response = await axios.post('https://api.rgcbe2025.co/api/v1/core/getmarkets', {
                    token: '678a5b15-c9f9-422e-9093-d7b915342c9d',
                    operatorId: 'rggap',
                    partnerId: 'GAPINR',
                    providerId: 'RGONLINE',
                    gameId: table.gameId,
                    tableId: table.tableId
                }, {
                    headers: { 'Content-Type': 'application/json' },
                    timeout: 5000 // 5s timeout per request
                });

                if (response.data) {
                    await RoyalCasino.findOneAndUpdate(
                        { type: 'markets', gameId: table.gameId, tableId: table.tableId },
                        {
                            data: response.data,
                            updatedAt: new Date()
                        },
                        { upsert: true }
                    );
                }
            } catch (err) {
                console.error(`❌ Market Sync Error for table ${table.tableId}:`, err.message);
            }
        }
        console.log('✅ Royal Gaming Markets sync completed.');
    } catch (err) {
        console.error('❌ Global Market Sync Error:', err.message);
    }
};

module.exports = {
    syncTables,
    syncMarkets
};
