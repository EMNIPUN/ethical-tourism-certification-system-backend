import mongoose from 'mongoose';

/**
 * Section Review Schema
 * Used to review individual sections of hotel certification
 */
const SectionReviewSchema = new mongoose.Schema({
    status: {
        type: String,
        enum: ['pending', 'approved', 'rejected', 'needs_revision'],
        default: 'pending'
    },
    comment: {
        type: String,
        maxlength: 2000
    },
    reviewedBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
    },
    reviewedAt: {
        type: Date
    },
    // Specific issues or highlights for this section
    notes: [{
        field: String,
        issue: String,
        severity: {
            type: String,
            enum: ['minor', 'major', 'critical']
        },
        createdAt: {
            type: Date,
            default: Date.now
        }
    }]
}, { _id: false });

/**
 * Audit Schema
 * Main schema for auditing hotel certification requests
 */
const AuditSchema = new mongoose.Schema({
    // Reference to the hotel being audited
    hotel: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Hotel',
        required: true
    },

    // Auditor assigned to this audit
    auditor: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },

    // Overall audit status
    auditStatus: {
        type: String,
        enum: ['initiated', 'in_progress', 'completed', 'suspended'],
        default: 'initiated'
    },

    // Section-wise reviews
    sections: {
        businessInfo: {
            type: SectionReviewSchema,
            default: () => ({})
        },
        legalDocuments: {
            type: SectionReviewSchema,
            default: () => ({})
        },
        employeePractices: {
            type: SectionReviewSchema,
            default: () => ({})
        },
        sustainability: {
            type: SectionReviewSchema,
            default: () => ({})
        },
        community: {
            type: SectionReviewSchema,
            default: () => ({})
        },
        guestServices: {
            type: SectionReviewSchema,
            default: () => ({})
        }
    },

    // Overall audit score (0-100)
    overallScore: {
        type: Number,
        min: 0,
        max: 100,
        default: 0
    },

    // Individual section scores
    sectionScores: {
        businessInfo: { type: Number, min: 0, max: 100, default: 0 },
        legalDocuments: { type: Number, min: 0, max: 100, default: 0 },
        employeePractices: { type: Number, min: 0, max: 100, default: 0 },
        sustainability: { type: Number, min: 0, max: 100, default: 0 },
        community: { type: Number, min: 0, max: 100, default: 0 },
        guestServices: { type: Number, min: 0, max: 100, default: 0 }
    },

    // Final recommendation
    recommendation: {
        type: String,
        enum: ['approve', 'reject', 'conditional_approval', 'pending'],
        default: 'pending'
    },

    // Final comments from auditor
    finalComments: {
        type: String,
        maxlength: 5000
    },

    // Audit dates
    auditStartDate: {
        type: Date,
        default: Date.now
    },

    auditCompletionDate: {
        type: Date
    },

    // Site visit details
    siteVisit: {
        scheduled: {
            type: Boolean,
            default: false
        },
        visitDate: Date,
        duration: String, // e.g., "2 days"
        attendees: [String],
        findings: String
    },

    // Compliance checklist
    complianceChecks: [{
        category: {
            type: String,
            required: true
        },
        item: {
            type: String,
            required: true
        },
        compliant: {
            type: Boolean,
            default: false
        },
        evidence: String,
        comment: String
    }],

    // Attachments/Evidence uploaded by auditor
    attachments: [{
        fileName: String,
        fileType: String,
        fileUrl: String,
        description: String,
        uploadedAt: {
            type: Date,
            default: Date.now
        }
    }],

    // Audit history/log
    auditLog: [{
        action: String,
        performedBy: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User'
        },
        timestamp: {
            type: Date,
            default: Date.now
        },
        details: String
    }]
}, {
    timestamps: true
});

// Indexes for better query performance
AuditSchema.index({ hotel: 1 });
AuditSchema.index({ auditor: 1 });
AuditSchema.index({ auditStatus: 1 });
AuditSchema.index({ createdAt: -1 });

// Method to calculate overall score from section scores
AuditSchema.methods.calculateOverallScore = function () {
    const scores = this.sectionScores;
    const weights = {
        businessInfo: 0.10,
        legalDocuments: 0.15,
        employeePractices: 0.25,
        sustainability: 0.25,
        community: 0.15,
        guestServices: 0.10
    };

    const totalScore =
        (scores.businessInfo * weights.businessInfo) +
        (scores.legalDocuments * weights.legalDocuments) +
        (scores.employeePractices * weights.employeePractices) +
        (scores.sustainability * weights.sustainability) +
        (scores.community * weights.community) +
        (scores.guestServices * weights.guestServices);

    this.overallScore = Math.round(totalScore);
    return this.overallScore;
};

// Method to check if all sections are reviewed
AuditSchema.methods.areAllSectionsReviewed = function () {
    const sectionNames = ['businessInfo', 'legalDocuments', 'employeePractices',
        'sustainability', 'community', 'guestServices'];

    return sectionNames.every(section =>
        this.sections[section].status &&
        this.sections[section].status !== 'pending'
    );
};

// Method to add audit log entry
AuditSchema.methods.addLogEntry = function (action, userId, details) {
    this.auditLog.push({
        action,
        performedBy: userId,
        details,
        timestamp: new Date()
    });
};

// Pre-save hook to update audit status based on section reviews
AuditSchema.pre('save', function () {
    if (this.isModified('sections')) {
        // Check if any section has been reviewed
        const hasReviews = Object.values(this.sections).some(
            section => section.status !== 'pending'
        );

        if (hasReviews && this.auditStatus === 'initiated') {
            this.auditStatus = 'in_progress';
        }
    }
});

const Audit = mongoose.model('Audit', AuditSchema);

export default Audit;
