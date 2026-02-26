import express from "express";
import {
   createHotel,
   getHotels,
   getHotel,
   updateHotel,
   deleteHotel,
   confirmMatch,
} from "../controllers/hotelController.js";
import { validate } from "../../../../common/middleware/validateMiddleware.js";
import {
   protect,
   authorize,
} from "../../../../common/middleware/authMiddleware.js";
import {
   createHotelSchema,
   updateHotelSchema,
   confirmMatchSchema,
} from "../validations/hotelValidation.js";
import {
   getMatchingStats,
   getMatchLogById,
} from "../controllers/matchAnalyticsController.js";

const router = express.Router();

// Analytics routes (Must be before /:id routes)
router.get("/analytics", protect, authorize("Admin"), getMatchingStats);
router.get("/analytics/:id", protect, authorize("Admin"), getMatchLogById);

/**
 * @swagger
 * tags:
 *   name: Certification Application Management
 *   description: API endpoints for managing hotel certificates, including creation, updates, and interactive search/confirmation process.
 */

/**
 * @swagger
 * /hotels:
 *   get:
 *     summary: Retrieve a list of hotels
 *     tags: [Certification Application Management]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: A list of hotels
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/HotelListResponse'
 *   post:
 *     summary: Create a new hotel
 *     tags: [Certification Application Management]
 *     security:
 *       - bearerAuth: []
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
 *       202:
 *         description: Hotel created. Manual confirmation required.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 data:
 *                   $ref: '#/components/schemas/HotelResponse'
 *                 suggestedMatch:
 *                   type: object
 *                   nullable: true
 *                   properties:
 *                     name:
 *                       type: string
 *                     address:
 *                       type: string
 *                     matchScore:
 *                       type: number
 *                     token:
 *                       type: string
 *                     rating:
 *                       type: number
 *                     thumbnail:
 *                       type: string
 *                     matchLogs:
 *                       type: array
 *                       items:
 *                         type: string
 *                 candidates:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       name:
 *                         type: string
 *                       address:
 *                         type: string
 *                       matchScore:
 *                         type: number
 *                       matchLogs:
 *                         type: array
 *                         items:
 *                           type: string
 *                       thumbnail:
 *                         type: string
 *                       token:
 *                         type: string
 *                 message:
 *                   type: string
 *                   example: "Hotel created. Please confirm the correct Google Maps listing."
 *       400:
 *         description: Validation error
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       409:
 *         description: Hotel already registered
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 */
router
   .route("/")
   .get(protect, getHotels)
   .post(
      protect,
      authorize("Hotel Owner", "Admin"),
      validate(createHotelSchema),
      createHotel,
   );

/**
 * @swagger
 * /hotels/{id}/confirm:
 *   post:
 *     summary: Confirm a hotel match
 *     tags: [Certification Application Management]
 *     security:
 *       - bearerAuth: []
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
router
   .route("/:id/confirm")
   .post(
      protect,
      authorize("Hotel Owner", "Admin"),
      validate(confirmMatchSchema),
      confirmMatch,
   );

/**
 * @swagger
 * /hotels/{id}:
 *   get:
 *     summary: Get a hotel by ID
 *     tags: [Certification Application Management]
 *     security:
 *       - bearerAuth: []
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
 *     tags: [Certification Application Management]
 *     security:
 *       - bearerAuth: []
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
 *     tags: [Certification Application Management]
 *     security:
 *       - bearerAuth: []
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
router
   .route("/:id")
   .get(protect, getHotel)
   .put(
      protect,
      authorize("Hotel Owner", "Admin"),
      validate(updateHotelSchema),
      updateHotel,
   )
   .delete(protect, authorize("Admin", "Hotel Owner"), deleteHotel);

export default router;
