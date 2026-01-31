const { v4: uuidv4 } = require('uuid');
const bcrypt = require('bcryptjs');
const Admin = require('../models/Admin');
const Client = require('../models/Client');
const AllowedIP = require('../models/AllowedIP');
const RequestLog = require('../models/RequestLog');
const Session = require('../models/Session');
const Billing = require('../models/Billing');
const crypto = require('crypto');

async function adminRoutes(fastify, options) {
    // 1. Authentication Middleware (Enhanced with Session Check)
    fastify.addHook('preHandler', async (request, reply) => {
        const url = request.url;
        // Skip auth for login and static dashboard files
        if (url.includes('/login') || url.includes('/dashboard')) return;

        try {
            const decoded = await request.jwtVerify();

            const session = await Session.findOne({
                adminId: decoded.id,
                sessionKey: decoded.sessionKey
            });

            if (!session) {
                return reply.code(401).send({ error: 'Session expired or invalidated' });
            }

            request.user = decoded;
            await Session.findByIdAndUpdate(session._id, { lastActive: new Date() });
        } catch (err) {
            reply.code(401).send({ error: 'Unauthorized' });
        }
    });

    // 2. Admin Login (with Session Creation)
    fastify.post('/login', async (request, reply) => {
        const { username, password } = request.body;
        const admin = await Admin.findOne({ username });
        if (!admin || !(await admin.comparePassword(password))) {
            return reply.code(401).send({ error: 'Invalid credentials' });
        }

        const sessionKey = uuidv4();
        await Session.create({
            adminId: admin._id,
            sessionKey,
            ip: request.headers['x-forwarded-for'] || request.ip,
            userAgent: request.headers['user-agent']
        });

        const token = fastify.jwt.sign({ id: admin._id, username: admin.username, sessionKey });
        return { token };
    });


    // 3. Password Reset (Forces logout from all devices)
    fastify.post('/reset-password', async (request, reply) => {
        const { currentPassword, newPassword } = request.body;
        const admin = await Admin.findById(request.user.id);

        if (!admin || !(await admin.comparePassword(currentPassword))) {
            return reply.code(400).send({ error: 'Invalid current password' });
        }

        admin.password = newPassword;
        await admin.save();

        // LOGOUT ALL DEVICES
        await Session.deleteMany({ adminId: admin._id });

        return { success: true, message: 'Password updated. All sessions invalidated.' };
    });

    // 4. Session Management
    fastify.get('/sessions', async (request, reply) => {
        const sessions = await Session.find({ adminId: request.user.id }).sort({ lastActive: -1 });
        return sessions.map(s => ({
            id: s._id,
            ip: s.ip,
            userAgent: s.userAgent,
            lastActive: s.lastActive,
            isCurrent: s.sessionKey === request.user.sessionKey
        }));
    });

    fastify.delete('/sessions/:id', async (request, reply) => {
        const { id } = request.params;
        await Session.findOneAndDelete({ _id: id, adminId: request.user.id });
        return { success: true };
    });

    fastify.delete('/sessions/all', async (request, reply) => {
        await Session.deleteMany({ adminId: request.user.id, sessionKey: { $ne: request.user.sessionKey } });
        return { success: true };
    });

    // 5. Dashboard Stats (Enhanced as per requirements)
    fastify.get('/stats', async (request, reply) => {
        const totalClients = await Client.countDocuments();
        const demoClients = await Client.countDocuments({ clientType: 'demo' });
        const productionClients = await Client.countDocuments({ clientType: 'production' });

        // IP Stats
        const demoIPCount = await AllowedIP.countDocuments({ mode: 'demo', status: 'active' });
        const productionIPCount = await AllowedIP.countDocuments({ mode: 'production', status: 'active' });
        const blockedIPCount = await AllowedIP.countDocuments({ status: 'blocked' });
        const totalIPs = await AllowedIP.countDocuments();

        // Revenue Stats (Aggregation)
        const revenueStats = await Billing.aggregate([
            {
                $group: {
                    _id: null,
                    totalEarnings: { $sum: "$amountPaid" },
                    remainingBalance: { $sum: "$balance" },
                    overallTotal: { $sum: "$amountDue" }
                }
            }
        ]);

        const { totalEarnings, remainingBalance, overallTotal } = revenueStats[0] || { totalEarnings: 0, remainingBalance: 0, overallTotal: 0 };

        const todayStart = new Date();
        todayStart.setHours(0, 0, 0, 0);

        const fiveMinsAgo = new Date(Date.now() - 5 * 60 * 1000);

        const todayTotalHits = await RequestLog.countDocuments({ timestamp: { $gte: todayStart } });
        const allowedHitsToday = await RequestLog.countDocuments({ timestamp: { $gte: todayStart }, status: 'allowed' });
        const blockedHitsToday = await RequestLog.countDocuments({ timestamp: { $gte: todayStart }, status: 'blocked' });
        const activeHitsLast5Min = await RequestLog.countDocuments({ timestamp: { $gte: fiveMinsAgo } });

        // TPS calculation (last 1 minute)
        const oneMinAgo = new Date(Date.now() - 60 * 1000);
        const lastMinHits = await RequestLog.countDocuments({ timestamp: { $gte: oneMinAgo } });
        const tps = (lastMinHits / 60).toFixed(2);

        // Unique IP Requests Today
        const uniqueIPsToday = await RequestLog.distinct('ip', { timestamp: { $gte: todayStart } });

        // New Users (24h Rolling)
        const twentyFourHoursAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
        const newUsers24h = await Client.countDocuments({ createdAt: { $gte: twentyFourHoursAgo } });

        // Recent Users List (24h Rolling) - with IP Count
        let recentUsersList = await Client.find({ createdAt: { $gte: twentyFourHoursAgo } })
            .sort({ createdAt: -1 })
            .lean();

        // Populate IP counts manually or via aggregation if preferred, keeping it simple loop for now (list likely small)
        recentUsersList = await Promise.all(recentUsersList.map(async (user) => {
            const ipCount = await AllowedIP.countDocuments({ clientId: user._id });
            return {
                ...user,
                ipCount
            };
        }));

        return {
            totalClients,
            demoClients,
            productionClients,
            demoIPCount,
            productionIPCount,
            blockedIPCount,
            totalIPs,
            totalEarnings,
            remainingBalance,
            overallTotal,
            totalUniqueIPRequests: uniqueIPsToday.length,
            todayTotalHits,
            activeHits: activeHitsLast5Min,
            blockedHits: blockedHitsToday,
            allowedHits: allowedHitsToday,
            tps,
            newUsers24h,
            recentUsers: recentUsersList
        };
    });

    // 5.1 Charts Data
    fastify.get('/charts/hits', async (request, reply) => {
        const todayStart = new Date();
        todayStart.setHours(0, 0, 0, 0);

        // 24h timeline (hourly buckets)
        const timeline = await RequestLog.aggregate([
            { $match: { timestamp: { $gte: todayStart } } },
            {
                $group: {
                    _id: { $hour: "$timestamp" },
                    allowed: { $sum: { $cond: [{ $eq: ["$status", "allowed"] }, 1, 0] } },
                    blocked: { $sum: { $cond: [{ $eq: ["$status", "blocked"] }, 1, 0] } }
                }
            },
            { $sort: { "_id": 1 } }
        ]);

        return timeline.map(item => ({
            hour: `${item._id}:00`,
            allowed: item.allowed,
            blocked: item.blocked
        }));
    });


    // 6. Detailed Activity Logs (Enhanced)
    fastify.get('/logs', async (request, reply) => {
        const {
            page = 1, limit = 20,
            search, // General search (IP or Endpoint)
            ip, method, status,
            startDate, endDate,
            minDuration, maxDuration,
            whitelistStatus // 'whitelisted', 'unauthorized', 'all'
        } = request.query;

        const query = {};

        // 1. Search Filter
        if (search) {
            query.$or = [
                { ip: { $regex: search, $options: 'i' } },
                { clientIp: { $regex: search, $options: 'i' } },
                { endpoint: { $regex: search, $options: 'i' } }
            ];
        }

        // 2. Specific Field Filters
        if (ip) query.$or = [{ ip: { $regex: ip, $options: 'i' } }, { clientIp: { $regex: ip, $options: 'i' } }];
        if (method && method !== 'All') query.method = method;

        // Status Filter (can be numeric code or 'allowed'/'blocked' string)
        if (status && status !== 'All') {
            if (status === 'allowed' || status === 'blocked') {
                query.status = status;
            } else if (!isNaN(status)) {
                query.statusCode = parseInt(status);
            }
        }

        // Whitelist Status Filter
        if (whitelistStatus && whitelistStatus !== 'All') {
            if (whitelistStatus === 'whitelisted') query.status = 'allowed';
            if (whitelistStatus === 'unauthorized') query.status = 'blocked';
        }

        // 3. Date Range Filter
        if (startDate || endDate) {
            query.timestamp = {};
            if (startDate) query.timestamp.$gte = new Date(startDate);
            if (endDate) {
                const end = new Date(endDate);
                end.setHours(23, 59, 59, 999);
                query.timestamp.$lte = end;
            }
        }

        // 4. Duration Filter
        if (minDuration || maxDuration) {
            query.responseTime = {};
            if (minDuration) query.responseTime.$gte = parseInt(minDuration);
            if (maxDuration) query.responseTime.$lte = parseInt(maxDuration);
        }

        const logs = await RequestLog.find(query)
            .sort({ timestamp: -1 })
            .skip((page - 1) * limit)
            .limit(parseInt(limit))
            .populate('clientId', 'name');

        const total = await RequestLog.countDocuments(query);

        // Aggregation for Stats Cards (based on current filter)
        // We use a separate aggregation pipeline for speed
        const aggregatesData = await RequestLog.aggregate([
            { $match: query },
            {
                $group: {
                    _id: null,
                    avgResponseTime: { $avg: "$responseTime" },
                    uniqueIPs: { $addToSet: "$clientIp" } // or $ip 
                }
            },
            {
                $project: {
                    avgResponseTime: 1,
                    uniqueIPsCount: { $size: "$uniqueIPs" }
                }
            }
        ]);

        const aggregates = aggregatesData[0] || { avgResponseTime: 0, uniqueIPsCount: 0 };

        // For Whitelisted/Unauthorized counts, we might need a separate query if the filter is "All"
        // But the cards usually show Global stats, unless filtered?
        // User request: "Total Requests in selected date range" -> 'total' covers this.
        // "Avg Response Time" -> 'aggregates.avgResponseTime'.
        // "Unique IPs" -> 'aggregates.uniqueIPsCount'.

        // We also need "Whitelisted IPs" (Live count of allowed IPs in DB) and "Unauthorized IPs" (Live count).
        // These are global stats, not log-filtered stats.
        const activeWhitelistedIPs = await AllowedIP.countDocuments({ status: 'active' });
        // Unauthorized IPs is tricky, it's usually IPs that have been blocked recently?
        // Let's count unique blocked IPs in the date range from the logs aggregation?
        // Or just use the 'total blocked requests' from logs?
        // User said: "Unauthorized IPs: Count of IPs not whitelisted but attempted access".
        // This effectively means unique IPs where status='blocked'. 
        // We can add this to aggregation if needed, or separate query.
        // Let's add it to aggregation.

        const unauthorizedAgg = await RequestLog.aggregate([
            { $match: { ...query, status: 'blocked' } },
            { $group: { _id: "$clientIp" } },
            { $count: "count" }
        ]);
        const unauthorizedIPsCount = unauthorizedAgg[0]?.count || 0;

        return {
            logs,
            pagination: {
                total,
                page: parseInt(page),
                limit: parseInt(limit),
                pages: Math.ceil(total / limit)
            },
            aggregates: {
                ...aggregates,
                activeWhitelistedIPs,
                unauthorizedIPsCount
            }
        };
    });

    // 6.1 WebSocket for Real-Time Logs
    // Note: requires @fastify/websocket registered in app.js
    fastify.get('/ws/logs', { websocket: true }, (connection, req) => {
        // Simple keep-alive or auth check can be added here
        // For now, we just keep the connection open. A global broadcast will iterate clients.
        // We can tag this connection as an 'admin-log-stream' if we want to be specific later.
        connection.socket.on('message', message => {
            // Handle incoming messages if needed
        });
    });

    fastify.delete('/logs/cleanup', async (request, reply) => {
        const { days = 7, all = false } = request.query;
        let query = {};

        if (!all) {
            const cutoff = new Date();
            cutoff.setDate(cutoff.getDate() - parseInt(days));
            query = { timestamp: { $lt: cutoff } };
        }

        const result = await RequestLog.deleteMany(query);
        return { success: true, deletedCount: result.deletedCount };
    });

    // 7. Client Management (Enhanced)
    fastify.get('/clients', async (request, reply) => {
        const clients = await Client.find().sort({ createdAt: -1 });
        const clientsWithIPs = await Promise.all(clients.map(async (client) => {
            const ips = await AllowedIP.find({ clientId: client._id });
            return { ...client._doc, ips };
        }));
        return clientsWithIPs;
    });

    fastify.post('/clients', async (request, reply) => {
        const { name, domain, whatsapp, rentAmount, billingDate, clientType, startDate, endDate, ips } = request.body;

        // Generate Unique 5-Digit ID
        let numericId;
        let isUnique = false;
        while (!isUnique) {
            numericId = Math.floor(10000 + Math.random() * 90000); // 10000 to 99999
            const existing = await Client.findOne({ numericId });
            if (!existing) isUnique = true;
        }

        const apiToken = crypto.randomBytes(24).toString('hex');
        const client = await Client.create({
            name, domain, numericId, whatsapp, rentAmount, billingDate, clientType, startDate, endDate, apiToken
        });

        // Handle Initial IPs
        if (ips && Array.isArray(ips) && ips.length > 0) {
            const ipDocs = ips.map(ip => ({
                ip,
                clientId: client._id,
                mode: clientType,  // Inherit mode
                status: 'active'
            }));
            await AllowedIP.insertMany(ipDocs);
        }

        return client;
    });

    fastify.put('/clients/:id', async (request, reply) => {
        const { id } = request.params;
        const { name, domain, whatsapp, status, rentAmount, billingDate, clientType, startDate, endDate, regenerateToken, apiPermissions } = request.body;

        const updateData = { name, domain, whatsapp, status, rentAmount, billingDate, clientType, startDate, endDate, apiPermissions };

        if (regenerateToken) {
            updateData.apiToken = crypto.randomBytes(24).toString('hex');
        }

        const updated = await Client.findByIdAndUpdate(id, updateData, { new: true });
        return updated;
    });

    fastify.delete('/clients/:id', async (request, reply) => {
        const { id } = request.params;
        await AllowedIP.deleteMany({ clientId: id });
        await Client.findByIdAndDelete(id);
        return { success: true };
    });

    // 8. Billing Management
    fastify.get('/billing', async (request, reply) => {
        const invoices = await Billing.find().populate('client', 'name').sort({ createdAt: -1 });
        return invoices;
    });

    fastify.post('/billing/create', async (request, reply) => {
        const { clientId, amountDue, billingPeriod, amountPaid, paymentMode, transactionRef, remarks } = request.body;

        const balance = amountDue - (amountPaid || 0);
        let status = 'unpaid';
        if (balance <= 0) status = 'paid';
        else if (amountPaid > 0) status = 'partial';

        // Generate Invoice ID: INV-YY-MM-RANDOM
        const now = new Date();
        const year = now.getFullYear().toString().slice(-2);
        const month = (now.getMonth() + 1).toString().padStart(2, '0');
        const random = Math.floor(1000 + Math.random() * 9000);
        const invoiceId = `INV-${year}-${month}-${random}`;

        const billing = await Billing.create({
            invoiceId,
            client: clientId,
            billingPeriod,
            amountDue,
            amountPaid,
            balance,
            status,
            paymentMode,
            transactionRef,
            remarks
        });

        return billing;
    });

    // 9. IP Management (Existing)
    fastify.get('/ips', async (request, reply) => {
        const ips = await AllowedIP.find().populate('clientId', 'name').sort({ createdAt: -1 });
        return ips;
    });

    fastify.post('/clients/:id/ips', async (request, reply) => {
        const { id } = request.params;
        const { ip, notes, mode } = request.body;

        const client = await Client.findById(id);
        if (!client) return reply.code(404).send({ error: 'Client not found' });

        const ipMode = mode || client.clientType; // Inherit from client if not specified

        const allowedIP = await AllowedIP.create({ ip, clientId: id, notes, mode: ipMode });
        return allowedIP;
    });

    fastify.delete('/ips/:id', async (request, reply) => {
        const { id } = request.params;
        await AllowedIP.findByIdAndDelete(id);
        return { success: true };
    });

    // Toggle IP Status (Block/Unblock)
    fastify.put('/ips/status', async (request, reply) => {
        const { ip, status } = request.body; // status: 'active' or 'blocked'
        const allowedIP = await AllowedIP.findOne({ ip });
        if (!allowedIP) return reply.code(404).send({ error: 'IP not found in whitelist' });

        allowedIP.status = status;
        await allowedIP.save();
        return allowedIP;
    });


    // 8. Redirect Logic
    fastify.get('/login', async (request, reply) => {
        return reply.redirect('/v1/admin/dashboard/');
    });
}

module.exports = adminRoutes;
