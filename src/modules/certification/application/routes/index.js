import express from 'express';
import hotelRoutes from './hotelRoutes.js';

const router = express.Router();

router.use('/', hotelRoutes);

export default router;
