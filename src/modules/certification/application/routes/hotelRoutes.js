import express from "express";
import {
   createHotel,
   getHotels,
   getHotel,
   updateHotel,
   deleteHotel,
   confirmMatch,
} from "../controllers/hotelController.js";
import {
   protect,
   authorize,
} from "../../../../common/middleware/authMiddleware.js";
import { cpUpload } from "../middleware/fileUploadMiddleware.js";

const router = express.Router();

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
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             properties:
 *               hotelData:
 *                 type: string
 *                 description: JSON string containing all hotel data matching the HotelRequest schema.
 *               legalDocuments:
 *                 type: array
 *                 items:
 *                   type: string
 *                   format: binary
 *                 description: Upload legal compliance documents (Max 15MB each).
 *               salarySlips:
 *                 type: string
 *                 format: binary
 *                 description: Upload salary slips evidence (Max 15MB).
 *               staffHandbook:
 *                 type: string
 *                 format: binary
 *                 description: Upload staff handbook evidence (Max 15MB).
 *               hrPolicy:
 *                 type: string
 *                 format: binary
 *                 description: Upload HR policy evidence (Max 15MB).
 *     responses:
 *       201:
 *         description: Hotel created. Please confirm the matching Google Business profile.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 message:
 *                   type: string
 *                   example: "Hotel created successfully. Please confirm the matching Google Business profile."
 *                 data:
 *                   type: object
 *                   properties:
 *                     hotelId:
 *                       type: string
 *                     candidates:
 *                       type: array
 *                       items:
 *                         type: object
 *                         properties:
 *                           place_id:
 *                             type: string
 *                           title:
 *                             type: string
 *                           address:
 *                             type: string
 *                           confidence:
 *                             type: number
 *       400:
 *         description: Validation error or file too large (Max 15MB)
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
      cpUpload,
      createHotel,
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
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             properties:
 *               hotelData:
 *                 type: string
 *                 description: JSON string containing all hotel data to update.
 *               legalDocuments:
 *                 type: array
 *                 items:
 *                   type: string
 *                   format: binary
 *               salarySlips:
 *                 type: string
 *                 format: binary
 *               staffHandbook:
 *                 type: string
 *                 format: binary
 *               hrPolicy:
 *                 type: string
 *                 format: binary
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
      cpUpload,
      updateHotel,
   )
   .delete(protect, authorize("Admin", "Hotel Owner"), deleteHotel);

/**
 * @swagger
 * /hotels/{id}/confirm-match:
 *   post:
 *     summary: Confirm the Google Business profile match and score the hotel
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
 *               placeId:
 *                 type: string
 *                 description: The Google place_id of the selected candidate, or null if none matched.
 *     responses:
 *       200:
 *         description: Match confirmed and hotel evaluated.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 message:
 *                   type: string
 *                 evaluation:
 *                   type: object
 *                   properties:
 *                     status:
 *                       type: string
 *                     aiScore:
 *                       type: number
 *                     aiJustification:
 *                       type: string
 *                 data:
 *                   type: object
 *                   properties:
 *                     hotel:
 *                       $ref: '#/components/schemas/HotelResponse'
 *                     hotelRequest:
 *                       type: object
 *       404:
 *         description: Hotel not found
 */
router.post(
   "/:id/confirm-match",
   protect,
   authorize("Hotel Owner", "Admin"),
   confirmMatch
);

export default router;
