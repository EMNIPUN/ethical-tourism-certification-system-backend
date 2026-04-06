import express from "express";
import {
   issueCertificate,
   getCertificate,
   getHotelsWithCertificates,
   getEligibleHotels,
   updateCertificateDetails,
   updateTrustScore,
   renewCertificate,
   revokeCertificate,
   inactivateCertificate,
   updateCertificateTrustScoreByHotel,
   getCertificateTimeline,
} from "../controllers/lifecycleController.js";
import {
   protect,
   authorize,
} from "../../../../common/middleware/authMiddleware.js";
import { validate } from "../../../../common/middleware/validateMiddleware.js";
import {
   issueCertificateSchema,
   updateCertificateDetailsSchema,
   updateTrustScoreSchema,
   renewCertificateSchema,
   revokeCertificateSchema,
   inactivateCertificateSchema,
   updateCertificateTrustScoreSchema,
} from "../validations/lifecycleValidation.js";

const router = express.Router();

/**
 * @swagger
 * tags:
 *   name: Certificate Lifecycle
 *   description: Certificate Lifecycle Management — issue, view, update, renew, and revoke certificates
 */

/**
 * @swagger
 * components:
 *   schemas:
 *     Certificate:
 *       type: object
 *       properties:
 *         _id:
 *           type: string
 *           description: Certificate document ID
 *           example: "665f1a2b3c4d5e6f7a8b9c0d"
 *         certificateNumber:
 *           type: string
 *           description: Unique immutable certificate number
 *           example: "CERT-M1A2B3C-D4E5F6"
 *         hotelId:
 *           type: string
 *           description: Reference to the Hotel document
 *           example: "665f1a2b3c4d5e6f7a8b9c0e"
 *         issuedDate:
 *           type: string
 *           format: date-time
 *           description: Date the certificate was issued
 *         expiryDate:
 *           type: string
 *           format: date-time
 *           description: Date the certificate expires
 *         status:
 *           type: string
 *           enum: [ACTIVE, EXPIRED, REVOKED, INACTIVE]
 *           description: Current certificate status
 *           example: "ACTIVE"
 *         trustScore:
 *           type: number
 *           minimum: 0
 *           maximum: 100
 *           description: Trust score of the certificate
 *           example: 85
 *         level:
 *           type: string
 *           enum: [PLATINUM, GOLD, SILVER]
 *           description: Certification level based on trust score
 *           example: "GOLD"
 *         renewalCount:
 *           type: number
 *           description: Number of times the certificate has been renewed
 *           example: 0
 *         revokedReason:
 *           type: string
 *           nullable: true
 *           description: Reason for revocation (if applicable)
 *         createdAt:
 *           type: string
 *           format: date-time
 *         updatedAt:
 *           type: string
 *           format: date-time
 *     CertificateResponse:
 *       type: object
 *       properties:
 *         success:
 *           type: boolean
 *           example: true
 *         data:
 *           $ref: '#/components/schemas/Certificate'
 *     CertificateErrorResponse:
 *       type: object
 *       properties:
 *         success:
 *           type: boolean
 *           example: false
 *         error:
 *           type: string
 *           example: "Error message"
 *     CertificateTimelineItem:
 *       type: object
 *       properties:
 *         _id:
 *           type: string
 *           example: "67e80a33448fce08d316d9f1"
 *         certificateId:
 *           type: string
 *           example: "665f1a2b3c4d5e6f7a8b9c0d"
 *         hotelId:
 *           type: string
 *           example: "665f1a2b3c4d5e6f7a8b9c0e"
 *         eventType:
 *           type: string
 *           enum:
 *             - CERTIFICATE_ISSUED
 *             - TRUST_SCORE_UPDATED
 *             - LEVEL_CHANGED
 *             - STATUS_CHANGED
 *             - CERTIFICATE_RENEWED
 *             - CERTIFICATE_REVOKED
 *             - CERTIFICATE_EXPIRED
 *             - CERTIFICATE_INACTIVATED
 *             - AUTO_REVOCATION_TRIGGERED
 *             - FEEDBACK_SYNC_APPLIED
 *           example: "TRUST_SCORE_UPDATED"
 *         source:
 *           type: string
 *           enum: [API, SYSTEM, FEEDBACK_SYNC]
 *           example: "API"
 *         actorType:
 *           type: string
 *           enum: [SYSTEM, USER]
 *           example: "USER"
 *         actorId:
 *           type: string
 *           nullable: true
 *           example: "67e7fdf4ad50153a9da14d6b"
 *         summary:
 *           type: string
 *           example: "Trust score recalculated from feedback"
 *         changes:
 *           type: object
 *           additionalProperties: true
 *           description: Before and after snapshots for changed fields
 *         metadata:
 *           type: object
 *           additionalProperties: true
 *           description: Additional context for the event
 *         eventTime:
 *           type: string
 *           format: date-time
 *         createdAt:
 *           type: string
 *           format: date-time
 *         updatedAt:
 *           type: string
 *           format: date-time
 *     CertificateTimelineResponse:
 *       type: object
 *       properties:
 *         success:
 *           type: boolean
 *           example: true
 *         data:
 *           type: object
 *           properties:
 *             certificateId:
 *               type: string
 *               example: "665f1a2b3c4d5e6f7a8b9c0d"
 *             pagination:
 *               type: object
 *               properties:
 *                 page:
 *                   type: number
 *                   example: 1
 *                 limit:
 *                   type: number
 *                   example: 20
 *                 total:
 *                   type: number
 *                   example: 17
 *                 hasNext:
 *                   type: boolean
 *                   example: false
 *             items:
 *               type: array
 *               items:
 *                 $ref: '#/components/schemas/CertificateTimelineItem'
 */

