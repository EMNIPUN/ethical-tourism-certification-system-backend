import express from 'express';
import hotelContractRoutes from './hotelContractRoutes.js';
import feedbackRoutes from './feedbackRoutes.js';

const router = express.Router();

router.use('/', hotelContractRoutes);
router.use('/', feedbackRoutes);

export default router;
