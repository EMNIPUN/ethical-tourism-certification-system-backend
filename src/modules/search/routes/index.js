import express from 'express';
import hotelContractRoutes from './hotelContractRoutes.js';
import feedbackRoutes from './feedbackRoutes.js';
import recommendationRoutes from './recommendationRoutes.js';

const router = express.Router();

router.use('/', hotelContractRoutes);
router.use('/', feedbackRoutes);
router.use('/', recommendationRoutes);

export default router;
