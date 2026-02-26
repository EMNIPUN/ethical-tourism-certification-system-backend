import express from "express";
import {
   getHotelFeedback,
   addHotelFeedback,
   addHotelFeedbackWithTrustSync,
   updateHotelFeedback,
   deleteHotelFeedback,
} from "../controller/hotelFeedbackController.js";
import {
   protect,
   authorize,
} from "../../../common/middleware/authMiddleware.js";
import { validate } from "../../../common/middleware/validateMiddleware.js";
import {
   createHotelFeedbackSchema,
   updateHotelFeedbackSchema,
} from "../validation/hotelFeedbackValidation.js";

const router = express.Router();

/**
 * @swagger
 * /hotels-search/contacts/{id}/feedback:
 *   get:
 *     summary: Get hotel review section by hotel ID
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
 *         description: Hotel review section
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/HotelFeedbackListResponse'
 *       404:
 *         description: Hotel not found
 *   post:
 *     summary: Add tourist feedback for a hotel
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
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/HotelFeedbackCreateRequest'
 *     responses:
 *       201:
 *         description: Feedback added successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/HotelFeedbackMutationResponse'
 *       400:
 *         description: Validation error
 *       403:
 *         description: User role not authorized
 *       404:
 *         description: Hotel not found
 */
router
   .route("/contacts/:id/feedback")
   .get(
      protect,
      authorize("Admin", "Hotel Owner", "Auditor", "Tourist"),
      getHotelFeedback,
   )
   .post(
      protect,
      authorize("Tourist", "Admin"),
      validate(createHotelFeedbackSchema),
      addHotelFeedbackWithTrustSync,
   );

/**
 * @swagger
 * /hotels-search/contacts/{id}/feedback/{feedbackId}:
 *   put:
 *     summary: Update feedback
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
 *       - in: path
 *         name: feedbackId
 *         required: true
 *         schema:
 *           type: string
 *         description: Feedback ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/HotelFeedbackUpdateRequest'
 *     responses:
 *       200:
 *         description: Feedback updated successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/HotelFeedbackMutationResponse'
 *       400:
 *         description: Validation error
 *       403:
 *         description: Not authorized to update this feedback
 *       404:
 *         description: Hotel or feedback not found
 *   delete:
 *     summary: Delete feedback
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
 *       - in: path
 *         name: feedbackId
 *         required: true
 *         schema:
 *           type: string
 *         description: Feedback ID
 *     responses:
 *       200:
 *         description: Feedback deleted successfully
 *       403:
 *         description: Not authorized to delete this feedback
 *       404:
 *         description: Hotel or feedback not found
 */
router
   .route("/contacts/:id/feedback/:feedbackId")
   .put(
      protect,
      authorize("Tourist", "Admin"),
      validate(updateHotelFeedbackSchema),
      updateHotelFeedback,
   )
   .delete(protect, authorize("Tourist", "Admin"), deleteHotelFeedback);

export default router;
