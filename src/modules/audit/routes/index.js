import express from 'express';
import auditRoutes from './auditRoutes.js';

const router = express.Router();

// Audit routes
router.use('/', auditRoutes);

export default router;
