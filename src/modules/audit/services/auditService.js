import Audit from '../models/Audit.js';
import Hotel from '../../certification/application/models/Hotel.js';
import User from '../../../common/models/User.js';

/**
 * Audit Service
 * Contains business logic for audit operations
 */
class AuditService {
    /**
     * Create a new audit for a hotel
     * @param {Object} auditData - Audit creation data
     * @param {String} creatorId - ID of user creating the audit
     * @returns {Object} Created audit
     */
    async createAudit(auditData, creatorId) {
        // Verify hotel exists
        const hotel = await Hotel.findById(auditData.hotel);
        if (!hotel) {
            throw new Error('Hotel not found');
        }

        // Verify auditor exists and has Auditor role
        const auditor = await User.findById(auditData.auditor);
        if (!auditor) {
            throw new Error('Auditor not found');
        }
        if (auditor.role !== 'Auditor' && auditor.role !== 'Admin') {
            throw new Error('Selected user is not an auditor');
        }

        // Check if there's already an active audit for this hotel
        const existingAudit = await Audit.findOne({
            hotel: auditData.hotel,
            auditStatus: { $in: ['initiated', 'in_progress'] }
        });

        if (existingAudit) {
            throw new Error('An active audit already exists for this hotel');
        }

        // Create new audit
        const audit = new Audit({
            ...auditData,
            auditStatus: 'initiated'
        });

        // Add log entry
        audit.addLogEntry('Audit created', creatorId, `Audit assigned to ${auditor.name}`);

        await audit.save();

        return await Audit.findById(audit._id)
            .populate('hotel', 'businessInfo.name businessInfo.contact scoring')
            .populate('auditor', 'name email role');
    }

    /**
     * Get audit by ID
     * @param {String} auditId - Audit ID
     * @returns {Object} Audit details
     */
    async getAuditById(auditId) {
        const audit = await Audit.findById(auditId)
            .populate('hotel')
            .populate('auditor', 'name email role')
            .populate('auditLog.performedBy', 'name email');

        if (!audit) {
            throw new Error('Audit not found');
        }

        return audit;
    }

    /**
     * Get all audits with filtering and pagination
     * @param {Object} filters - Filter options
     * @param {Object} pagination - Pagination options
     * @returns {Object} Paginated audit list
     */
    async getAllAudits(filters = {}, pagination = {}) {
        const { page = 1, limit = 10, sortBy = 'createdAt', order = 'desc' } = pagination;

        const query = {};

        // Apply filters
        if (filters.hotel) query.hotel = filters.hotel;
        if (filters.auditor) query.auditor = filters.auditor;
        if (filters.auditStatus) query.auditStatus = filters.auditStatus;
        if (filters.recommendation) query.recommendation = filters.recommendation;

        const skip = (page - 1) * limit;
        const sortOrder = order === 'asc' ? 1 : -1;

        const [audits, total] = await Promise.all([
            Audit.find(query)
                .populate('hotel', 'businessInfo.name businessInfo.contact scoring')
                .populate('auditor', 'name email role')
                .sort({ [sortBy]: sortOrder })
                .limit(limit)
                .skip(skip),
            Audit.countDocuments(query)
        ]);

        return {
            audits,
            pagination: {
                page,
                limit,
                total,
                pages: Math.ceil(total / limit)
            }
        };
    }

