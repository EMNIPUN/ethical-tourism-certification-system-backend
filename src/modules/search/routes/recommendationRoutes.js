import express from 'express';
import {
    getBestHotels,
    getBestHotelsNearMe,
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

/**
 * @swagger
 * /hotels-search/best-hotels:
 *   get:
 *     summary: Get best hotels in Sri Lanka sorted by combined score
 *     tags: [Public Certification Verification & Discovery]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 10
 *         description: Number of hotels to return (default 10)
 *     responses:
 *       200:
 *         description: List of best hotels in Sri Lanka
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 count:
 *                   type: integer
 *                 data:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/BestHotelResponse'
 *       401:
 *         description: Not authorized
 */
router.get(
    '/best-hotels',
    protect,
    authorize('Admin', 'Hotel Owner', 'Auditor', 'Tourist'),
    getBestHotels,
);

/**
 * @swagger
 * /hotels-search/best-hotels/near-me:
 *   get:
 *     summary: Get best hotels near user location in Sri Lanka
 *     tags: [Public Certification Verification & Discovery]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: latitude
 *         required: true
 *         schema:
 *           type: number
 *         description: User's latitude coordinate
 *       - in: query
 *         name: longitude
 *         required: true
 *         schema:
 *           type: number
 *         description: User's longitude coordinate
 *       - in: query
 *         name: radius
 *         schema:
 *           type: number
 *           default: 50
 *         description: Search radius in kilometers (default 50)
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 10
 *         description: Number of hotels to return (default 10)
 *     responses:
 *       200:
 *         description: List of best hotels near user location
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 count:
 *                   type: integer
 *                 userLocation:
 *                   type: object
 *                   properties:
 *                     latitude:
 *                       type: number
 *                     longitude:
 *                       type: number
 *                     radiusKm:
 *                       type: number
 *                 data:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/NearbyHotelResponse'
 *       400:
 *         description: Missing or invalid latitude/longitude
 *       401:
 *         description: Not authorized
 */
router.get(
    '/best-hotels/near-me',
    protect,
    authorize('Admin', 'Hotel Owner', 'Auditor', 'Tourist'),
    getBestHotelsNearMe,
);

export default router;
