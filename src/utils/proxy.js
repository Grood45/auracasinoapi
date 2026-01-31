const RequestLog = require('../models/RequestLog');
const AllowedIP = require('../models/AllowedIP');
const Client = require('../models/Client');
const { setGlobalDispatcher, Agent } = require('undici');

// 🚀 HIGH PERFORMANCE: Connection Pooling
// This keeps the tunnel open to fawk.app, drastically reducing latency.
const agent = new Agent({
    keepAliveTimeout: 15000,
    connections: 1000, // massive concurrency support
    pipelining: 0,
    connectTimeout: 5000,
    bodyTimeout: 5000,
});
setGlobalDispatcher(agent);

// Helper to broadcast logs to Admin UI via WebSocket
const broadcastLog = (server, log) => {
    if (server?.websocketServer?.clients) {
        const message = JSON.stringify({ type: 'NEW_LOG', data: log });
        server.websocketServer.clients.forEach(client => {
            if (client.readyState === 1) { // WebSocket.OPEN
                client.send(message);
            }
        });
    }
};

// Helper to block and log
const blockRequest = (request, reply, clientIp, reason, statusType) => {
    // Increment Blocked Stats in background (non-blocking)
    if (request.clientData) {
        Client.findByIdAndUpdate(request.clientData._id, { $inc: { totalBlockedToday: 1 } }).catch(err => console.error('Stats update failed', err));
    }
    if (request.allowedIpData) {
        AllowedIP.findByIdAndUpdate(request.allowedIpData._id, { $inc: { blockedToday: 1 } }).catch(err => console.error('Stats update failed', err));
    }

    // Log Blocked Attempt in background (non-blocking)
    RequestLog.create({
        clientIp,
        endpoint: request.url,
        method: request.method,
        userAgent: request.headers['user-agent'],
        statusCode: 403,
        status: statusType,
        clientId: request.clientData ? request.clientData._id : null
    }).then(log => {
        // Broadcast to Admin UI
        broadcastLog(request.server, log);
    }).catch(err => console.error('Blocked Logging failed', err));

    // Check if client expects JSON (e.g., Postman, API tools)
    const accept = request.headers['accept'] || '';
    if (accept.includes('application/json') || !request.headers['user-agent']?.includes('Mozilla')) {
        return reply.code(403).send({
            status: false,
            error: 'Access Restricted',
            message: reason,
            ip: clientIp,
            support: 'WhatsApp: +917982720942'
        });
    }

    // Return beautiful HTML for browsers
    return reply.code(403).type('text/html').send(`
        <!DOCTYPE html>
        <html lang="en">
        <head>
            <meta charset="UTF-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <title>Access Restricted | Aura Casino</title>
            <link href="https://fonts.googleapis.com/css2?family=Outfit:wght@300;400;600&display=swap" rel="stylesheet">
            <style>
                :root { --primary: #25d366; --error: #ff4757; --bg: #0f172a; --card-bg: rgba(30, 41, 59, 0.7); --text: #f8fafc; }
                body, html { margin: 0; padding: 0; min-height: 100vh; font-family: 'Outfit', sans-serif; background: radial-gradient(circle at top left, #1e293b, #0f172a); display: flex; align-items: center; justify-content: center; color: var(--text); }
                .container { max-width: 500px; width: 90%; background: var(--card-bg); backdrop-filter: blur(12px); border: 1px solid rgba(255, 255, 255, 0.1); padding: 40px; border-radius: 24px; text-align: center; box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.5); }
                .icon-box { width: 80px; height: 80px; background: rgba(255, 71, 87, 0.1); border-radius: 20px; display: flex; align-items: center; justify-content: center; margin: 0 auto 24px; }
                .icon-box svg { width: 40px; height: 40px; fill: var(--error); }
                h1 { font-weight: 600; margin: 0 0 12px; font-size: 28px; letter-spacing: -0.02em; }
                p { color: #94a3b8; line-height: 1.6; margin-bottom: 24px; font-size: 16px; }
                .reason { color: var(--error); font-weight: 600; margin-bottom: 10px; }
                .ip-badge { background: rgba(255, 255, 255, 0.05); padding: 12px 20px; border-radius: 12px; font-family: monospace; font-size: 15px; color: #cbd5e1; margin-bottom: 32px; border: 1px solid rgba(255, 255, 255, 0.05); display: inline-block; }
                .btn { display: flex; align-items: center; justify-content: center; gap: 10px; background: var(--primary); color: #000; padding: 14px 28px; text-decoration: none; border-radius: 14px; font-weight: 600; transition: all 0.3s ease; box-shadow: 0 10px 15px -3px rgba(37, 211, 102, 0.3); }
                .btn:hover { transform: translateY(-2px); box-shadow: 0 20px 25px -5px rgba(37, 211, 102, 0.4); opacity: 0.9; }
                .footer { margin-top: 24px; font-size: 13px; color: #64748b; }
            </style>
        </head>
        <body>
            <div class="container">
                <div class="icon-box"><svg viewBox="0 0 24 24"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-2h2v2zm0-4h-2V7h2v6z"/></svg></div>
                <h1>Access Restricted</h1>
                <div class="reason">${reason}</div>
                <p>Your access is restricted. Please contact the API owner to authorize your access.</p>
                <div class="ip-badge">Your IP: ${clientIp}</div>
                <a href="https://wa.me/917982720942" class="btn">Contact via WhatsApp</a>
                <div class="footer">Aura Casino Security Gateway v1.2</div>
            </div>
        </body>
        </html>
    `);
};