    /**
     * Review a specific section of the hotel application
     * @param {String} auditId - Audit ID
     * @param {String} sectionName - Name of section to review
     * @param {Object} reviewData - Review details
     * @param {String} reviewerId - ID of reviewer
     * @returns {Object} Updated audit
     */
    async reviewSection(auditId, sectionName, reviewData, reviewerId) {
        const audit = await Audit.findById(auditId);

        if (!audit) {
            throw new Error('Audit not found');
        }

        // Check if audit is in valid status for review
        if (audit.auditStatus === 'completed') {
            throw new Error('Cannot review a completed audit');
        }

        // Verify reviewer is the assigned auditor or an admin
        const reviewer = await User.findById(reviewerId);
        if (!reviewer) {
            throw new Error('Reviewer not found');
        }

        if (reviewer.role !== 'Admin' && audit.auditor.toString() !== reviewerId) {
            throw new Error('Only the assigned auditor or admin can review this section');
        }

        // Update section review
        const sectionPath = `sections.${sectionName}`;
        audit.sections[sectionName] = {
            status: reviewData.status,
            comment: reviewData.comment || '',
            reviewedBy: reviewerId,
            reviewedAt: new Date(),
            notes: reviewData.notes || audit.sections[sectionName]?.notes || []
        };

        // Update section score if provided
        if (reviewData.score !== undefined) {
            audit.sectionScores[sectionName] = reviewData.score;
            // Recalculate overall score
            audit.calculateOverallScore();
        }

        // Add log entry
        audit.addLogEntry(
            'Section reviewed',
            reviewerId,
            `${sectionName} marked as ${reviewData.status}`
        );

        await audit.save();

        return await this.getAuditById(auditId);
    }

    /**
     * Update score for a specific section
     * @param {String} auditId - Audit ID
     * @param {String} sectionName - Section name
     * @param {Number} score - Score value (0-100)
     * @param {String} userId - ID of user updating score
     * @returns {Object} Updated audit
     */
    async updateSectionScore(auditId, sectionName, score, userId) {
        const audit = await Audit.findById(auditId);

        if (!audit) {
            throw new Error('Audit not found');
        }

        if (audit.auditStatus === 'completed') {
            throw new Error('Cannot update score of a completed audit');
        }

        // Update section score
        audit.sectionScores[sectionName] = score;

        // Recalculate overall score
        audit.calculateOverallScore();

        // Add log entry
        audit.addLogEntry(
            'Section score updated',
            userId,
            `${sectionName} scored ${score}/100`
        );

        await audit.save();

        return await this.getAuditById(auditId);
    }

    /**
     * Add compliance check item
     * @param {String} auditId - Audit ID
     * @param {Object} checkData - Compliance check data
     * @param {String} userId - ID of user adding check
     * @returns {Object} Updated audit
     */
    async addComplianceCheck(auditId, checkData, userId) {
        const audit = await Audit.findById(auditId);

        if (!audit) {
            throw new Error('Audit not found');
        }

        audit.complianceChecks.push(checkData);

        // Add log entry
        audit.addLogEntry(
            'Compliance check added',
            userId,
            `Category: ${checkData.category}, Item: ${checkData.item}`
        );

        await audit.save();

        return await this.getAuditById(auditId);
    }

    /**
     * Schedule site visit
     * @param {String} auditId - Audit ID
     * @param {Object} visitData - Site visit details
     * @param {String} userId - ID of user scheduling visit
     * @returns {Object} Updated audit
     */
    async scheduleSiteVisit(auditId, visitData, userId) {
        const audit = await Audit.findById(auditId);

        if (!audit) {
            throw new Error('Audit not found');
        }

        audit.siteVisit = {
            scheduled: true,
            visitDate: visitData.visitDate,
            duration: visitData.duration,
            attendees: visitData.attendees || [],
            findings: visitData.findings || ''
        };

        // Add log entry
        audit.addLogEntry(
            'Site visit scheduled',
            userId,
            `Visit date: ${new Date(visitData.visitDate).toLocaleDateString()}`
        );

        await audit.save();

        return await this.getAuditById(auditId);
    }

    /**
     * Update site visit findings
     * @param {String} auditId - Audit ID
     * @param {Object} updateData - Updated findings
     * @param {String} userId - ID of user updating findings
     * @returns {Object} Updated audit
     */
    async updateSiteVisitFindings(auditId, updateData, userId) {
        const audit = await Audit.findById(auditId);

        if (!audit) {
            throw new Error('Audit not found');
        }

        if (!audit.siteVisit.scheduled) {
            throw new Error('No site visit has been scheduled for this audit');
        }

        audit.siteVisit.findings = updateData.findings;
        if (updateData.attendees) {
            audit.siteVisit.attendees = updateData.attendees;
        }

        // Add log entry
        audit.addLogEntry(
            'Site visit findings updated',
            userId,
            'Findings documented'
        );

        await audit.save();

        return await this.getAuditById(auditId);
    }

