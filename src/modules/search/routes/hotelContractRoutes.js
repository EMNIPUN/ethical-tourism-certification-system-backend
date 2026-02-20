import express from "express";
import {
   getHotelContactDetails,
   getHotelContactDetailById,
} from "../controller/hotelContactController.js";
import {
   protect,
   authorize,
} from "../../../common/middleware/authMiddleware.js";

const router = express.Router();

/**
 * @swagger
 * tags:
 *   name: Public Certification Verification & Discovery
 *   description: Smart hotel search and review of hotel contact details for certification verification and discovery.
 */

/**
 * @swagger
 * /hotels-search/contacts:
 *   get:
 *     summary: Get all hotel contact details
 *     tags: [Public Certification Verification & Discovery]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: A list of hotel contact details
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
 *                     $ref: '#/components/schemas/HotelContactInfo'
 *       401:
 *         description: Not authorized
 */
router.get(
   "/contacts",
   protect,
   authorize("Admin", "Hotel Owner", "Auditor", "Tourist"),
   getHotelContactDetails,
);

/**
 * @swagger
 * /hotels-search/contacts/{id}:
 *   get:
 *     summary: Get hotel contact details by ID
 *     tags: [Public Certification Verification & Discovery]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Hotel ID
 *     responses:
 *       200:
 *         description: Hotel contact details
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   $ref: '#/components/schemas/HotelContactInfo'
 *       401:
 *         description: Not authorized
 *       404:
 *         description: Contact details not found
 */
router.get(
   "/contacts/:id",
   protect,
   authorize("Admin", "Hotel Owner", "Auditor", "Tourist"),
   getHotelContactDetailById,
);

export default router;
