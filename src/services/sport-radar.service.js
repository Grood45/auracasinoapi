const SportRadarSport = require('../models/SportRadarSport');
const InplayCatalogue = require('../models/InplayCatalogue');
const UpcomingCatalogue = require('../models/UpcomingCatalogue');
const SportEventCount = require('../models/SportEventCount');
const SrlInplayCatalogue = require('../models/SrlInplayCatalogue');
const SrlUpcomingCatalogue = require('../models/SrlUpcomingCatalogue');
const SportInplayList = require('../models/SportInplayList');
const SportUpcomingList = require('../models/SportUpcomingList');

const service = {
    /**
     * Syncs sports from the external API to MongoDB.
     * Only runs if the collection is empty, as per requirements.
     */
    syncSports: async () => {
        try {
            const count = await SportRadarSport.countDocuments();
            if (count > 0) {
                console.log(`✅ SportRadar Sports already exist (${count} records). Skipping sync.`);
                return;
            }

            console.log('🔄 Fetching SportRadar Sports from API...');

            const targetUrl = 'https://scatalog.mysportsfeed.io/api/v1/core/getsports';
            const payload = {
                operatorId: process.env.SPORTRADAR_OPERATOR_ID || 'laser247',
                providerId: process.env.SPORTRADAR_PROVIDER_ID || 'SportRadar',
                token: process.env.SPORTRADAR_TOKEN || 'c0e509b0-6bc1-4132-80cb-71b54345af12'
            };

            const response = await fetch(targetUrl, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });

            if (!response.ok) {
                throw new Error(`Upstream API error: ${response.statusText}`);
            }

            const data = await response.json();

            if (data && Array.isArray(data.sports)) {
                const bulkOps = data.sports.map(sport => ({
                    updateOne: {
                        filter: { sportId: sport.sportId },
                        update: {
                            $set: {
                                sportName: sport.sportName,
                                status: sport.status,
                                partnerId: sport.partnerId || '',
                                lastUpdated: new Date()
                            }
                        },
                        upsert: true
                    }
                }));

                if (bulkOps.length > 0) {
                    await SportRadarSport.bulkWrite(bulkOps);
                    console.log(`✅ Successfully synced ${bulkOps.length} SportRadar sports to MongoDB.`);
                }
            } else {
                console.warn('⚠️ Invalid data format received from SportRadar API');
            }

        } catch (error) {
            console.error('❌ SportRadar Sync Failed:', error.message);
        }
    },

    /**
     * Retrieves all sports from MongoDB formatted exactly like the upstream API.
     */
    getAllSports: async () => {
        const sports = await SportRadarSport.find({}, { _id: 0, __v: 0, lastUpdated: 0 });

        // Return in the exact format of the original API
        return {
            status: "RS_OK",
            errorDescription: "",
            sports: sports
        };
    },

    /**
     * Starts the background sync loop for Inplay & Upcoming Events & Counts.
     * Runs every 1 minute.
     */
    startInplaySync: () => {
        console.log('🚀 Starting SportRadar Sync Engine (Inplay, Upcoming & Counts)...');

        const syncLoop = async () => {
            try {
                // 1. Fetch Event Counts (Global)
                await service.fetchAndSaveEventCounts();

                // 2. Fetch SRL Events (Independent Loop, but we trigger one pass here to ensure startup execution)
                // Note: startSrlSync has its own interval, but we can also trigger it here or just call it separately in app.js
                // Easier to just call the independent starter once in app.js, 
                // BUT to keep things consolidated, let's just add the calls here?
                // Actually, user wants separate loop conceptually. 
                // Let's keep it clean: We will call service.startSrlSync() from app.js or from here ONCE.

                // Let's just do the standard sports loop here.

                // console.log('✅ Synced Event Counts');

                // 2. Get all active sports
                const sports = await SportRadarSport.find({ status: 'ACTIVE' });

                // 3. Iterate with staggering to avoid rate limits
                // We will now delegate to syncFullEventsLists() as it covers the same ground but with pagination.
                // Or, if users want BOTH endpoints (old non-paginated and new paginated), we keep both.
                // Assuming we want to ADD the new full list support side-by-side.

                // Existing simple catalogue syncs
                for (let i = 0; i < sports.length; i++) {
                    const sport = sports[i];
                    await new Promise(resolve => setTimeout(resolve, 500));
                    await service.fetchAndSaveInplayEvents(sport.sportId);
                    await new Promise(resolve => setTimeout(resolve, 200));
                    await service.fetchAndSaveUpcomingEvents(sport.sportId);
                }

                // NEW: Sync Paginated Full Lists
                await service.syncFullEventsLists();

                // console.log('✅ Sync Cycle Completed.');

            } catch (error) {
                console.error('❌ Sync Cycle Error:', error.message);
            }
        };

        // Run immediately on start
        syncLoop();

        // Then run every 60 seconds
        setInterval(syncLoop, 60 * 1000);
    },

    /**
     * Fetches Global Event Counts and saves to DB.
     */
    fetchAndSaveEventCounts: async () => {
        try {
            const targetUrl = 'https://scatalog.mysportsfeed.io/api/v1/core/sr-events-count';

            // Changed to POST as per 405 response
            const response = await fetch(targetUrl, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({})
            });

            if (!response.ok) {
                console.warn(`⚠️ Failed to fetch event counts: ${response.statusText}`);
                return;
            }

            const data = await response.json();

            await SportEventCount.findOneAndUpdate(
                { id: 'global_count' },
                {
                    id: 'global_count',
                    data: data,
                    lastUpdated: new Date()
                },
                { upsert: true, new: true }
            );

        } catch (error) {
            console.error('❌ Error fetching event counts:', error.message);
        }
    },

    /**
     * Fetches INPLAY events for a specific sport and saves to DB.
     */
    fetchAndSaveInplayEvents: async (sportId) => {
        try {
            const targetUrl = 'https://scatalog.mysportsfeed.io/api/v2/core/events-catalogue';
            const payload = {
                operatorId: process.env.SPORTRADAR_OPERATOR_ID || 'laser247',
                providerId: 'sportsbook',
                partnerId: process.env.SPORTRADAR_PARTNER_ID || 'LAPID01',
                isInplay: true,
                sportId: sportId,
                token: process.env.SPORTRADAR_TOKEN || 'c0e509b0-6bc1-4132-80cb-71b54345af12'
            };

            const response = await fetch(targetUrl, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });

            if (!response.ok) {
                return;
            }

            const data = await response.json();

            await InplayCatalogue.findOneAndUpdate(
                { sportId: sportId },
                {
                    sportId: sportId,
                    data: data,
                    lastUpdated: new Date()
                },
                { upsert: true, new: true }
            );

        } catch (error) {
            console.error(`❌ Error fetching inplay events for ${sportId}:`, error.message);
        }
    },

    /**
     * Fetches UPCOMING events for a specific sport and saves to DB.
     */
    fetchAndSaveUpcomingEvents: async (sportId) => {
        try {
            const targetUrl = 'https://scatalog.mysportsfeed.io/api/v2/core/events-catalogue';
            const payload = {
                operatorId: process.env.SPORTRADAR_OPERATOR_ID || 'laser247',
                providerId: 'sportsbook',
                partnerId: process.env.SPORTRADAR_PARTNER_ID || 'LAPID01',
                isInplay: false, // UPCOMING
                sportId: sportId,
                token: process.env.SPORTRADAR_TOKEN || 'c0e509b0-6bc1-4132-80cb-71b54345af12'
            };

            const response = await fetch(targetUrl, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });

            if (!response.ok) {
                return;
            }

            const data = await response.json();

            await UpcomingCatalogue.findOneAndUpdate(
                { sportId: sportId },
                {
                    sportId: sportId,
                    data: data,
                    lastUpdated: new Date()
                },
                { upsert: true, new: true }
            );

        } catch (error) {
            console.error(`❌ Error fetching upcoming events for ${sportId}:`, error.message);
        }
    },

    /**
     * Gets cached INPLAY events for a sport.
     */
    getInplayCatalogue: async (sportId) => {
        let queryId = sportId;
        if (!sportId.startsWith('sr:sport:')) {
            queryId = `sr:sport:${sportId}`;
        }

        const record = await InplayCatalogue.findOne({ sportId: queryId });
        if (record) {
            return record.data;
        } else {
            return {
                status: "RS_OK",
                errorDescription: "No inplay events found",
                inplayEvents: []
            };
        }
    },

    /**
     * Gets cached UPCOMING events for a sport.
     */
    getUpcomingCatalogue: async (sportId) => {
        let queryId = sportId;
        if (!sportId.startsWith('sr:sport:')) {
            queryId = `sr:sport:${sportId}`;
        }

        const record = await UpcomingCatalogue.findOne({ sportId: queryId });
        if (record) {
            return record.data;
        } else {
            return {
                status: "RS_OK",
                errorDescription: "No upcoming events found",
                upcomingEvents: []
            };
        }
    },

    /**
     * Gets cached Event Counts.
     */
    getEventCounts: async () => {
        const record = await SportEventCount.findOne({ id: 'global_count' });
        if (record) {
            return record.data;
        } else {
            return {
                status: "RS_OK",
                errorDescription: "No event counts found",
                data: []
            };
        }
    },

    // --- Deduplication & Caching Logic for Markets ---

    // Memory Cache: { "eventId": { data: {...}, timestamp: 123456789 } }
    marketsCache: new Map(),

    // In-Flight Requests: { "eventId": Promise }
    pendingRequests: new Map(),

    getEventMarkets: async (sportId, eventId) => {
        const cacheKey = `${sportId}:${eventId}`;
        const NOW = Date.now();
        const CACHE_TTL = 1000; // 1 Second (Ultra Real-Time)

        // 1. Check Memory Cache
        if (service.marketsCache.has(cacheKey)) {
            const cached = service.marketsCache.get(cacheKey);
            if (NOW - cached.timestamp < CACHE_TTL) {
                // Return cached data if fresh
                return cached.data;
            }
        }

        // 2. Check for In-Flight Request (Deduplication)
        // If a request is already running for this KEY, wait for it instead of starting a new one.
        if (service.pendingRequests.has(cacheKey)) {
            return await service.pendingRequests.get(cacheKey);
        }

        // 3. Start New Request
        const fetchPromise = (async () => {
            try {
                const targetUrl = 'https://scatalog.mysportsfeed.io/api/v2/core/list-markets';
                const payload = {
                    operatorId: process.env.SPORTRADAR_OPERATOR_ID || 'laser247',
                    partnerId: process.env.SPORTRADAR_PARTNER_ID || 'LAPID01',
                    sportId: sportId,
                    eventId: eventId,
                    token: process.env.SPORTRADAR_TOKEN || 'c0e509b0-6bc1-4132-80cb-71b54345af12'
                };

                const response = await fetch(targetUrl, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(payload)
                });

                if (!response.ok) {
                    throw new Error(`Upstream Error: ${response.statusText}`);
                }

                const data = await response.json();

                // Save to Cache
                service.marketsCache.set(cacheKey, {
                    data: data,
                    timestamp: Date.now()
                });

                return data;

            } catch (error) {
                console.error(`❌ Market Fetch Error (${cacheKey}):`, error.message);
                throw error; // Propagate error so client knows
            } finally {
                // Cleanup: Remove pending request flag when done
                service.pendingRequests.delete(cacheKey);
            }
        })();

        // Store the promise so others can wait on it
        service.pendingRequests.set(cacheKey, fetchPromise);

        return await fetchPromise;
    },

    /**
     * Betfair Markets Proxy (Same Deduplication Logic)
     * URL: https://api.mysportsfeed.io/api/v1/feed/betfair-market-in-sr
                
                service.marketsCache.set(cacheKey, {
                    data: data,
                    timestamp: Date.now()
                });
                
                return data;

            } catch (error) {
                console.error(`❌ Betfair Market Fetch Error (${cacheKey}):`, error.message);
                throw error;
            } finally {
                service.pendingRequests.delete(cacheKey);
            }
        })();

        service.pendingRequests.set(cacheKey, fetchPromise);
        return await fetchPromise;
    },

    /**
     * Starts background sync loop for SRL Events (Inplay & Upcoming).
     * Runs every 1 minute.
     */
    startSrlSync: () => {
        console.log('🚀 Starting SportRadar SRL Sync Engine...');

        const syncLoop = async () => {
            try {
                // 1. Sync SRL Inplay
                await service.fetchAndSaveSrlEvents(true);

                // Wait a bit
                await new Promise(resolve => setTimeout(resolve, 1000));

                // 2. Sync SRL Upcoming
                await service.fetchAndSaveSrlEvents(false);

                // console.log('✅ SRL Sync Cycle Completed.');

            } catch (error) {
                console.error('❌ SRL Sync Cycle Error:', error.message);
            }
        };

        // Run immediately
        syncLoop();

        // Repeat every 60 seconds
        setInterval(syncLoop, 60 * 1000);
    },

    /**
     * Fetches SRL events with pagination, merges them, and saves to DB.
     * @param {boolean} isInplay - True for Inplay, False for Upcoming
     */
    fetchAndSaveSrlEvents: async (isInplay) => {
        try {
            const targetUrl = 'https://scatalog.mysportsfeed.io/api/v2/core/getsrlevents';
            let allEvents = [];
            let page = 1;
            let totalPages = 1;

            // Loop until we fetched all pages
            do {
                const payload = {
                    operatorId: process.env.SPORTRADAR_OPERATOR_ID || 'laser247',
                    providerId: 'sportsbook', // Fixed as per requirements
                    partnerId: process.env.SPORTRADAR_PARTNER_ID || 'LAPID01',
                    isInPlay: isInplay,
                    token: process.env.SPORTRADAR_TOKEN || 'c0e509b0-6bc1-4132-80cb-71b54345af12',
                    pageNo: page
                };

                // console.log(`DEBUG: Sending SRL Payload (Page ${page}):`, JSON.stringify(payload));

                const response = await fetch(targetUrl, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(payload)
                });

                if (!response.ok) {
                    console.warn(`⚠️ Failed to fetch SRL events (Page ${page}): ${response.statusText}`);
                    const text = await response.text();
                    console.warn(`Response Body: ${text}`);
                    break;
                }

                const data = await response.json();

                // Inspect response structure - API returns 'sports' key for events list in this endpoint
                // We map it to 'events' variable for clarity
                const incomingEvents = data.sports || data.events || [];

                if (Array.isArray(incomingEvents)) {
                    allEvents = allEvents.concat(incomingEvents);
                } else {
                    console.warn(`DEBUG: No array found in Page ${page} (Inplay: ${isInplay})`);
                }

                // Check pagination info on First Page
                if (page === 1) {
                    const totalEvents = data.eventsCount || 0;
                    if (totalEvents > 0) {
                        // User Logic: ceil(count / 20)
                        // Example: 27 / 20 = 1.35 -> 2 Pages
                        totalPages = Math.ceil(totalEvents / 20);
                        console.log(`DEBUG: SRL Sync (Inplay: ${isInplay}) -> Found ${totalEvents} events. Pages to fetch: ${totalPages}`);
                    } else {
                        totalPages = 1;
                    }
                }

                page++;

            } while (page <= totalPages);

            // Construct final merged object
            const finalObject = {
                status: "RS_OK",
                eventsCount: allEvents.length,
                events: allEvents
            };

            // Save to DB
            if (isInplay) {
                await SrlInplayCatalogue.findOneAndUpdate(
                    { id: 'srl_inplay' },
                    {
                        id: 'srl_inplay',
                        data: finalObject,
                        lastUpdated: new Date()
                    },
                    { upsert: true, new: true }
                );
            } else {
                await SrlUpcomingCatalogue.findOneAndUpdate(
                    { id: 'srl_upcoming' },
                    {
                        id: 'srl_upcoming',
                        data: finalObject,
                        lastUpdated: new Date()
                    },
                    { upsert: true, new: true }
                );
            }

            console.log(`✅ Saved SRL Events (Inplay: ${isInplay}) - Total: ${allEvents.length}`);

        } catch (error) {
            console.error(`❌ Error syncing SRL Events (Inplay: ${isInplay}):`, error.message);
        }
    },

    getSrlInplayEvents: async () => {
        const record = await SrlInplayCatalogue.findOne({ id: 'srl_inplay' });
        return record ? record.data : { status: "RS_OK", events: [], eventsCount: 0 };
    },

    getSrlUpcomingEvents: async () => {
        const record = await SrlUpcomingCatalogue.findOne({ id: 'srl_upcoming' });
        return record ? record.data : { status: "RS_OK", events: [], eventsCount: 0 };
    },

    /**
     * Starts background sync loop for Full Event Lists (Inplay & Upcoming per Sport).
     * Runs explicitly after the main Inplay/Upcoming loop or independently.
     * For now, we'll hook it into the main startInplaySync loop for efficiency.
     */
    syncFullEventsLists: async () => {
        try {
            // Get all active sports
            const sports = await SportRadarSport.find({ status: 'ACTIVE' });

            // MANUAL TRIGGER FOR TESTING
            service.fetchAndSaveFullEventsList('1', false);

            for (let i = 0; i < sports.length; i++) {
                const sport = sports[i];
                // Stagger calls to avoid rate limits
                await new Promise(resolve => setTimeout(resolve, 500));

                // Sync Inplay List
                await service.fetchAndSaveFullEventsList(sport.sportId, true);

                // Gap
                await new Promise(resolve => setTimeout(resolve, 200));

                // Sync Upcoming List
                await service.fetchAndSaveFullEventsList(sport.sportId, false);
            }
        } catch (error) {
            console.error('❌ Full Events List Sync Error:', error.message);
        }
    },

    /**
     * Fetches Full Events List for a sport with pagination.
     */
    fetchAndSaveFullEventsList: async (sportId, isInplay) => {
        try {
            const targetUrl = 'https://scatalog.mysportsfeed.io/api/v2/core/getevents';
            let allEvents = [];
            let page = 1;
            let totalPages = 1;

            do {
                const payload = {
                    operatorId: process.env.SPORTRADAR_OPERATOR_ID || 'laser247',
                    providerId: 'sportsbook',
                    partnerId: process.env.SPORTRADAR_PARTNER_ID || 'LAPID01',
                    isInplay: isInplay,
                    sportId: sportId,
                    token: process.env.SPORTRADAR_TOKEN || 'c0e509b0-6bc1-4132-80cb-71b54345af12',
                    pageNo: page
                };

                const response = await fetch(targetUrl, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(payload)
                });

                if (!response.ok) {
                    console.warn(`⚠️ Failed to fetch Full List (${sportId}, Page ${page}): ${response.statusText}`);
                    break;
                }

                const data = await response.json();

                // Map 'sports' or 'events' to local var
                const incomingEvents = data.sports || data.events || [];

                if (Array.isArray(incomingEvents)) {
                    allEvents = allEvents.concat(incomingEvents);
                }

                if (page === 1) {
                    const totalEvents = data.eventsCount || 0;
                    if (totalEvents > 0) {
                        totalPages = Math.ceil(totalEvents / 20);
                        // console.log(`DEBUG: Full List Sync (${sportId}, Inplay: ${isInplay}) -> Found ${totalEvents} events. Pages: ${totalPages}`);
                    } else {
                        totalPages = 1;
                    }
                }

                page++;

            } while (page <= totalPages);

            const finalObject = {
                status: "RS_OK",
                eventsCount: allEvents.length,
                events: allEvents
            };

            // Save to correct collection
            const queryId = sportId.startsWith('sr:sport:') ? sportId : `sr:sport:${sportId}`;

            if (isInplay) {
                await SportInplayList.findOneAndUpdate(
                    { sportId: queryId },
                    {
                        sportId: queryId,
                        data: finalObject,
                        lastUpdated: new Date()
                    },
                    { upsert: true, new: true }
                );
            } else {
                await SportUpcomingList.findOneAndUpdate(
                    { sportId: queryId },
                    {
                        sportId: queryId,
                        data: finalObject,
                        lastUpdated: new Date()
                    },
                    { upsert: true, new: true }
                );
            }

            // console.log(`✅ Saved Full List (${sportId}, Inplay: ${isInplay}) - Count: ${allEvents.length}`);

        } catch (error) {
            console.error(`❌ Error syncing Full List (${sportId}):`, error.message);
        }
    },

    getFullInplayList: async (sportId) => {
        let queryId = sportId;
        if (!sportId.startsWith('sr:sport:')) {
            queryId = `sr:sport:${sportId}`;
        }
        const record = await SportInplayList.findOne({ sportId: queryId });
        return record ? record.data : { status: "RS_OK", events: [], eventsCount: 0 };
    },

    getFullUpcomingList: async (sportId) => {
        let queryId = sportId;
        if (!sportId.startsWith('sr:sport:')) {
            queryId = `sr:sport:${sportId}`;
        }
        const record = await SportUpcomingList.findOne({ sportId: queryId });
        return record ? record.data : { status: "RS_OK", events: [], eventsCount: 0 };
    }
};

module.exports = service;