/**
 * @swagger
 * /certification/certificates:
 *   post:
 *     summary: Issue a new certificate
 *     description: >
 *       Issues a new certificate for a hotel. Only accessible by Admin users.
 *       Generates a unique certificate number, sets the initial trust score to 85,
 *       calculates the expiry date, and sets the status to ACTIVE.
 *       Duplicate active certificates for the same hotel are prevented.
 *     tags: [Certificate Lifecycle]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - hotelId
 *               - validityPeriodInMonths
 *             properties:
 *               hotelId:
 *                 type: string
 *                 description: The ObjectId of the hotel
 *                 example: "665f1a2b3c4d5e6f7a8b9c0e"
 *               validityPeriodInMonths:
 *                 type: number
 *                 minimum: 1
 *                 maximum: 120
 *                 description: Validity period in months
 *                 example: 12
 *     responses:
 *       201:
 *         description: Certificate issued successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/CertificateResponse'
 *       400:
 *         description: Validation error or duplicate active certificate
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/CertificateErrorResponse'
 *       401:
 *         description: Not authorized
 *       403:
 *         description: Insufficient role
 *       404:
 *         description: Hotel not found
 */
router.post(
   "/certificates",
   protect,
   authorize("Admin"),
   validate(issueCertificateSchema),
   issueCertificate,
);

/**
 * @swagger
 * /certification/certificates:
 *   get:
 *     summary: Get all hotels with certificate details
 *     description: >
 *       Returns all certificate records with full hotel information populated.
 *       Optionally filter by certificate status using the `status` query parameter.
 *       Accessible by Admin and Auditor roles.
 *     tags: [Certificate Lifecycle]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: status
 *         required: false
 *         schema:
 *           type: string
 *           enum: [ACTIVE, EXPIRED, REVOKED, INACTIVE]
 *         description: Filter certificates by status
 *         example: "ACTIVE"
 *     responses:
 *       200:
 *         description: List of certificates with hotel details
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 count:
 *                   type: number
 *                   example: 5
 *                 data:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/Certificate'
 *       400:
 *         description: Invalid status value
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/CertificateErrorResponse'
 *       401:
 *         description: Not authorized
 *       403:
 *         description: Insufficient role
 */
