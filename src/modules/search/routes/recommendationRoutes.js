import express from 'express';
import {
    getAIHotelRecommendations,
} from '../controller/hotelRecommendationController.js';
import {
    protect,
    authorize,
} from '../../../common/middleware/authMiddleware.js';

const router = express.Router();

/**
 * @swagger
 * /hotels-search/ai-recommendations:
 *   get:
 *     summary: Get comprehensive AI-powered hotel recommendations for all Sri Lanka
 *     tags: [Public Certification Verification & Discovery]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: AI-analyzed ranking of best hotels in Sri Lanka with recommendations
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/AIHotelRecommendationResponse'
 *       401:
 *         description: Not authorized
 */
router.get(
    '/ai-recommendations',
    protect,
    authorize('Admin', 'Hotel Owner', 'Auditor', 'Tourist'),
    getAIHotelRecommendations,
);

export default router;
