const { handleProxy, securityHook } = require('../utils/proxy');

async function proxyRoutes(fastify, options) {
    // 1. Security Hook (Shared from utils)
    fastify.addHook('preHandler', securityHook);

    // Cache storage for Game Lobby
    let gameLobbyCache = null;
    let lastCacheTime = 0;
    const CACHE_DURATION = 60 * 1000; // 60 seconds

    // Specific Route for All Game Lobby
    fastify.get('/v1/allgamelobby', { config: { provider: 'aura-casino', apiId: 'game-lobby' } }, async (request, reply) => {
        const now = Date.now();
        if (gameLobbyCache && (now - lastCacheTime < CACHE_DURATION)) {
            // Serve from cache
            return reply.send(gameLobbyCache);
        }

        const targetUrl = 'https://fawk.app/api/data/getGameData?operatorId=8882';

        // We need to capture the proxy response to cache it.
        // handleProxy streams by default, so we'll fetch manually here for caching purposes.
        try {
            const response = await fetch(targetUrl);
            const data = await response.json();

            // Update cache
            gameLobbyCache = data;
            lastCacheTime = now;

            return reply.send(data);
        } catch (error) {
            return handleProxy(request, reply, targetUrl); // Fallback to normal proxy on error
        }
    });

    // Dynamic Route for Aura Casino HTML Streaming
    fastify.get('/v1/auracasino/:gameId', { config: { provider: 'aura-casino', apiId: 'html-streaming' } }, async (request, reply) => {
        const { gameId } = request.params;
        const operatorId = '9999';
        const userId = 'growlingcurlew462';
        const playerToken = 'w2qcsp2gn4r';
        const maskedUrl = `https://d.fawk.app/#/auth/${operatorId}/${userId}/${playerToken}/${gameId}`;

        reply.type('text/html').send(`
            <!DOCTYPE html>
            <html lang="en">
            <head>
                <meta charset="UTF-8">
                <meta name="viewport" content="width=device-width, initial-scale=1.0">
                <title>Aura Casino Streaming</title>
                <style>
                    body, html { margin: 0; padding: 0; height: 100%; width: 100%; overflow: hidden; background-color: #000; }
                    iframe { border: none; width: 100%; height: 100%; }
                </style>
            </head>
            <body>
                <iframe src="${maskedUrl}" allowfullscreen allow="autoplay; encrypted-media"></iframe>
            </body>
            </html>
        `);
    });

    // Dynamic Route for Aura Casino Odds
    fastify.get('/v1/auracasino/odds/:gameId', { config: { provider: 'aura-casino', apiId: 'odds-api' } }, async (request, reply) => {
        const { gameId } = request.params;
        const targetUrl = `https://fawk.app/api/exchange/odds/${gameId}`;
        return handleProxy(request, reply, targetUrl);
    });

    // Route for Aura Casino Exchange Lobby
    fastify.get('/v1/auracasino/exchange/lobby', { config: { provider: 'aura-casino', apiId: 'exchange-lobby' } }, async (request, reply) => {
        const targetUrl = 'https://api.f1ojm.com/api/public/exchange/odds/exchangeGames';
        return handleProxy(request, reply, targetUrl);
    });

    // Dynamic Route for Aura Casino Exchange Event Odds
    fastify.get('/v1/auracasino/exchange/odds/:exchangeId/:gameId', { config: { provider: 'aura-casino', apiId: 'exchange-event-odds' } }, async (request, reply) => {
        const { exchangeId, gameId } = request.params;
        const targetUrl = `https://api.f1ojm.com/api/public/exchange/odds/sma-event/${exchangeId}/${gameId}`;
        return handleProxy(request, reply, targetUrl);
    });

    // Dynamic Route for Aura Casino Past Results
    fastify.get('/v1/auracasino/post_results/:gameId', { config: { provider: 'aura-casino', apiId: 'past-results' } }, async (request, reply) => {
        const { gameId } = request.params;
        const targetUrl = `https://fawk.app/result/past_result?gameId=${gameId}`;
        return handleProxy(request, reply, targetUrl);
    });

    // Dynamic Route for Internal Player Proxy (to hide original URL)
    fastify.get('/v1/auracasino/player/:gameId', { config: { provider: 'aura-casino', apiId: 'player-proxy' } }, async (request, reply) => {
        const { gameId } = request.params;
        const token = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJvcGVyYXRvcklkIjoiOTk5OSIsInVzZXJJZCI6Imdyb3dsaW5nY3VybGV3NDYyIiwidXNlcm5hbWUiOiJncm93bGluZ2N1cmxldzQ2MiIsInBsYXllclRva2VuQXRMYXVuY2giOiJ3MnFjc3AyZ240ciIsInRva2VuIjoidzJxY3NwMmduNHIiLCJiYWxhbmNlIjo4NDE0LjM2LCJleHBvc3VyZSI6MCwiY3VycmVuY3kiOiJJTlIiLCJsYW5ndWFnZSI6ImVuIiwidGltZXN0YW1wIjoiMTc1NjIxODA0NzY0NSIsImNsaWVudElQIjpbIjEiXSwiVklQIjoiMyIsImVycm9yQ29kZSI6MCwiZXJyb3JEZXNjcmlwdGlvbiI6Im9rIiwiaXAiOiIxMDMuMjguMjUyLjEwLCAxMC4yNS4xLjIzMCIsInN5c3RlbVVzZXJJZCI6IjY4YmFjZGZmMTA3ZGE1MGI3ZTMzMmU0MCIsImlhdCI6MTc1NzA3MzQ5NiwiZXhwIjoxNzU3MDg0Mjk2fQ.g_TbJ4YZW0s1pz6Y3fS8mqMtOp0P66mGx6ZJbdLQKEA';
        const targetUrl = `https://player.fawk.app/${token}/${gameId}`;

        try {
            const response = await fetch(targetUrl);
            let html = await response.text();

            // Inject <base> tag to ensure assets load from original domain
            html = html.replace('<head>', '<head><base href="https://player.fawk.app/">');

            // Inject Custom CSS to hide clutter and force proper sizing
            const customCSS = `
            <style>
                body { background-color: #000 !important; overflow: hidden !important; margin: 0 !important; padding: 0 !important; }
                
                /* Hide identified clutter */
                .theo-menu-container, 
                .theo-context-menu, 
                .theo-top-controlbar, 
                .theo-related, 
                .theo-social,
                .vjs-poster,
                .unwanted-clutter,
                .theo-subtitle-options-menu-item,
                .vjs-default-button,
                .theo-settings-control-button,
                .vjs-caption-settings,
                .theo-settings-control-menu,
                .vjs-text-track-settings {
                    display: none !important;
                }

                /* Ensure player fills screen */
                .theoplayer-container {
                    width: 100vw !important;
                    height: 100vh !important;
                    max-width: 100% !important;
                    max-height: 100% !important;
                }
            </style>
            `;
            html = html.replace('</head>', `${customCSS}</head>`);

            reply.type('text/html').send(html);
        } catch (error) {
            reply.code(502).send({ error: 'Player Proxy Error', details: error.message });
        }
    });

    // Catch-all Generic Proxy (Optional, based on previous setup)
    fastify.all('/*', async (request, reply) => {
        const upstreamUrl = process.env.UPSTREAM_API_URL;
        if (!upstreamUrl) {
            return reply.code(404).send({ error: 'Not Found', details: 'No generic upstream configured' });
        }
        const targetUrl = new URL(request.url, upstreamUrl).href;
        return handleProxy(request, reply, targetUrl);
    });
}

module.exports = proxyRoutes;
