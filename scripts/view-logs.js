const mongoose = require('mongoose');
const dotenv = require('dotenv');
const RequestLog = require('../src/models/RequestLog');

dotenv.config();

const viewLogs = async () => {
    try {
        await mongoose.connect(process.env.MONGO_URI);
        console.log('Fetching latest 10 logs...\n');

        const logs = await RequestLog.find().sort({ timestamp: -1 }).limit(10);

        if (logs.length === 0) {
            console.log('No logs found yet.');
        } else {
            console.table(logs.map(log => ({
                Time: log.timestamp.toLocaleString(),
                IP: log.clientIp,
                Method: log.method,
                Endpoint: log.endpoint
            })));
        }

        await mongoose.connection.close();
    } catch (error) {
        console.error('Error fetching logs:', error.message);
        process.exit(1);
    }
};

viewLogs();
