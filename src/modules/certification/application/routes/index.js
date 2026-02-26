import express from 'express';
import hotelRoutes from './hotelRoutes.js';
import searchRoutes from './searchRoutes.js';

const router = express.Router();

router.use('/search', searchRoutes);
router.use('/', hotelRoutes);

export default router;
