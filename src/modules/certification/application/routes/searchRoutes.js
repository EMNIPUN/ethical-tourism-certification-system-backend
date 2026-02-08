import express from 'express';
import { searchHotels } from '../controllers/searchController.js';

const router = express.Router();

/**
 * @swagger
 * tags:
 *   name: Search
 *   description: Search hotels using Google Hotels API
 */

// Search route
/**
 * @swagger
 * /hotels/search:
 *   get:
 *     summary: Search for hotels via Google Hotels
 *     tags: [Search]
 *     parameters:
 *       - in: query
 *         name: q
 *         schema:
 *           type: string
 *         required: true
 *         description: Search query (e.g. Hotel Name, City)
 *     responses:
 *       200:
 *         description: Search results
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 count:
 *                   type: integer
 *                   example: 5
 *                 data:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       name:
 *                         type: string
 *                       address:
 *                         type: string
 *                       rating:
 *                         type: number
 *                       token:
 *                         type: string
 *                       thumbnail:
 *                         type: string
 */
router.get('/', searchHotels);

export default router;