    /**
     * Add attachment to audit
     * @param {String} auditId - Audit ID
     * @param {Object} attachmentData - Attachment details
     * @param {String} userId - ID of user adding attachment
     * @returns {Object} Updated audit
     */
    async addAttachment(auditId, attachmentData, userId) {
        const audit = await Audit.findById(auditId);

        if (!audit) {
            throw new Error('Audit not found');
        }

        audit.attachments.push({
            ...attachmentData,
            uploadedAt: new Date()
        });

        // Add log entry
        audit.addLogEntry(
            'Attachment added',
            userId,
            `File: ${attachmentData.fileName}`
        );

        await audit.save();

        return await this.getAuditById(auditId);
    }

    /**
     * Complete audit and submit final recommendation
     * @param {String} auditId - Audit ID
     * @param {Object} completionData - Final audit data
     * @param {String} userId - ID of user completing audit
     * @returns {Object} Completed audit
     */
    async completeAudit(auditId, completionData, userId) {
        const audit = await Audit.findById(auditId).populate('hotel');

        if (!audit) {
            throw new Error('Audit not found');
        }

        if (audit.auditStatus === 'completed') {
            throw new Error('Audit is already completed');
        }

        // Verify all sections are reviewed
        if (!audit.areAllSectionsReviewed()) {
            throw new Error('All sections must be reviewed before completing the audit');
        }

        // Update audit
        audit.recommendation = completionData.recommendation;
        audit.finalComments = completionData.finalComments;
        audit.auditStatus = 'completed';
        audit.auditCompletionDate = new Date();

        // If overall score is manually provided, use it
        if (completionData.overallScore !== undefined) {
            audit.overallScore = completionData.overallScore;
        } else {
            // Otherwise calculate from section scores
            audit.calculateOverallScore();
        }

        // Update hotel's auditor score
        const hotel = await Hotel.findById(audit.hotel._id);
        if (hotel) {
            hotel.scoring.auditorScore = audit.overallScore;

            // Recalculate total score (you might have different logic)
            hotel.scoring.totalScore =
                hotel.scoring.dataCompletionScore * 0.3 +
                hotel.scoring.googleReviewScore * 0.3 +
                hotel.scoring.auditorScore * 0.4;

            // Update certification level based on total score
            if (hotel.scoring.totalScore >= 80) {
                hotel.scoring.certificationLevel = 'Gold';
            } else if (hotel.scoring.totalScore >= 60) {
                hotel.scoring.certificationLevel = 'Silver';
            } else if (hotel.scoring.totalScore >= 40) {
                hotel.scoring.certificationLevel = 'Bronze';
            } else {
                hotel.scoring.certificationLevel = 'None';
            }

            await hotel.save();
        }

        // Add log entry
        audit.addLogEntry(
            'Audit completed',
            userId,
            `Recommendation: ${completionData.recommendation}, Score: ${audit.overallScore}`
        );

        await audit.save();

        return await this.getAuditById(auditId);
    }

    /**
     * Get audits by hotel ID
     * @param {String} hotelId - Hotel ID
     * @returns {Array} List of audits for the hotel
     */
    async getAuditsByHotel(hotelId) {
        const audits = await Audit.find({ hotel: hotelId })
            .populate('auditor', 'name email role')
            .sort({ createdAt: -1 });

        return audits;
    }

    /**
     * Get audits by auditor ID
     * @param {String} auditorId - Auditor ID
     * @returns {Array} List of audits assigned to the auditor
     */
    async getAuditsByAuditor(auditorId) {
        const audits = await Audit.find({ auditor: auditorId })
            .populate('hotel', 'businessInfo.name businessInfo.contact scoring')
            .sort({ createdAt: -1 });

        return audits;
    }

