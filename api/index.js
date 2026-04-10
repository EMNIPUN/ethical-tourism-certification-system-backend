import express from 'express';
import dotenv from 'dotenv';
import connectDB from '../src/common/config/db.js';
import app from '../app.js';

dotenv.config();

const mainApp = express();
mainApp.use('/api/v1', app);

let dbReady = false;

export default async function handler(req, res) {
    try {
        if (!dbReady) {
            await connectDB();
            dbReady = true;
        }

        return mainApp(req, res);
    } catch (error) {
        console.error('Serverless function error:', error);
        res.status(500).json({
            success: false,
            error: 'Internal Server Error',
            message: process.env.NODE_ENV !== 'production' ? error.message : undefined,
        });
    }
}