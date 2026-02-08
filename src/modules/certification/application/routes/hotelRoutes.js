import express from 'express';
import {
    createHotel,
    getHotels,
    getHotel,
    updateHotel,
    deleteHotel,
    confirmMatch,
} from '../controllers/hotelController.js';
import { validate } from '../../../../common/middleware/validateMiddleware.js';
import {
    createHotelSchema,
    updateHotelSchema,
    confirmMatchSchema
} from '../validations/hotelValidation.js';
import {
    getMatchingStats,
    getMatchLogById
} from '../controllers/matchAnalyticsController.js';

const router = express.Router();

// Analytics routes (Must be before /:id routes)
router.get('/analytics', getMatchingStats);
router.get('/analytics/:id', getMatchLogById);

/**
 * @swagger
 * tags:
 *   name: Hotels
 *   description: The hotels managing API including interactive search and confirmation
 */

/**
 * @swagger
 * /hotels:
 *   get:
 *     summary: Retrieve a list of hotels
 *     tags: [Hotels]
 *     responses:
 *       200:
 *         description: A list of hotels
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/HotelListResponse'
 *   post:
 *     summary: Create a new hotel
 *     tags: [Hotels]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/HotelRequest'
 *     responses:
 *       201:
 *         description: Hotel created successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/HotelCreateResponse'
 *       400:
 *         description: Validation error
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 */
router.route('/')
    .get(getHotels)
    .post(validate(createHotelSchema), createHotel);

/**
 * @swagger
 * /hotels/{id}/confirm:
 *   post:
 *     summary: Confirm a hotel match
 *     tags: [Hotels]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: The hotel ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               property_token:
 *                 type: string
 *     responses:
 *       200:
 *         description: Hotel match confirmed
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/HotelResponse'
 */
router.route('/:id/confirm')
    .post(validate(confirmMatchSchema), confirmMatch);

/**
 * @swagger
 * /hotels/{id}:
 *   get:
 *     summary: Get a hotel by ID
 *     tags: [Hotels]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: The hotel ID
 *     responses:
 *       200:
 *         description: Hotel data
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/HotelResponse'
 *       404:
 *         description: Hotel not found
 *   put:
 *     summary: Update a hotel
 *     tags: [Hotels]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: The hotel ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/HotelRequest'
 *     responses:
 *       200:
 *         description: Hotel updated successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/HotelResponse'
 *   delete:
 *     summary: Delete a hotel
 *     tags: [Hotels]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: The hotel ID
 *     responses:
 *       200:
 *         description: Hotel deleted successfully
 */
router.route('/:id')
    .get(getHotel)
    .put(validate(updateHotelSchema), updateHotel)
    .delete(deleteHotel);

export default router;
