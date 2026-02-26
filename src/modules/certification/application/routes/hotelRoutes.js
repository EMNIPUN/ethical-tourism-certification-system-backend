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
 *     summary: (Step 1) Create a new hotel and search candidates
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
 *                 type: object
 *                 description: JSON object containing all hotel data matching the HotelRequest schema.
 *                 example:
 *                   businessInfo:
 *                     name: "AYANA Resort Bali"
 *                     registrationNumber: "REG-12345"
 *                     licenseNumber: "LIC-67890"
 *                     businessType: "Hotel"
 *                     contact:
 *                       ownerName: "John Doe"
 *                       phone: "+1234567890"
 *                       email: "hotel@example.com"
 *                       address: "Bali, Indonesia"
 *                   guestServices:
 *                     facilities:
 *                       numberOfRooms: 50
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
 *                   example: "Hotel created successfully. Next, call /hotels/{id}/confirm-match with the selected place_id to complete registration."
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
 *                 type: object
 *                 description: JSON object containing all hotel data to update.
 *                 example:
 *                   businessInfo:
 *                     name: "AYANA Resort Bali (Updated)"
 *                     registrationNumber: "REG-12345"
 *                     licenseNumber: "LIC-67890"
 *                     businessType: "Hotel"
 *                     contact:
 *                       ownerName: "John Doe"
 *                       phone: "+1234567890"
 *                       email: "updated.hotel@example.com"
 *                       address: "Bali, Indonesia"
 *                   guestServices:
 *                     facilities:
 *                       numberOfRooms: 60
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
 *     summary: (Step 2) Confirm the Google Business profile match and score the hotel
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
 *                 example: "0x2dd2430f68571fcd:0xda9914e4e153cf28"
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