router.get(
   "/certificates",
   protect,
   authorize("Admin", "Auditor"),
   getHotelsWithCertificates,
);

/**
 * @swagger
 * /certification/certificates/eligible:
 *   get:
 *     summary: Get hotels eligible for certification
 *     description: >
 *       Returns all hotels whose HotelRequest record has both `hotelScore` and
 *       `auditScore` set to **passed**. Each result includes full hotel details,
 *       the scores, and an `alreadyCertified` flag indicating whether the hotel
 *       already holds an ACTIVE certificate. Accessible by Admin and Auditor.
 *     tags: [Certificate Lifecycle]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: List of hotels eligible for certificate issuance
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 count:
 *                   type: number
 *                   example: 3
 *                 data:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       hotelRequestId:
 *                         type: string
 *                         example: "665f1a2b3c4d5e6f7a8b9c0f"
 *                       hotelId:
 *                         type: string
 *                         example: "665f1a2b3c4d5e6f7a8b9c0e"
 *                       hotel:
 *                         $ref: '#/components/schemas/Certificate'
 *                       hotelScore:
 *                         type: object
 *                         properties:
 *                           status:
 *                             type: string
 *                             example: "passed"
 *                       auditScore:
 *                         type: object
 *                         properties:
 *                           status:
 *                             type: string
 *                             example: "passed"
 *                       alreadyCertified:
 *                         type: boolean
 *                         description: true if an ACTIVE certificate already exists
 *                         example: false
 *                       createdAt:
 *                         type: string
 *                         format: date-time
 *                       updatedAt:
 *                         type: string
 *                         format: date-time
 *       401:
 *         description: Not authorized
 *       403:
 *         description: Insufficient role
 */
router.get(
   "/certificates/eligible",
   protect,
   authorize("Admin", "Auditor"),
   getEligibleHotels,
);

/**
 * @swagger
 * /certification/certificates/{certificateNumber}:
 *   get:
 *     summary: Get a certificate by certificate number
 *     description: >
 *       Publicly accessible endpoint to retrieve certificate details.
 *       If the expiry date has passed, the certificate is automatically marked as EXPIRED before returning.
 *     tags: [Certificate Lifecycle]
 *     parameters:
 *       - in: path
 *         name: certificateNumber
 *         required: true
 *         schema:
 *           type: string
 *         description: The unique certificate number
 *         example: "CERT-M1A2B3C-D4E5F6"
 *     responses:
 *       200:
 *         description: Certificate details
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/CertificateResponse'
 *       404:
 *         description: Certificate not found
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/CertificateErrorResponse'
 */
router.get("/certificates/:certificateNumber", getCertificate);

router.put(
   "/certificates/:id",
   protect,
   authorize("Admin"),
   validate(updateCertificateDetailsSchema),
   updateCertificateDetails,
);

/**
 * @swagger
 * /certification/certificates/{id}/timeline:
 *   get:
 *     summary: Get certificate activity timeline
 *     description: >
 *       Returns activity timeline events for a specific certificate ordered by event time.
 *       Includes changes for issue, score updates, level changes, status changes, renewals,
 *       revocations, inactivation, expiry, and feedback sync actions.
 *     tags: [Certificate Lifecycle]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Certificate document ID
 *         example: "665f1a2b3c4d5e6f7a8b9c0d"
 *       - in: query
 *         name: page
 *         required: false
 *         schema:
 *           type: integer
 *           minimum: 1
 *           default: 1
 *       - in: query
 *         name: limit
 *         required: false
 *         schema:
 *           type: integer
 *           minimum: 1
 *           maximum: 100
 *           default: 20
 *       - in: query
 *         name: order
 *         required: false
 *         schema:
 *           type: string
 *           enum: [asc, desc]
 *           default: desc
 *       - in: query
 *         name: from
 *         required: false
 *         schema:
 *           type: string
 *           format: date-time
 *         description: Start datetime filter (inclusive)
 *       - in: query
 *         name: to
 *         required: false
 *         schema:
 *           type: string
 *           format: date-time
 *         description: End datetime filter (inclusive)
 *       - in: query
 *         name: eventType
 *         required: false
 *         schema:
 *           type: string
 *         description: Comma-separated event type list (for example TRUST_SCORE_UPDATED,STATUS_CHANGED)
 *     responses:
 *       200:
 *         description: Certificate timeline fetched successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/CertificateTimelineResponse'
 *       400:
 *         description: Invalid certificate ID, query values, or event type filter
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/CertificateErrorResponse'
 *       401:
 *         description: Not authorized
 *       403:
 *         description: Insufficient role
 *       404:
 *         description: Certificate not found
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/CertificateErrorResponse'
 */