// Main proxy logic
const handleProxy = async (request, reply, targetUrl, methodOverride = null, bodyOverride = null) => {
    const clientIp = request.headers['x-forwarded-for'] || request.ip || request.socket.remoteAddress;
    const method = methodOverride || request.method;
    const startTime = Date.now();

    try {
        const headers = { ...request.headers };
        delete headers.host;
        delete headers['content-length'];
        delete headers['connection'];

        if (method !== 'GET' && method !== 'HEAD') {
            headers['content-type'] = 'application/json';
        }

        const controller = new AbortController();
        // Fail fast: 5 seconds timeout instead of 30s to prevent request pile-up
        const timeoutId = setTimeout(() => controller.abort(), 5000);

        const requestBody = method !== 'GET' && method !== 'HEAD' ? (bodyOverride || request.body || {}) : {};

        const upstreamResponse = await fetch(targetUrl, {
            method: method,
            headers: headers,
            body: method !== 'GET' && method !== 'HEAD' ? JSON.stringify(requestBody) : undefined,
            signal: controller.signal
        });

        clearTimeout(timeoutId);
        const responseTime = Date.now() - startTime;

        const buffer = await upstreamResponse.arrayBuffer();
        let responseBody = null;
        try {
            const textDecoder = new TextDecoder('utf-8');
            const responseText = textDecoder.decode(buffer);
            // Try to parse as JSON for cleaner logging, otherwise keep as string
            try {
                responseBody = JSON.parse(responseText);
            } catch (e) {
                responseBody = responseText; // fallback to string (html/text)
            }
        } catch (err) {
            responseBody = '[Binary or Unparseable Data]';
        }

        RequestLog.create({
            clientIp,
            endpoint: request.url,
            method,
            userAgent: request.headers['user-agent'],
            statusCode: upstreamResponse.status,
            responseTime,
            clientId: request.clientData ? request.clientData._id : null,
            status: 'allowed',
            targetUrl,
            requestBody,
            responseBody
        }).then(log => {
            // Broadcast to Admin UI
            broadcastLog(request.server, log);
        }).catch(err => console.error('Logging failed', err));

        if (request.clientData) {
            Client.findByIdAndUpdate(request.clientData._id, { $inc: { totalHitsToday: 1, monthlyHits: 1 } }).catch(err => console.error('Stats update failed', err));
        }
        if (request.allowedIpData) {
            AllowedIP.findByIdAndUpdate(request.allowedIpData._id, { $inc: { hitsToday: 1 } }).catch(err => console.error('Stats update failed', err));
        }

        reply.code(upstreamResponse.status);

        upstreamResponse.headers.forEach((value, key) => {
            if (key.toLowerCase() !== 'transfer-encoding' && key.toLowerCase() !== 'content-encoding') {
                reply.header(key, value);
            }
        });

        reply.header('Access-Control-Allow-Origin', '*');
        reply.header('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
        reply.header('Access-Control-Allow-Headers', 'Content-Type, Authorization');

        return Buffer.from(buffer);

    } catch (error) {
        if (error.name === 'AbortError') {
            return reply.code(504).send({ error: 'Gateway Timeout', message: 'Upstream server took too long to respond' });
        }
        request.log.error(error);
        reply.code(502).send({ error: 'Bad Gateway', details: error.message });
    }
};

// Security check hook logic
const securityHook = async (request, reply) => {
    // Skip if explicitly marked or for Admin Panel/Heartbeats
    // Also skip if the route configuration has skipIPCheck set to true (e.g., for testing sockets)
    if (
        request.skipSecurity ||
        (request.url && request.url.startsWith('/v1/admin')) ||
        (request.routeOptions && request.routeOptions.config && request.routeOptions.config.skipIPCheck)
    ) {
        if (request.routeOptions?.config?.skipIPCheck) {
            // console.log(`🔓 [SECURITY] IP Check skipped for: ${request.url}`);
        }
        return;
    }

    const clientIp = request.headers['x-forwarded-for'] || request.ip || request.socket.remoteAddress;

    // Detect WebSocket Upgrade request
    const isWebSocketUpgrade = request.headers['upgrade'] === 'websocket' || request.headers['sec-websocket-key'];

    // 1. Check IP Whitelist
    const allowed = await AllowedIP.findOne({ ip: clientIp, status: 'active' }).populate('clientId');

    if (!allowed) {
        if (isWebSocketUpgrade) {
            req.log.warn(`🚫 WS Upgrade Blocked for IP: ${clientIp}`);
            return reply.code(403).send({ error: 'Forbidden' });
        }
        return blockRequest(request, reply, clientIp, 'IP Not Whitelisted', 'blocked');
    }

    const client = allowed.clientId;

    // Check client status
    if (!client || client.status !== 'active') {
        if (isWebSocketUpgrade) {
            return reply.code(403).send({ error: 'Forbidden' });
        }
        return blockRequest(request, reply, clientIp, `Client Account ${client?.status || 'Not Found'}`, client?.status || 'blocked');
    }

    // 2. Demo Throttling Logic
    if (client.clientType === 'demo') {
        if (client.totalHitsToday >= 1000) {
            if (isWebSocketUpgrade) {
                return reply.code(403).send({ error: 'Forbidden' });
            }
            return blockRequest(request, reply, clientIp, 'Demo Limit Exceeded', 'throttled');
        }
    }

    // 3. API Permission Check
    // We check if the route has specific provider/api requirements
    const routeConfig = request.routeOptions.config;

    if (routeConfig && routeConfig.provider && routeConfig.apiId) {
        const { provider, apiId } = routeConfig;

        // Find permission object for this provider
        const perm = client.apiPermissions.find(p => p.provider === provider);

        // Check if Provider is Enabled
        if (!perm || !perm.enabled) {
            if (isWebSocketUpgrade) {
                return reply.code(403).send({ error: 'Forbidden: Provider Not Enabled' });
            }
            return blockRequest(request, reply, clientIp, `Provider Access Denied: ${provider}`, 'blocked');
        }

        // Check if Specific API is Enabled
        if (!perm.apis.includes(apiId)) {
            if (isWebSocketUpgrade) {
                return reply.code(403).send({ error: 'Forbidden: API Not Enabled' });
            }
            return blockRequest(request, reply, clientIp, `API Access Denied: ${apiId}`, 'blocked');
        }
    }

    // Attach data to request
    request.clientData = client;
    request.allowedIpData = allowed;
};

module.exports = {
    blockRequest,
    handleProxy,
    securityHook
};
