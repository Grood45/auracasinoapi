const sportRadarService = require('../services/sport-radar.service');
const { securityHook } = require('../utils/proxy');
const RequestLog = require('../models/RequestLog');
const Client = require('../models/Client');
const AllowedIP = require('../models/AllowedIP');

async function sportRadarRoutes(fastify, options) {

    // 1. Apply Security Hook (IP Allowlist Check)
    fastify.addHook('preHandler', securityHook);

    // 2. Apply Custom Logging Hook (To see logs in Admin Panel)
    fastify.addHook('onResponse', async (request, reply) => {
        const responseTime = reply.getResponseTime();
        const clientIp = request.headers['x-forwarded-for'] || request.ip || request.socket.remoteAddress;

        // Log to MongoDB
        try {
            await RequestLog.create({
                clientIp,
                endpoint: request.url,
                method: request.method,
                userAgent: request.headers['user-agent'],
                statusCode: reply.statusCode,
                responseTime,
                clientId: request.clientData ? request.clientData._id : null,
                status: reply.statusCode >= 400 ? 'error' : 'allowed',
                targetUrl: 'internal' // It's an internal DB hit, not a proxy
            });

            // Update Hit Counts
            if (request.clientData) {
                await Client.findByIdAndUpdate(request.clientData._id, {
                    $inc: { totalHitsToday: 1, monthlyHits: 1 }
                });
            }
            if (request.allowedIpData) {
                await AllowedIP.findByIdAndUpdate(request.allowedIpData._id, {
                    $inc: { hitsToday: 1 }
                });
            }

        } catch (err) {
            console.error('SportRadar Logging Failed:', err.message);
        }
    });

    // --- Endpoints ---

    // GET /v1/sportradar/sports
    // Serves data locally from MongoDB
    fastify.get('/sports', { config: { provider: 'sportradar', apiId: 'sports-list' } }, async (request, reply) => {
        try {
            const data = await sportRadarService.getAllSports();
            return reply.send(data);
        } catch (error) {
            fastify.log.error(error);
            return reply.code(500).send({ error: 'Failed to fetch sports list from DB', details: error.message });
        }
    });

    // GET /v1/sportradar/inplay-catalogues/:sportId
    // Serves cached events from MongoDB
    fastify.get('/inplay-catalogues/:sportId', { config: { provider: 'sportradar', apiId: 'inplay-catalogues' } }, async (request, reply) => {
        try {
            const { sportId } = request.params;
            const data = await sportRadarService.getInplayCatalogue(sportId);
            return reply.send(data);
        } catch (error) {
            fastify.log.error(error);
            return reply.code(500).send({ error: 'Failed to fetch events', details: error.message });
        }
    });

    // GET /v1/sportradar/upcoming-catalogues/:sportId
    // Serves cached upcoming events from MongoDB
    fastify.get('/upcoming-catalogues/:sportId', { config: { provider: 'sportradar', apiId: 'upcoming-catalogues' } }, async (request, reply) => {
        try {
            const { sportId } = request.params;
            const data = await sportRadarService.getUpcomingCatalogue(sportId);
            return reply.send(data);
        } catch (error) {
            fastify.log.error(error);
            return reply.code(500).send({ error: 'Failed to fetch events', details: error.message });
        }
    });

    // GET /v1/sportradar/event-counts
    // Serves cached event counts from MongoDB
    fastify.get('/event-counts', { config: { provider: 'sportradar', apiId: 'event-counts' } }, async (request, reply) => {
        try {
            const data = await sportRadarService.getEventCounts();
            return reply.send(data);
        } catch (error) {
            fastify.log.error(error);
            return reply.code(500).send({ error: 'Failed to fetch event counts', details: error.message });
        }
    });

    // GET /v1/sportradar/markets/:sportId/:eventId
    // Uses In-Memory Cache & Deduplication (1 sec TTL)
    fastify.get('/markets/:sportId/:eventId', { config: { provider: 'sportradar', apiId: 'market-odds' } }, async (request, reply) => {
        try {
            const { sportId, eventId } = request.params;

            // Handle "sr:sport:" prefix if missing, though typically passed in URL encoded or raw
            // User requested: "sr:sport:21"
            let finalSportId = sportId;
            if (!sportId.startsWith('sr:sport:') && /^\d+$/.test(sportId)) {
                finalSportId = `sr:sport:${sportId}`;
            }

            let finalEventId = eventId;
            // User requested: "sr:match:57803781"
            if (!eventId.startsWith('sr:match:') && /^\d+$/.test(eventId)) {
                finalEventId = `sr:match:${eventId}`;
            }

            const data = await sportRadarService.getEventMarkets(finalSportId, finalEventId);
            return reply.send(data);
        } catch (error) {
            fastify.log.error(error);
            return reply.code(500).send({ error: 'Failed to fetch markets', details: error.message });
        }
    });

    // GET /v1/sportradar/betfair-markets/:sportId/:eventId
    // Targets api.mysportsfeed.io with deduplication
    fastify.get('/betfair-markets/:sportId/:eventId', { config: { provider: 'sportradar', apiId: 'market-odds' } }, async (request, reply) => {
        try {
            const { sportId, eventId } = request.params;
            // No prefix logic needed here as per user request (IDs like "4", "33973450")

            const data = await sportRadarService.getBetfairMarkets(sportId, eventId);
            return reply.send(data);
        } catch (error) {
            fastify.log.error(error);
            return reply.code(500).send({ error: 'Failed to fetch betfair markets', details: error.message });
        }
    });

    // GET /v1/sportradar/srl/inplay
    fastify.get('/srl/inplay', { config: { provider: 'sportradar', apiId: 'srl-inplay' } }, async (request, reply) => {
        try {
            const data = await sportRadarService.getSrlInplayEvents();
            return reply.send(data);
        } catch (error) {
            fastify.log.error(error);
            return reply.code(500).send({ error: 'Failed to fetch SRL inplay events', details: error.message });
        }
    });

    // GET /v1/sportradar/srl/upcoming
    fastify.get('/srl/upcoming', { config: { provider: 'sportradar', apiId: 'srl-upcoming' } }, async (request, reply) => {
        try {
            const data = await sportRadarService.getSrlUpcomingEvents();
            return reply.send(data);
        } catch (error) {
            fastify.log.error(error);
            return reply.code(500).send({ error: 'Failed to fetch SRL upcoming events', details: error.message });
        }
    });

    // NEW: Full Paginated List Endpoints

    // GET /v1/sportradar/full_eventlist/inplay/:sportId
    fastify.get('/full_eventlist/inplay/:sportId', { config: { provider: 'sportradar', apiId: 'full-inplay-list' } }, async (request, reply) => {
        try {
            const { sportId } = request.params;
            // User sends "1", internally we need "sr:sport:1" or pass as is if service handles it
            // Service handles consistency, but let's standardize here for safety
            let finalSportId = sportId;
            if (!sportId.startsWith('sr:sport:') && /^\d+$/.test(sportId)) {
                finalSportId = `sr:sport:${sportId}`;
            }

            const data = await sportRadarService.getFullInplayList(finalSportId);
            return reply.send(data);
        } catch (error) {
            fastify.log.error(error);
            return reply.code(500).send({ error: 'Failed to fetch Full Inplay List', details: error.message });
        }
    });

    // GET /v1/sportradar/full_eventlist/upcoming/:sportId
    fastify.get('/full_eventlist/upcoming/:sportId', { config: { provider: 'sportradar', apiId: 'full-upcoming-list' } }, async (request, reply) => {
        try {
            const { sportId } = request.params;
            let finalSportId = sportId;
            if (!sportId.startsWith('sr:sport:') && /^\d+$/.test(sportId)) {
                finalSportId = `sr:sport:${sportId}`;
            }

            const data = await sportRadarService.getFullUpcomingList(finalSportId);
            return reply.send(data);
        } catch (error) {
            fastify.log.error(error);
            return reply.code(500).send({ error: 'Failed to fetch Full Upcoming List', details: error.message });
        }
    });

    // NEW: Virtual Cricket Proxy (Hides Request URL)
    // Upstream: https://vgpclive-vs001.akamaized.net/uof-entry-point/stable/dist/index.html?clientid=4418&lang=en&focusmatchid=13832&layout=lmt&sport=vci&product=vci&environment=production

    // 1. Register Proxy Plugin
    fastify.register(require('@fastify/reply-from'), {
        base: 'https://vgpclive-vs001.akamaized.net',
        http2: false
    });

    // 2. The Proxy Route (Simplified & Functional)
    // Usage: /v1/sportradar/virtual-cricket/
    fastify.get('/virtual-cricket/*', { config: { provider: 'sportradar', apiId: 'virtual-cricket' } }, (request, reply) => {
        const prefix = '/v1/sportradar/virtual-cricket';
        // Strip prefix and separate path vs query
        // Example: /v1/sportradar/virtual-cricket/live?foo=bar -> relativePath: /live
        const parts = request.url.replace(prefix, '').split('?');
        const relativePath = parts[0];
        const queryString = parts.length > 1 ? parts[1] : '';




        // 1. Landing Page (Root) -> Serve Wrapper HTML with Iframe
        // This keeps the Browser URL clean while loading the parameterized stream internally
        if (relativePath === '' || relativePath === '/' || relativePath === '/index.html') {
            // If it's a direct index.html request WITHOUT params, serve wrapper.
            // If it HAS params (internal iframe req), proxy it? 
            // Better to split them: Root -> Wrapper. /live -> Stream.

            // Hardcoded Params for the internal stream
            const internalParams = 'clientid=4418&lang=en&focusmatchid=13832&layout=lmt&sport=vci&product=vci&environment=production';

            return reply.type('text/html').send(`
                <!DOCTYPE html>
                <html lang="en">
                <head>
                    <meta charset="UTF-8">
                    <meta name="viewport" content="width=device-width, initial-scale=1.0">
                    <title>Virtual Cricket</title>
                    <style>body,html{margin:0;padding:0;height:100%;overflow:hidden;background:#000;}</style>
                </head>
                <body>
                    <iframe src="${prefix}/live?${internalParams}" 
                            width="100%" height="100%" frameborder="0" 
                            allow="autoplay; encrypted-media; fullscreen"
                            title="Virtual Cricket Stream"></iframe>
                </body>
                </html>
            `);
        }

        // 2. The Internal Stream Page (Proxied Index with Params)
        if (relativePath === '/live') {
            const upstreamPath = `/uof-entry-point/stable/dist/index.html?${queryString}`;

            // Rewrite header to avoid 403 (Akamai/S3 checks Host header)
            return reply.from(upstreamPath, {
                rewriteRequestHeaders: (originalReq, headers) => {
                    return { ...headers, host: 'vgpclive-vs001.akamaized.net' };
                }
            });
        }

        // 3. Asset Proxying (JS, CSS, etc.)
        // Upstream assets are at /dist/asset.js. Our relativePath is /asset.js
        const upstreamPath = `/uof-entry-point/stable/dist${relativePath}`;
        return reply.from(upstreamPath, {
            rewriteRequestHeaders: (originalReq, headers) => {
                return { ...headers, host: 'vgpclive-vs001.akamaized.net' };
            }
        });
    });








    // NEW: Virtual Basketball Proxy
    // Usage: /v1/sportradar/virtual-basketball/
    fastify.get('/virtual-basketball/*', { config: { provider: 'sportradar', apiId: 'virtual-basketball' } }, (request, reply) => {
        const prefix = '/v1/sportradar/virtual-basketball';
        const parts = request.url.replace(prefix, '').split('?');
        const relativePath = parts[0];
        const queryString = parts.length > 1 ? parts[1] : '';

        // 1. Landing Page (Root)
        if (relativePath === '' || relativePath === '/' || relativePath === '/index.html') {
            const internalParams = 'clientid=4418&lang=en&focusmatchid=13832&layout=lmt&sport=vbi&product=vbi&environment=production';

            return reply.type('text/html').send(`
                <!DOCTYPE html>
                <html lang="en">
                <head>
                    <meta charset="UTF-8">
                    <meta name="viewport" content="width=device-width, initial-scale=1.0">
                    <title>Virtual Basketball</title>
                    <style>body,html{margin:0;padding:0;height:100%;overflow:hidden;background:#000;}</style>
                </head>
                <body>
                    <iframe src="${prefix}/live?${internalParams}" 
                            width="100%" height="100%" frameborder="0" 
                            allow="autoplay; encrypted-media; fullscreen"
                            title="Virtual Basketball Stream"></iframe>
                </body>
                </html>
            `);
        }

        // 2. The Internal Stream Page (Proxied Index with Params)
        if (relativePath === '/live') {
            const upstreamPath = `/uof-entry-point/stable/dist/index.html?${queryString}`;
            return reply.from(upstreamPath, {
                rewriteRequestHeaders: (originalReq, headers) => {
                    return { ...headers, host: 'vgpclive-vs001.akamaized.net' };
                }
            });
        }

        // 3. Asset Proxying
        const upstreamPath = `/uof-entry-point/stable/dist${relativePath}`;
        return reply.from(upstreamPath, {
            rewriteRequestHeaders: (originalReq, headers) => {
                return { ...headers, host: 'vgpclive-vs001.akamaized.net' };
            }
        });
    });

}

module.exports = sportRadarRoutes;
