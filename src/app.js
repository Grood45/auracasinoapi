const fastify = require('fastify')({ logger: false }); // Disable logger for max speed in prod, enable if needed
const connectDB = require('./services/db');
const RequestLog = require('./models/RequestLog');

const path = require('path');
const fastifyJwt = require('@fastify/jwt');
const fastifyStatic = require('@fastify/static');

// Connect to DB
connectDB();

const Admin = require('./models/Admin');
const Client = require('./models/Client');
const AllowedIP = require('./models/AllowedIP');

// Root Route for Health Check
fastify.get('/', async (request, reply) => {
    return {
        status: 'Online',
        service: 'Aura Casino Proxy API',
        admin_panel: 'http://localhost:5173/v1/admin/dashboard/'
    };
});

// Register JWT
fastify.register(fastifyJwt, {
    secret: process.env.JWT_SECRET || 'aura-proxy-secret-123'
});

// Register Static Files
fastify.register(fastifyStatic, {
    root: path.join(__dirname, 'public'),
    prefix: '/v1/admin/dashboard/'
});

// SPA Fallback for Dashboard - Serve index.html for any 404 under dashboard path
fastify.setNotFoundHandler((request, reply) => {
    if (request.url.startsWith('/v1/admin/dashboard')) {
        return reply.sendFile('index.html');
    }
    reply.code(404).send({ error: 'Not Found', message: `Route ${request.method}:${request.url} not found` });
});

const auracasinoRoutes = require('./routes/auracasino');
const adminRoutes = require('./routes/admin');
const sportsRoutes = require('./routes/sports');
const royalStreamingRoutes = require('./routes/royal-streaming');
const { royalcasinoRoutes } = require('./routes/royalcasino');
const royalService = require('./services/royalcasino.service');
const sportRadarService = require('./services/sport-radar.service');
// Register WebSocket
fastify.register(require('@fastify/websocket'));

// Register Admin Routes
fastify.register(adminRoutes, { prefix: '/v1/admin' });

// Register Sports Routes
fastify.register(sportsRoutes, { prefix: '/v1/sports' });

// Register Royal Streaming Routes
fastify.register(royalStreamingRoutes);

// Register SportRadar Routes
fastify.register(require('./routes/sportradar'), { prefix: '/v1/sportradar' });

// Register Royal Casino API
fastify.register(royalcasinoRoutes);

// Register Proxy Routes (Casino & Generic)
fastify.register(auracasinoRoutes);

// Initial Sync for Royal Casino & SportRadar
fastify.ready().then(() => {
    console.log('🚀 Server ready');

    // Sync Royal Casino (existing)
    // royalService.syncTables()
    //     .then(() => royalService.syncMarkets())
    //     .catch(err => console.error('Initial Royal Sync failed:', err.message));

    // Start SportRadar Sync Engine
    sportRadarService.syncSports() // Initial optional sync
        .then(() => {
            // Once sports are synced, start the event loops
            sportRadarService.startInplaySync(); // Background loop for Inplay/Upcoming/Counts
            sportRadarService.startSrlSync(); // Background loop for SRL
        })
        .catch(err => console.error('Initial SportRadar Sync failed:', err.message));
});


// Database Migration & Seed
const setupDatabase = async () => {
    try {
        // 1. Create default admin if configured
        const adminUser = process.env.ADMIN_USERNAME || 'admin';
        const adminPass = process.env.ADMIN_PASSWORD || 'admin123';

        const adminExists = await Admin.findOne({ username: adminUser });
        if (!adminExists) {
            await Admin.create({ username: adminUser, password: adminPass });
        }

        // 2. Create default client if none exists
        let defaultClient = await Client.findOne({ name: 'Default Client' });
        if (!defaultClient) {
            defaultClient = await Client.create({ name: 'Default Client', whatsapp: '+91' });
        }

        // 3. Fix IPs that don't have a clientId (Migration)
        await AllowedIP.updateMany(
            { clientId: { $exists: false } },
            { clientId: defaultClient._id }
        );
    } catch (err) {
        // Handle duplicate key error (code 11000) gracefully when multiple workers seed at once
        if (err.code !== 11000) {
            console.error('Database setup error:', err);
        }
    }
};
setupDatabase();

// Run the server!
const start = async () => {
    try {
        const PORT = process.env.PORT || 3000;
        await fastify.listen({ port: PORT, host: '0.0.0.0' });
        // console.log(`Worker ${process.pid} listening on ${PORT}`);
    } catch (err) {
        fastify.log.error(err);
        process.exit(1);
    }
};

start();
