const { handleProxy, securityHook } = require('../utils/proxy');

async function sportsRoutes(fastify, options) {
    // Register the same security hook for all sports routes
    fastify.addHook('preHandler', securityHook);

    // Cache state
    let sportsListCache = null;
    let sportsListTime = 0;

    let allEventsCache = null;
    let allEventsTime = 0;

    const CACHE_DURATION = 60 * 1000; // 60 seconds

    // Sports API: Sports List (POST converted to GET)
    fastify.get('/list', { config: { provider: 'king-exchange', apiId: 'sports-list' } }, async (request, reply) => {
        const now = Date.now();
        if (sportsListCache && (now - sportsListTime < CACHE_DURATION)) {
            return reply.send(sportsListCache);
        }

        const targetUrl = 'https://playsport09.com/api/exchange/sports/sportsList';
        try {
            const response = await fetch(targetUrl, { method: 'POST' });
            const data = await response.json();
            sportsListCache = data;
            sportsListTime = now;
            return reply.send(data);
        } catch (error) {
            return handleProxy(request, reply, targetUrl, 'POST');
        }
    });

    // Sports API: All Events (POST converted to GET with fixed body)
    fastify.get('/all-events', { config: { provider: 'king-exchange', apiId: 'all-events' } }, async (request, reply) => {
        const now = Date.now();
        if (allEventsCache && (now - allEventsTime < CACHE_DURATION)) {
            return reply.send(allEventsCache);
        }

        const targetUrl = 'https://playsport09.com/api/exchange/market/matchodds/allEventsList';
        try {
            const response = await fetch(targetUrl, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ key: '2' })
            });
            const data = await response.json();
            allEventsCache = data;
            allEventsTime = now;
            return reply.send(data);
        } catch (error) {
            return handleProxy(request, reply, targetUrl, 'POST', { key: '2' });
        }
    });

    // Sports API: Event Results (Path-based)
    fastify.get('/event-results/:eventId', { config: { provider: 'king-exchange', apiId: 'event-results' } }, async (request, reply) => {
        const eventId = request.params.eventId || request.query.eventId;
        if (!eventId) {
            return reply.code(400).send({ error: 'Please provide eventId' });
        }
        const targetUrl = 'https://playsport09.com/api/exchange/results/getMarketEventResults';
        return handleProxy(request, reply, targetUrl, 'POST', { eventId });
    });

    // Sports API: Event Results (Query-based flexibilitiy)
    fastify.get('/event-results', { config: { provider: 'king-exchange', apiId: 'event-results' } }, async (request, reply) => {
        const eventId = request.query.eventId;
        if (!eventId) {
            return reply.code(400).send({ error: 'Please provide eventId' });
        }
        const targetUrl = 'https://playsport09.com/api/exchange/results/getMarketEventResults';
        return handleProxy(request, reply, targetUrl, 'POST', { eventId });
    });

    // Sports API: Fancy Markets
    fastify.get('/fancy-markets', { config: { provider: 'king-exchange', apiId: 'fancy-markets' } }, async (request, reply) => {
        const targetUrl = 'https://playsport09.com/api/exchange/markets/fancyMarketList';
        return handleProxy(request, reply, targetUrl, 'POST', { key: '2' });
    });

    // Sports API: Ball By Ball (Alternative Path-based route)
    fastify.get('/ball-by-ball/:sportId/:eventId', { config: { provider: 'king-exchange', apiId: 'ball-by-ball' } }, async (request, reply) => {
        const { sportId, eventId } = request.params;
        if (!eventId || !sportId) {
            return reply.code(400).send({ error: 'Please provide eventId and sportId' });
        }
        const targetUrl = 'https://playsport09.com/api/exchange/markets/getBallByBallMarket';
        return handleProxy(request, reply, targetUrl, 'POST', { eventId, sportId, key: '2' });
    });

    // Sports API: Ball By Ball (Query-based)
    fastify.get('/ball-by-ball', { config: { provider: 'king-exchange', apiId: 'ball-by-ball' } }, async (request, reply) => {
        const { eventId, sportId } = request.query;
        if (!eventId || !sportId) {
            return reply.code(400).send({ error: 'Please provide eventId and sportId' });
        }
        const targetUrl = 'https://playsport09.com/api/exchange/markets/getBallByBallMarket';
        return handleProxy(request, reply, targetUrl, 'POST', { eventId, sportId, key: '2' });
    });

    // Sports API: Event Markets List (Path-based)
    fastify.get('/event-markets/:sportId/:eventId', { config: { provider: 'king-exchange', apiId: 'event-markets' } }, async (request, reply) => {
        const { sportId, eventId } = request.params;
        if (!eventId || !sportId) {
            return reply.code(400).send({ error: 'Please provide eventId and sportId' });
        }
        const targetUrl = 'https://playsport09.com/api/exchange/markets/getMarketsEventList';
        return handleProxy(request, reply, targetUrl, 'POST', { eventId, sportId, key: '2' });
    });

    // Sports API: Event Markets List (Query-based)
    fastify.get('/event-markets', { config: { provider: 'king-exchange', apiId: 'event-markets' } }, async (request, reply) => {
        const { eventId, sportId } = request.query;
        if (!eventId || !sportId) {
            return reply.code(400).send({ error: 'Please provide eventId and sportId' });
        }
        const targetUrl = 'https://playsport09.com/api/exchange/markets/getMarketsEventList';
        return handleProxy(request, reply, targetUrl, 'POST', { eventId, sportId, key: '2' });
    });

    // Sports API: Lottery Markets List
    fastify.get('/lottery-list', { config: { provider: 'king-exchange', apiId: 'lottery-list' } }, async (request, reply) => {
        const targetUrl = 'https://playsport09.com/api/exchange/sports/lotterySportsList';
        return handleProxy(request, reply, targetUrl, 'POST', { key: '2' });
    });

    // Sports API: Racing Events
    fastify.get('/racing-events', { config: { provider: 'king-exchange', apiId: 'racing-events' } }, async (request, reply) => {
        const targetUrl = 'https://playsport09.com/api/exchange/events/racingEventsList';
        return handleProxy(request, reply, targetUrl, 'POST', { key: '2' });
    });
}

module.exports = sportsRoutes;
