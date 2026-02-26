import express from 'express';
import dotenv from 'dotenv';
import connectDB from './src/common/config/db.js';
import app from './app.js';

dotenv.config();

connectDB();

const mainApp = express();
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
