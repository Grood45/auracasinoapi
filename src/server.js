const dotenv = require('dotenv');
dotenv.config();
const cluster = require('cluster');
const os = require('os');

const numCPUs = os.cpus().length;

if (cluster.isPrimary) {
    console.log(`🚀 Primary Process ${process.pid} is running`);
    console.log(`🔥 Forking ${numCPUs} workers for maximum performance...`);

    // Fork workers.
    for (let i = 0; i < numCPUs; i++) {
        cluster.fork();
    }

    // Handle worker death (auto-restart)
    cluster.on('exit', (worker, code, signal) => {
        console.log(`⚠️ Worker ${worker.process.pid} died. Restarting...`);
        cluster.fork();
    });
} else {
    // Workers share the TCP connection in this server
    console.log(`🔧 Worker ${process.pid} started`);
    require('./app');
}