router.get(
   "/certificates/:id/timeline",
   protect,
   authorize("Admin", "Auditor"),
   getCertificateTimeline,
);

/**
 * @swagger
 * /certification/certificates/{id}/trustscore:
 *   put:
 *     summary: Update trust score of a certificate
 *     description: >
 *       Updates the trust score by applying a positive or negative change.
 *       Recalculates the certificate level. If the trust score drops below 60,
 *       the certificate is automatically revoked. Accessible by Admin or Auditor.
 *     tags: [Certificate Lifecycle]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: The certificate document ID
 *         example: "665f1a2b3c4d5e6f7a8b9c0d"
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - scoreChange
 *               - reason
 *             properties:
 *               scoreChange:
 *                 type: number
 *                 description: Positive or negative trust score adjustment
 *                 example: -10
 *               reason:
 *                 type: string
 *                 description: Reason for the trust score change
 *                 example: "Failed environmental audit"
 *     responses:
 *       200:
 *         description: Trust score updated successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/CertificateResponse'
 *       400:
 *         description: Validation error or certificate is revoked
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/CertificateErrorResponse'
 *       401:
 *         description: Not authorized
 *       403:
 *         description: Insufficient role
 *       404:
 *         description: Certificate not found
 */
router.put(
   "/certificates/:id/trustscore",
   protect,
   authorize("Admin", "Auditor"),
   validate(updateTrustScoreSchema),
   updateTrustScore,
);

/**
 * @swagger
 * /certification/certificates/{id}/renew:
 *   put:
 *     summary: Renew a certificate
 *     description: >
 *       Renews a certificate by extending its expiry date, incrementing the renewal count,
 *       and applying a +5 trust score bonus (capped at 100). Revoked certificates cannot be renewed.
 *       Expired certificates can be renewed. Admin only.
 *     tags: [Certificate Lifecycle]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: The certificate document ID
 *         example: "665f1a2b3c4d5e6f7a8b9c0d"
 *     requestBody:
 *       required: false
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               validityPeriodInMonths:
 *                 type: number
 *                 minimum: 1
 *                 maximum: 120
 *                 description: Extension period in months (default 12)
 *                 example: 12
 *     responses:
 *       200:
 *         description: Certificate renewed successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/CertificateResponse'
 *       400:
 *         description: Revoked certificate cannot be renewed
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/CertificateErrorResponse'
 *       401:
 *         description: Not authorized
 *       403:
 *         description: Insufficient role
 *       404:
 *         description: Certificate not found
 */
router.put(
   "/certificates/:id/renew",
   protect,
   authorize("Admin"),
   validate(renewCertificateSchema),
   renewCertificate,
);

