import express from 'express';
import multer from 'multer';
import { protect, authorize } from '../../../common/middleware/authMiddleware.js';
import { validate } from '../../../common/middleware/validateMiddleware.js';

// Configure multer for file uploads (store in memory as buffers)
const upload = multer({
    storage: multer.memoryStorage(),
    limits: {
        fileSize: 10 * 1024 * 1024, // 10MB limit per file
    },
    fileFilter: (req, file, cb) => {
        const allowedTypes = ['application/pdf', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', 'text/plain'];
        if (allowedTypes.includes(file.mimetype)) {
            cb(null, true);
        } else {
            cb(new Error('Invalid file type. Only PDF, DOCX, and TXT files are allowed.'));
        }
    }
});

import {
    createAuditValidation,
    reviewSectionValidation,
    updateSectionScoreValidation,
    addComplianceCheckValidation,
    scheduleSiteVisitValidation,
    updateSiteVisitValidation,
    completeAuditValidation,
    addAttachmentValidation,
    getAuditsQueryValidation
} from '../validations/auditValidation.js';
import {
    createAudit,
    getAllAudits,
    getAuditById,
    reviewSection,
    updateSectionScore,
    addComplianceCheck,
    scheduleSiteVisit,
    updateSiteVisitFindings,
    addAttachment,
    completeAudit,
    getAuditsByHotel,
    getAuditsByAuditor,
    suspendAudit,
    resumeAudit,
    deleteAudit,
    getAuditStatistics,
    uploadHotelDocuments,
    chatWithHotelData
} from '../controllers/auditController.js';

const router = express.Router();

/**
 * @swagger
 * tags:
 *   name: Audit & Review
 *   description: Hotel certification audit and review management
 */

/**
 * @swagger
 * /audits:
 *   post:
 *     summary: Create a new audit
 *     tags: [Audit & Review]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - hotel
 *               - auditor
 *             properties:
 *               hotel:
 *                 type: string
 *                 description: Hotel ID
 *               auditor:
 *                 type: string
 *                 description: Auditor user ID
 *               auditStartDate:
 *                 type: string
 *                 format: date-time
 *     responses:
 *       201:
 *         description: Audit created successfully
 *       400:
 *         description: Validation error
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden - Admin only
 */
router.post(
    '/',
    protect,
    authorize('Admin'),
    validate(createAuditValidation),
    createAudit
);

/**
 * @swagger
 * /audits:
 *   get:
 *     summary: Get all audits with filtering and pagination
 *     tags: [Audit & Review]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: hotel
 *         schema:
 *           type: string
 *         description: Filter by hotel ID
 *       - in: query
 *         name: auditor
 *         schema:
 *           type: string
 *         description: Filter by auditor ID
 *       - in: query
 *         name: auditStatus
 *         schema:
 *           type: string
 *           enum: [initiated, in_progress, completed, suspended]
 *         description: Filter by audit status
 *       - in: query
 *         name: recommendation
 *         schema:
 *           type: string
 *           enum: [approve, reject, conditional_approval, pending]
 *         description: Filter by recommendation
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           default: 1
 *         description: Page number
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 10
 *         description: Items per page
 *       - in: query
 *         name: sortBy
 *         schema:
 *           type: string
 *           enum: [createdAt, updatedAt, overallScore, auditCompletionDate]
 *           default: createdAt
 *         description: Sort field
 *       - in: query
 *         name: order
 *         schema:
 *           type: string
 *           enum: [asc, desc]
 *           default: desc
 *         description: Sort order
 *     responses:
 *       200:
 *         description: List of audits retrieved successfully
 *       401:
 *         description: Unauthorized
 */
router.get(
    '/',
    protect,
    authorize('Admin', 'Auditor'),
    getAllAudits
);

/**
 * @swagger
 * /audits/stats/overview:
 *   get:
 *     summary: Get audit statistics
 *     tags: [Audit & Review]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: auditor
 *         schema:
 *           type: string
 *         description: Filter by auditor ID
 *       - in: query
 *         name: hotel
 *         schema:
 *           type: string
 *         description: Filter by hotel ID
 *     responses:
 *       200:
 *         description: Audit statistics retrieved successfully
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden - Admin only
 */
router.get(
    '/stats/overview',
    protect,
    authorize('Admin'),
    getAuditStatistics
);

/**
 * @swagger
 * /audits/hotel/{hotelId}:
 *   get:
 *     summary: Get audits by hotel ID
 *     tags: [Audit & Review]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: hotelId
 *         required: true
 *         schema:
 *           type: string
 *         description: Hotel ID
 *     responses:
 *       200:
 *         description: Audits retrieved successfully
 *       401:
 *         description: Unauthorized
 */
router.get(
    '/hotel/:hotelId',
    protect,
    authorize('Admin', 'Auditor'),
    getAuditsByHotel
);

/**
 * @swagger
 * /audits/auditor/{auditorId}:
 *   get:
 *     summary: Get audits by auditor ID
 *     tags: [Audit & Review]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: auditorId
 *         required: true
 *         schema:
 *           type: string
 *         description: Auditor ID
 *     responses:
 *       200:
 *         description: Audits retrieved successfully
 *       401:
 *         description: Unauthorized
 */
router.get(
    '/auditor/:auditorId',
    protect,
    authorize('Admin', 'Auditor'),
    getAuditsByAuditor
);

/**
 * @swagger
 * /audits/{id}:
 *   get:
 *     summary: Get audit by ID
 *     tags: [Audit & Review]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Audit ID
 *     responses:
 *       200:
 *         description: Audit retrieved successfully
 *       401:
 *         description: Unauthorized
 *       404:
 *         description: Audit not found
 */
router.get(
    '/:id',
    protect,
    authorize('Admin', 'Auditor'),
    getAuditById
);

/**
 * @swagger
 * /audits/{id}/sections/review:
 *   put:
 *     summary: Review a specific section of the hotel application
 *     tags: [Audit & Review]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Audit ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - sectionName
 *               - status
 *             properties:
 *               sectionName:
 *                 type: string
 *                 enum: [businessInfo, legalDocuments, employeePractices, sustainability, community, guestServices]
 *               status:
 *                 type: string
 *                 enum: [pending, approved, rejected, needs_revision]
 *               comment:
 *                 type: string
 *                 maxLength: 2000
 *               score:
 *                 type: number
 *                 minimum: 0
 *                 maximum: 100
 *               notes:
 *                 type: array
 *                 items:
 *                   type: object
 *                   properties:
 *                     field:
 *                       type: string
 *                     issue:
 *                       type: string
 *                     severity:
 *                       type: string
 *                       enum: [minor, major, critical]
 *     responses:
 *       200:
 *         description: Section reviewed successfully
 *       400:
 *         description: Validation error
 *       401:
 *         description: Unauthorized
 *       404:
 *         description: Audit not found
 */
router.put(
    '/:id/sections/review',
    protect,
    authorize('Admin', 'Auditor'),
    validate(reviewSectionValidation),
    reviewSection
);

/**
 * @swagger
 * /audits/{id}/sections/score:
 *   put:
 *     summary: Update score for a specific section
 *     tags: [Audit & Review]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Audit ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - sectionName
 *               - score
 *             properties:
 *               sectionName:
 *                 type: string
 *                 enum: [businessInfo, legalDocuments, employeePractices, sustainability, community, guestServices]
 *               score:
 *                 type: number
 *                 minimum: 0
 *                 maximum: 100
 *     responses:
 *       200:
 *         description: Section score updated successfully
 *       400:
 *         description: Validation error
 *       401:
 *         description: Unauthorized
 */
router.put(
    '/:id/sections/score',
    protect,
    authorize('Admin', 'Auditor'),
    validate(updateSectionScoreValidation),
    updateSectionScore
);

/**
 * @swagger
 * /audits/{id}/compliance-checks:
 *   post:
 *     summary: Add compliance check item
 *     tags: [Audit & Review]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Audit ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - category
 *               - item
 *               - compliant
 *             properties:
 *               category:
 *                 type: string
 *               item:
 *                 type: string
 *               compliant:
 *                 type: boolean
 *               evidence:
 *                 type: string
 *               comment:
 *                 type: string
 *     responses:
 *       201:
 *         description: Compliance check added successfully
 *       400:
 *         description: Validation error
 *       401:
 *         description: Unauthorized
 */
router.post(
    '/:id/compliance-checks',
    protect,
    authorize('Admin', 'Auditor'),
    validate(addComplianceCheckValidation),
    addComplianceCheck
);

/**
 * @swagger
 * /audits/{id}/site-visit/schedule:
 *   post:
 *     summary: Schedule site visit
 *     tags: [Audit & Review]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Audit ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - visitDate
 *             properties:
 *               visitDate:
 *                 type: string
 *                 format: date-time
 *               duration:
 *                 type: string
 *               attendees:
 *                 type: array
 *                 items:
 *                   type: string
 *               findings:
 *                 type: string
 *     responses:
 *       200:
 *         description: Site visit scheduled successfully
 *       400:
 *         description: Validation error
 *       401:
 *         description: Unauthorized
 */
router.post(
    '/:id/site-visit/schedule',
    protect,
    authorize('Admin', 'Auditor'),
    validate(scheduleSiteVisitValidation),
    scheduleSiteVisit
);

/**
 * @swagger
 * /audits/{id}/site-visit/findings:
 *   put:
 *     summary: Update site visit findings
 *     tags: [Audit & Review]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Audit ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - findings
 *             properties:
 *               findings:
 *                 type: string
 *               attendees:
 *                 type: array
 *                 items:
 *                   type: string
 *     responses:
 *       200:
 *         description: Site visit findings updated successfully
 *       400:
 *         description: Validation error
 *       401:
 *         description: Unauthorized
 */
router.put(
    '/:id/site-visit/findings',
    protect,
    authorize('Admin', 'Auditor'),
    validate(updateSiteVisitValidation),
    updateSiteVisitFindings
);

/**
 * @swagger
 * /audits/{id}/attachments:
 *   post:
 *     summary: Add attachment to audit
 *     tags: [Audit & Review]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Audit ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - fileName
 *               - fileType
 *               - fileUrl
 *             properties:
 *               fileName:
 *                 type: string
 *               fileType:
 *                 type: string
 *               fileUrl:
 *                 type: string
 *               description:
 *                 type: string
 *     responses:
 *       201:
 *         description: Attachment added successfully
 *       400:
 *         description: Validation error
 *       401:
 *         description: Unauthorized
 */
router.post(
    '/:id/attachments',
    protect,
    authorize('Admin', 'Auditor'),
    validate(addAttachmentValidation),
    addAttachment
);

/**
 * @swagger
 * /audits/{id}/complete:
 *   put:
 *     summary: Complete audit and submit final recommendation
 *     tags: [Audit & Review]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Audit ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - recommendation
 *               - finalComments
 *             properties:
 *               recommendation:
 *                 type: string
 *                 enum: [approve, reject, conditional_approval]
 *               finalComments:
 *                 type: string
 *               overallScore:
 *                 type: number
 *                 minimum: 0
 *                 maximum: 100
 *     responses:
 *       200:
 *         description: Audit completed successfully
 *       400:
 *         description: Validation error
 *       401:
 *         description: Unauthorized
 */
router.put(
    '/:id/complete',
    protect,
    authorize('Admin', 'Auditor'),
    validate(completeAuditValidation),
    completeAudit
);

/**
 * @swagger
 * /audits/{id}/suspend:
 *   put:
 *     summary: Suspend an audit
 *     tags: [Audit & Review]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Audit ID
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
 *     responses:
 *       200:
 *         description: Audit suspended successfully
 *       400:
 *         description: Validation error
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden - Admin only
 */
router.put(
    '/:id/suspend',
    protect,
    authorize('Admin'),
    suspendAudit
);

/**
 * @swagger
 * /audits/{id}/resume:
 *   put:
 *     summary: Resume a suspended audit
 *     tags: [Audit & Review]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Audit ID
 *     responses:
 *       200:
 *         description: Audit resumed successfully
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden - Admin only
 */
router.put(
    '/:id/resume',
    protect,
    authorize('Admin'),
    resumeAudit
);

/**
 * @swagger
 * /audits/{id}:
 *   delete:
 *     summary: Delete an audit
 *     tags: [Audit & Review]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Audit ID
 *     responses:
 *       200:
 *         description: Audit deleted successfully
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden - Admin only
 *       404:
 *         description: Audit not found
 */
router.delete(
    '/:id',
    protect,
    authorize('Admin'),
    deleteAudit
);

// ============= RAG SYSTEM ROUTES =============

/**
 * @swagger
 * /audits/hotels/{hotelId}/process-documents:
 *   post:
 *     summary: Upload and process hotel documents into vector database
 *     description: Upload new documents (PDF, DOCX, TXT) and/or process existing hotel data. Creates embeddings and stores in hotel-specific vector database.
 *     tags: [Audit & Review]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: hotelId
 *         required: true
 *         schema:
 *           type: string
 *         description: Hotel MongoDB ObjectId
 *     requestBody:
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             properties:
 *               documents:
 *                 type: array
 *                 items:
 *                   type: string
 *                   format: binary
 *                 description: Upload up to 10 documents (PDF, DOCX, TXT). Max 10MB per file.
 *     responses:
 *       200:
 *         description: Documents processed successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 message:
 *                   type: string
 *                 data:
 *                   type: object
 *                   properties:
 *                     hotelId:
 *                       type: string
 *                     hotelName:
 *                       type: string
 *                     processedDocuments:
 *                       type: array
 *                       items:
 *                         type: string
 *                     uploadedFiles:
 *                       type: number
 *                       description: Number of files uploaded
 *                     totalChunks:
 *                       type: number
 *       400:
 *         description: Invalid file type
 *       404:
 *         description: Hotel not found
 *       401:
 *         description: Unauthorized
 */
router.post(
    '/hotels/:hotelId/process-documents',
    protect,
    authorize('Admin', 'Auditor', 'HotelOwner'),
    upload.array('documents', 10), // Allow up to 10 files
    uploadHotelDocuments
);

/**
 * @swagger
 * /audits/hotels/{hotelId}/chat:
 *   post:
 *     summary: Chat with hotel data using RAG AI assistant
 *     description: Ask questions about hotel data and get AI-powered answers based on stored documents
 *     tags: [Audit & Review]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: hotelId
 *         required: true
 *         schema:
 *           type: string
 *         description: Hotel MongoDB ObjectId
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - query
 *             properties:
 *               query:
 *                 type: string
 *                 description: Question to ask about the hotel
 *                 example: "How many employees does this hotel have?"
 *     responses:
 *       200:
 *         description: Answer generated successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   type: object
 *                   properties:
 *                     answer:
 *                       type: string
 *                     query:
 *                       type: string
 *                     sources:
 *                       type: array
 *                       items:
 *                         type: object
 *                         properties:
 *                           source:
 *                             type: string
 *                           relevance:
 *                             type: number
 *       400:
 *         description: Query is required or no documents found
 *       404:
 *         description: Hotel not found
 *       401:
 *         description: Unauthorized
 */
router.post(
    '/hotels/:hotelId/chat',
    protect,
    authorize('Admin', 'Auditor'),
    chatWithHotelData
);

export default router;
