import Joi from 'joi';

/**
 * Validation schema for creating a new audit
 */
export const createAuditValidation = Joi.object({
    hotel: Joi.string()
        .pattern(/^[0-9a-fA-F]{24}$/)
        .required()
        .messages({
            'string.pattern.base': 'Invalid hotel ID format',
            'any.required': 'Hotel ID is required'
        }),
    auditor: Joi.string()
        .pattern(/^[0-9a-fA-F]{24}$/)
        .required()
        .messages({
            'string.pattern.base': 'Invalid auditor ID format',
            'any.required': 'Auditor ID is required'
        }),
    auditStartDate: Joi.date()
        .optional(),
    siteVisit: Joi.object({
        scheduled: Joi.boolean(),
        visitDate: Joi.date().min('now'),
        duration: Joi.string().max(100),
        attendees: Joi.array().items(Joi.string().max(200)),
        findings: Joi.string().max(2000)
    }).optional()
});

/**
 * Validation schema for reviewing a section
 */
export const reviewSectionValidation = Joi.object({
    sectionName: Joi.string()
        .valid('businessInfo', 'legalDocuments', 'employeePractices',
            'sustainability', 'community', 'guestServices')
        .required()
        .messages({
            'any.only': 'Invalid section name. Must be one of: businessInfo, legalDocuments, employeePractices, sustainability, community, guestServices',
            'any.required': 'Section name is required'
        }),
    status: Joi.string()
        .valid('pending', 'approved', 'rejected', 'needs_revision')
        .required()
        .messages({
            'any.only': 'Status must be one of: pending, approved, rejected, needs_revision',
            'any.required': 'Review status is required'
        }),
    comment: Joi.string()
        .max(2000)
        .optional()
        .messages({
            'string.max': 'Comment cannot exceed 2000 characters'
        }),
    score: Joi.number()
        .min(0)
        .max(100)
        .optional()
        .messages({
            'number.min': 'Score must be at least 0',
            'number.max': 'Score cannot exceed 100'
        }),
    notes: Joi.array().items(
        Joi.object({
            field: Joi.string().max(100).required(),
            issue: Joi.string().max(500).required(),
            severity: Joi.string()
                .valid('minor', 'major', 'critical')
                .required()
        })
    ).optional()
});

/**
 * Validation schema for updating section score
 */
export const updateSectionScoreValidation = Joi.object({
    sectionName: Joi.string()
        .valid('businessInfo', 'legalDocuments', 'employeePractices',
            'sustainability', 'community', 'guestServices')
        .required(),
    score: Joi.number()
        .min(0)
        .max(100)
        .required()
        .messages({
            'number.min': 'Score must be at least 0',
            'number.max': 'Score cannot exceed 100',
            'any.required': 'Score is required'
        })
});

/**
 * Validation schema for adding compliance check
 */
export const addComplianceCheckValidation = Joi.object({
    category: Joi.string()
        .max(200)
        .required()
        .messages({
            'any.required': 'Category is required',
            'string.max': 'Category cannot exceed 200 characters'
        }),
    item: Joi.string()
        .max(500)
        .required()
        .messages({
            'any.required': 'Compliance item is required',
            'string.max': 'Item cannot exceed 500 characters'
        }),
    compliant: Joi.boolean()
        .required()
        .messages({
            'any.required': 'Compliance status is required'
        }),
    evidence: Joi.string()
        .max(1000)
        .optional(),
    comment: Joi.string()
        .max(1000)
        .optional()
});

/**
 * Validation schema for scheduling site visit
 */
export const scheduleSiteVisitValidation = Joi.object({
    visitDate: Joi.date()
        .min('now')
        .required()
        .messages({
            'date.min': 'Visit date must be in the future',
            'any.required': 'Visit date is required'
        }),
    duration: Joi.string()
        .max(100)
        .optional(),
    attendees: Joi.array()
        .items(Joi.string().max(200))
        .optional(),
    findings: Joi.string()
        .max(2000)
        .optional()
});

/**
 * Validation schema for updating site visit findings
 */
export const updateSiteVisitValidation = Joi.object({
    findings: Joi.string()
        .max(2000)
        .required()
        .messages({
            'any.required': 'Findings are required',
            'string.max': 'Findings cannot exceed 2000 characters'
        }),
    attendees: Joi.array()
        .items(Joi.string().max(200))
        .optional()
});

/**
 * Validation schema for completing audit
 */
export const completeAuditValidation = Joi.object({
    recommendation: Joi.string()
        .valid('approve', 'reject', 'conditional_approval')
        .required()
        .messages({
            'any.only': 'Recommendation must be one of: approve, reject, conditional_approval',
            'any.required': 'Final recommendation is required'
        }),
    finalComments: Joi.string()
        .max(5000)
        .required()
        .messages({
            'any.required': 'Final comments are required',
            'string.max': 'Final comments cannot exceed 5000 characters'
        }),
    overallScore: Joi.number()
        .min(0)
        .max(100)
        .optional()
});

/**
 * Validation schema for adding attachment
 */
export const addAttachmentValidation = Joi.object({
    fileName: Joi.string()
        .max(255)
        .required()
        .messages({
            'any.required': 'File name is required',
            'string.max': 'File name cannot exceed 255 characters'
        }),
    fileType: Joi.string()
        .max(50)
        .required()
        .messages({
            'any.required': 'File type is required'
        }),
    fileUrl: Joi.string()
        .uri()
        .required()
        .messages({
            'any.required': 'File URL is required',
            'string.uri': 'File URL must be a valid URI'
        }),
    description: Joi.string()
        .max(500)
        .optional()
});

/**
 * Validation schema for query parameters (filtering/pagination)
 */
export const getAuditsQueryValidation = Joi.object({
    hotel: Joi.string()
        .pattern(/^[0-9a-fA-F]{24}$/)
        .optional(),
    auditor: Joi.string()
        .pattern(/^[0-9a-fA-F]{24}$/)
        .optional(),
    auditStatus: Joi.string()
        .valid('initiated', 'in_progress', 'completed', 'suspended')
        .optional(),
    recommendation: Joi.string()
        .valid('approve', 'reject', 'conditional_approval', 'pending')
        .optional(),
    page: Joi.number()
        .integer()
        .min(1)
        .default(1),
    limit: Joi.number()
        .integer()
        .min(1)
        .max(100)
        .default(10),
    sortBy: Joi.string()
        .valid('createdAt', 'updatedAt', 'overallScore', 'auditCompletionDate')
        .default('createdAt'),
    order: Joi.string()
        .valid('asc', 'desc')
        .default('desc')
});
