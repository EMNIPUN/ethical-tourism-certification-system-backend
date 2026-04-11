import express from 'express';
import dotenv from 'dotenv';
import dns from 'node:dns';
import connectDB from './src/common/config/db.js';
import app from './app.js';

dotenv.config();

// Optional local DNS overrides for machines that fail Atlas SRV lookups.
if (process.env.DNS_SERVERS) {
    const servers = process.env.DNS_SERVERS.split(',').map((server) => server.trim()).filter(Boolean);
    if (servers.length) {
        dns.setServers(servers);
    }
}

if (process.env.DNS_RESULT_ORDER && typeof dns.setDefaultResultOrder === 'function') {
    dns.setDefaultResultOrder(process.env.DNS_RESULT_ORDER);
}

connectDB().catch((error) => {
    console.error(`Database startup error: ${error.message}`);
    process.exit(1);
});

const mainApp = express();
import cors from 'cors';
mainApp.use(cors());
const PORT = process.env.PORT || 5000;

mainApp.use('/api/v1', app);

mainApp.get('/', (req, res) => {
    res.send('Server is running');
});

mainApp.listen(PORT, () => {
    console.log('\n    ===================================================');
    console.log(`    Server is running on port ${PORT}`);
    if (process.env.NODE_ENV === 'development') {
        console.log(`    Swagger available at http://localhost:${PORT}/api/v1/api-docs`);
    }
});
