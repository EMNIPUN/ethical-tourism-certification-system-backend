import express from 'express';
import hotelContractRoutes from './hotelContractRoutes.js';

const router = express.Router();

router.use('/', hotelContractRoutes);

export default router;