    /**
     * Suspend an audit
     * @param {String} auditId - Audit ID
     * @param {String} reason - Reason for suspension
     * @param {String} userId - ID of user suspending audit
     * @returns {Object} Updated audit
     */
    async suspendAudit(auditId, reason, userId) {
        const audit = await Audit.findById(auditId);

        if (!audit) {
            throw new Error('Audit not found');
        }

        if (audit.auditStatus === 'completed') {
            throw new Error('Cannot suspend a completed audit');
        }

        audit.auditStatus = 'suspended';

        // Add log entry
        audit.addLogEntry(
            'Audit suspended',
            userId,
            `Reason: ${reason}`
        );

        await audit.save();

        return await this.getAuditById(auditId);
    }

    /**
     * Resume a suspended audit
     * @param {String} auditId - Audit ID
     * @param {String} userId - ID of user resuming audit
     * @returns {Object} Updated audit
     */
    async resumeAudit(auditId, userId) {
        const audit = await Audit.findById(auditId);

        if (!audit) {
            throw new Error('Audit not found');
        }

        if (audit.auditStatus !== 'suspended') {
            throw new Error('Only suspended audits can be resumed');
        }

        audit.auditStatus = 'in_progress';

        // Add log entry
        audit.addLogEntry(
            'Audit resumed',
            userId,
            'Audit has been resumed'
        );

        await audit.save();

        return await this.getAuditById(auditId);
    }

    /**
     * Delete an audit (admin only)
     * @param {String} auditId - Audit ID
     * @returns {Boolean} Success status
     */
    async deleteAudit(auditId) {
        const audit = await Audit.findById(auditId);

        if (!audit) {
            throw new Error('Audit not found');
        }

        if (audit.auditStatus === 'completed') {
            throw new Error('Cannot delete a completed audit');
        }

        await Audit.findByIdAndDelete(auditId);

        return true;
    }

    /**
     * Get audit statistics
     * @param {Object} filters - Optional filters
     * @returns {Object} Audit statistics
     */
    async getAuditStatistics(filters = {}) {
        const matchStage = {};

        if (filters.auditor) matchStage.auditor = filters.auditor;
        if (filters.hotel) matchStage.hotel = filters.hotel;

        const stats = await Audit.aggregate([
            { $match: matchStage },
            {
                $group: {
                    _id: null,
                    totalAudits: { $sum: 1 },
                    completedAudits: {
                        $sum: { $cond: [{ $eq: ['$auditStatus', 'completed'] }, 1, 0] }
                    },
                    inProgressAudits: {
                        $sum: { $cond: [{ $eq: ['$auditStatus', 'in_progress'] }, 1, 0] }
                    },
                    initiatedAudits: {
                        $sum: { $cond: [{ $eq: ['$auditStatus', 'initiated'] }, 1, 0] }
                    },
                    suspendedAudits: {
                        $sum: { $cond: [{ $eq: ['$auditStatus', 'suspended'] }, 1, 0] }
                    },
                    averageScore: { $avg: '$overallScore' },
                    approvedCount: {
                        $sum: { $cond: [{ $eq: ['$recommendation', 'approve'] }, 1, 0] }
                    },
                    rejectedCount: {
                        $sum: { $cond: [{ $eq: ['$recommendation', 'reject'] }, 1, 0] }
                    },
                    conditionalApprovalCount: {
                        $sum: { $cond: [{ $eq: ['$recommendation', 'conditional_approval'] }, 1, 0] }
                    }
                }
            }
        ]);

        return stats[0] || {
            totalAudits: 0,
            completedAudits: 0,
            inProgressAudits: 0,
            initiatedAudits: 0,
            suspendedAudits: 0,
            averageScore: 0,
            approvedCount: 0,
            rejectedCount: 0,
            conditionalApprovalCount: 0
        };
    }
}

export default new AuditService();