/**
 * @swagger
 * /certification/certificates/{id}/revoke:
 *   put:
 *     summary: Revoke a certificate
 *     description: >
 *       Revokes a certificate by setting its status to REVOKED,
 *       trust score to 0, and recording the revocation reason. Admin only.
 *     tags: [Certificate Lifecycle]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: The certificate document ID
 *         example: "665f1a2b3c4d5e6f7a8b9c0d"
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - reason
 *             properties:
 *               reason:
 *                 type: string
 *                 description: Reason for revoking the certificate
 *                 example: "Severe labor law violations"
 *     responses:
 *       200:
 *         description: Certificate revoked successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/CertificateResponse'
 *       400:
 *         description: Certificate is already revoked
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/CertificateErrorResponse'
 *       401:
 *         description: Not authorized
 *       403:
 *         description: Insufficient role
 *       404:
 *         description: Certificate not found
 */
router.put(
   "/certificates/:id/revoke",
   protect,
   authorize("Admin"),
   validate(revokeCertificateSchema),
   revokeCertificate,
);

/**
 * @swagger
 * /certification/certificates/{id}:
 *   delete:
 *     summary: Inactivate (soft-delete) a certificate
 *     description: >
 *       Marks a certificate as INACTIVE — a soft-delete operation representing
 *       the CRUD delete action. The certificate record is retained in the database
 *       but is permanently deactivated. Cannot be applied to an already inactive certificate.
 *       Admin only.
 *     tags: [Certificate Lifecycle]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: The certificate document ID
 *         example: "665f1a2b3c4d5e6f7a8b9c0d"
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - reason
 *             properties:
 *               reason:
 *                 type: string
 *                 description: Reason for inactivating the certificate
 *                 example: "Hotel permanently closed"
 *     responses:
 *       200:
 *         description: Certificate inactivated successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/CertificateResponse'
 *       400:
 *         description: Certificate is already inactive
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/CertificateErrorResponse'
 *       401:
 *         description: Not authorized
 *       403:
 *         description: Insufficient role
 *       404:
 *         description: Certificate not found
 */
router.delete(
   "/certificates/:id",
   protect,
   authorize("Admin"),
   validate(inactivateCertificateSchema),
   inactivateCertificate,
);

/**
 * @swagger
 * /certification/certificates/hotel/{hotelId}/update-score:
 *   patch:
 *     summary: Update a hotel certificate trust score
 *     description: >
 *       Calculates and updates the trust score of the hotel's active certificate
 *       using four weighted factors: average rating (60%), review count (20%),
 *       renewal count (10%), and certificate age (10%).
 *       Also updates the certificate level (PLATINUM / GOLD / SILVER) based on the
 *       new score, or auto-revokes the certificate if the score drops below the
 *       revoke threshold (60). The renewal count and certificate age are read directly
 *       from the certificate record — only averageRating and reviewCount are required
 *       in the request body. Admin only.
 *     tags: [Certificate Lifecycle]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: hotelId
 *         required: true
 *         schema:
 *           type: string
 *         description: The ObjectId of the hotel whose active certificate will be updated
 *         example: "665f1a2b3c4d5e6f7a8b9c0e"
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - averageRating
 *               - reviewCount
 *             properties:
 *               averageRating:
 *                 type: number
 *                 minimum: 0
 *                 maximum: 5
 *                 description: The hotel's current average guest rating (0–5 scale)
 *                 example: 4.2
 *               reviewCount:
 *                 type: integer
 *                 minimum: 0
 *                 description: Total number of guest reviews submitted
 *                 example: 38
 *     responses:
 *       200:
 *         description: Trust score and certificate level updated successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/CertificateResponse'
 *       400:
 *         description: Validation error or invalid hotel ID format
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/CertificateErrorResponse'
 *       401:
 *         description: Not authorized
 *       403:
 *         description: Insufficient role
 *       404:
 *         description: No active certificate found for this hotel
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/CertificateErrorResponse'
 *       500:
 *         description: Internal server error
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/CertificateErrorResponse'
 */
router.patch(
   "/certificates/hotel/:hotelId/update-score",
   protect,
   authorize("Admin"),
   validate(updateCertificateTrustScoreSchema),
   updateCertificateTrustScoreByHotel,
);

export default router;
