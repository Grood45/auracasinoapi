// WebSocket handling logic - Shared Connection Pattern
const WebSocket = require('ws');
const RoyalCasino = require('../models/RoyalCasino');
const { securityHook, handleProxy } = require('../utils/proxy');

// Map to store active upstream connections
// Key: "gameId:tableId"
// Value: { providerSocket: WebSocket, clients: Set<WebSocket> }
const connections = new Map();

async function royalcasinoRoutes(fastify, options) {
    // Apply default security hook to all routes
    fastify.addHook('preHandler', securityHook);

    /**
    /**
     * 1. SHARED WebSocket Proxy Route
     * URL: /v1/royal/ws/:gameId/:tableId
     * Config: skipIPCheck: true (Requested by user for initial testing)
     * UPDATE: Added provider check, but skipping IP for now as per legacy config unless strict mode desired.
     * Let's enforce provider check but keep skipIPCheck if originally requested, or remove skipIPCheck?
     * User want STRICT checks now. So likely we should remove skipIPCheck OR ensure provider check passes.
     * The securityHook logic checks skipIPCheck first. If I want strict provider check, I must remove skipIPCheck OR modify logic.
     * I will remove skipIPCheck and rely on standard flow which checks IP + Provider.
     */
    fastify.get('/v1/royal/ws/:gameId/:tableId', { websocket: true, config: { provider: 'royal-gaming', apiId: 'websocket' } }, (connection, request) => {
        const { gameId, tableId } = request.params;
        const key = `${gameId}:${tableId}`;
        const clientSocket = connection.socket;

        console.log(`🔌 [WS PROXY] New client joining: ${key} (IP Check Skipped)`);

        // A. If connection for this table doesn't exist, create it
        if (!connections.has(key)) {
            const upstreamUrl = `wss://ws.rgcbe2025.co/cgp-ws2/RGONLINE:${gameId}:${tableId}`;
            console.log(`🔗 [WS PROXY] Opening NEW Upstream connection for: ${key}`);

            const providerSocket = new WebSocket(upstreamUrl);
            const clients = new Set();

            const connData = { providerSocket, clients };
            connections.set(key, connData);

            // Set up Provider Socket Event Listeners
            providerSocket.on('open', () => {
                console.log(`✅ [WS PROXY] Provider Connected for: ${key}`);
                // Simple keep-alive
                providerSocket._pinger = setInterval(() => {
                    if (providerSocket.readyState === WebSocket.OPEN) providerSocket.ping();
                }, 30000);
            });

            providerSocket.on('message', (data) => {
                const current = connections.get(key);
                if (!current) return;

                // Broadcast raw provider data to all connected clients
                current.clients.forEach(client => {
                    if (client.readyState === WebSocket.OPEN) {
                        client.send(data);
                    }
                });
            });

            providerSocket.on('error', (err) => {
                console.error(`❌ [WS PROXY] Provider Error (${key}):`, err.message);
                const current = connections.get(key);
                if (current) {
                    current.clients.forEach(c => {
                        if (c.readyState === WebSocket.OPEN) {
                            c.send(JSON.stringify({ error: 'Provider connection error', details: err.message }));
                            c.close();
                        }
                    });
                    connections.delete(key);
                    if (providerSocket._pinger) clearInterval(providerSocket._pinger);
                }
            });

            providerSocket.on('close', () => {
                console.log(`⚠️ [WS PROXY] Provider closed connection for: ${key}`);
                const current = connections.get(key);
                if (current) {
                    current.clients.forEach(c => c.close());
                    connections.delete(key);
                    if (providerSocket._pinger) clearInterval(providerSocket._pinger);
                }
            });
        }

        // B. Add this client to the shared connection's client set
        const activeConn = connections.get(key);
        activeConn.clients.add(clientSocket);

        // Send welcome message if needed (simulating user's snippet)
        clientSocket.send(JSON.stringify({ status: "success", message: `Joined table ${tableId} proxy` }));

        // C. Client Event Listeners
        clientSocket.on('message', (msg) => {
            // Forward client messages (commands) to upstream
            const current = connections.get(key);
            if (current && current.providerSocket.readyState === WebSocket.OPEN) {
                current.providerSocket.send(msg);
            }
        });

        clientSocket.on('close', () => {
            console.log(`🔌 [WS PROXY] Client left: ${key}`);
            const current = connections.get(key);
            if (current) {
                current.clients.delete(clientSocket);

                // D. Auto Cleanup: If no clients left, close upstream too
                if (current.clients.size === 0) {
                    console.log(`🧹 [WS PROXY] No clients left for ${key}. Cleaning up upstream.`);
                    if (current.providerSocket._pinger) clearInterval(current.providerSocket._pinger);
                    current.providerSocket.terminate();
                    connections.delete(key);
                }
            }
        });

        clientSocket.on('error', (err) => {
            console.warn(`⚠️ [WS PROXY] Client socket error on ${key}: ${err.message}`);
        });
    });

    // --- Standard HTTP Routes Below (Maintained for sync/info) ---

    // Cache state
    let tablesCache = null;
    let tablesCacheTime = 0;

    // Key: "gameId:tableId", Value: { data, timestamp }
    const marketsCache = new Map();

    const SHORT_CACHE_DURATION = 30 * 1000; // 30 seconds

    // GET tables from MongoDB cache (with Memory Cache Layer)
    fastify.get('/v1/royal/tables', { config: { provider: 'royal-gaming', apiId: 'table-list' } }, async (request, reply) => {
        const now = Date.now();
        if (tablesCache && (now - tablesCacheTime < SHORT_CACHE_DURATION)) {
            return tablesCache;
        }

        try {
            const tableData = await RoyalCasino.findOne({ type: 'tables' });
            if (!tableData) return reply.code(404).send({ error: 'Tables not synced' });

            // Update Cache
            tablesCache = tableData.data;
            tablesCacheTime = now;

            return tableData.data;
        } catch (err) {
            return reply.code(500).send({ error: 'Internal Error' });
        }
    });

    // GET markets from MongoDB cache (with Memory Cache Layer)
    fastify.get('/v1/royal/markets', { config: { provider: 'royal-gaming', apiId: 'market-list' } }, async (request, reply) => {
        const { gameId, tableId } = request.query;
        if (!gameId || !tableId) return reply.code(400).send({ error: 'Missing params' });

        const cacheKey = `${gameId}:${tableId}`;
        const now = Date.now();

        if (marketsCache.has(cacheKey)) {
            const cached = marketsCache.get(cacheKey);
            if (now - cached.timestamp < SHORT_CACHE_DURATION) {
                return cached.data;
            }
        }

        try {
            const marketData = await RoyalCasino.findOne({ type: 'markets', gameId, tableId });
            if (!marketData) return reply.code(404).send({ error: 'Markets not synced' });

            // Update Cache
            marketsCache.set(cacheKey, { data: marketData.data, timestamp: now });

            // Prevent cache from growing indefinitely (Optional basic cleanup)
            if (marketsCache.size > 1000) marketsCache.clear();

            return marketData.data;
        } catch (err) {
            return reply.code(500).send({ error: 'Internal Error' });
        }
    });

    // Proxy for Round Result Details
    fastify.get('/v1/royal/round-result', { config: { provider: 'royal-gaming', apiId: 'round-result' } }, async (request, reply) => {
        const { gameId, tableId, roundId } = request.query;
        if (!gameId || !tableId || !roundId) return reply.code(400).send({ error: 'Missing params' });
        const targetUrl = 'https://api.rgcbe2025.co/api/v1/core/round-result-details';
        const body = { ProviderId: 'RGONLINE', gameId, TableId: tableId, roundID: roundId };
        return handleProxy(request, reply, targetUrl, 'POST', body);
    });

    // Health Check
    fastify.get('/v1/royal/info', async (request, reply) => {
        return {
            status: 'ok',
            service: 'Royal Gaming Shared Proxy',
            activeConnections: Array.from(connections.keys()),
            stats: Array.from(connections.entries()).map(([k, v]) => ({ table: k, clients: v.clients.size }))
        };
    });
}

module.exports = { royalcasinoRoutes };
