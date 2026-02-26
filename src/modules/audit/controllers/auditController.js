import auditService from '../services/auditService.js';
import asyncHandler from '../../../common/utils/asyncHandler.js';
import Hotel from '../../../modules/certification/application/models/Hotel.js';
import vectorDBService from '../services/vectorDBService.js';
import geminiService from '../services/geminiService.js';
import documentProcessingService from '../services/documentProcessingService.js';

/**
 * @desc    Create a new audit
 * @route   POST /api/v1/audits
 * @access  Admin
 */
export const createAudit = asyncHandler(async (req, res) => {
    const audit = await auditService.createAudit(req.body, req.user._id);

    res.status(201).json({
        success: true,
        message: 'Audit created successfully',
        data: audit
    });
});

/**
 * @desc    Get all audits with filtering and pagination
 * @route   GET /api/v1/audits
 * @access  Admin, Auditor
 */
export const getAllAudits = asyncHandler(async (req, res) => {
    const filters = {
        hotel: req.query.hotel,
        auditor: req.query.auditor,
        auditStatus: req.query.auditStatus,
        recommendation: req.query.recommendation
    };

    const pagination = {
        page: parseInt(req.query.page) || 1,
        limit: parseInt(req.query.limit) || 10,
        sortBy: req.query.sortBy || 'createdAt',
        order: req.query.order || 'desc'
    };

    // If user is an auditor, only show their audits
    if (req.user.role === 'Auditor') {
        filters.auditor = req.user._id;
    }

    const result = await auditService.getAllAudits(filters, pagination);

    res.status(200).json({
        success: true,
        data: result.audits,
        pagination: result.pagination
    });
});

/**
 * @desc    Get audit by ID
 * @route   GET /api/v1/audits/:id
 * @access  Admin, Auditor (own audits)
 */
export const getAuditById = asyncHandler(async (req, res) => {
    const audit = await auditService.getAuditById(req.params.id);

    // If user is auditor, check if they're assigned to this audit
    if (req.user.role === 'Auditor' && audit.auditor._id.toString() !== req.user._id.toString()) {
        return res.status(403).json({
            success: false,
            error: 'You are not authorized to view this audit'
        });
    }

    res.status(200).json({
        success: true,
        data: audit
    });
});

/**
 * @desc    Review a specific section
 * @route   PUT /api/v1/audits/:id/sections/review
 * @access  Admin, Auditor (assigned)
 */
export const reviewSection = asyncHandler(async (req, res) => {
    const { sectionName, status, comment, score, notes } = req.body;

    const audit = await auditService.reviewSection(
        req.params.id,
        sectionName,
        { status, comment, score, notes },
        req.user._id
    );

    res.status(200).json({
        success: true,
        message: `Section '${sectionName}' reviewed successfully`,
        data: audit
    });
});

/**
 * @desc    Update section score
 * @route   PUT /api/v1/audits/:id/sections/score
 * @access  Admin, Auditor (assigned)
 */
export const updateSectionScore = asyncHandler(async (req, res) => {
    const { sectionName, score } = req.body;

    const audit = await auditService.updateSectionScore(
        req.params.id,
        sectionName,
        score,
        req.user._id
    );

    res.status(200).json({
        success: true,
        message: `Score for '${sectionName}' updated successfully`,
        data: audit
    });
});

/**
 * @desc    Add compliance check
 * @route   POST /api/v1/audits/:id/compliance-checks
 * @access  Admin, Auditor (assigned)
 */
export const addComplianceCheck = asyncHandler(async (req, res) => {
    const audit = await auditService.addComplianceCheck(
        req.params.id,
        req.body,
        req.user._id
    );

    res.status(201).json({
        success: true,
        message: 'Compliance check added successfully',
        data: audit
    });
});

/**
 * @desc    Schedule site visit
 * @route   POST /api/v1/audits/:id/site-visit/schedule
 * @access  Admin, Auditor (assigned)
 */
export const scheduleSiteVisit = asyncHandler(async (req, res) => {
    const audit = await auditService.scheduleSiteVisit(
        req.params.id,
        req.body,
        req.user._id
    );

    res.status(200).json({
        success: true,
        message: 'Site visit scheduled successfully',
        data: audit
    });
});

/**
 * @desc    Update site visit findings
 * @route   PUT /api/v1/audits/:id/site-visit/findings
 * @access  Admin, Auditor (assigned)
 */
export const updateSiteVisitFindings = asyncHandler(async (req, res) => {
    const audit = await auditService.updateSiteVisitFindings(
        req.params.id,
        req.body,
        req.user._id
    );

    res.status(200).json({
        success: true,
        message: 'Site visit findings updated successfully',
        data: audit
    });
});

/**
 * @desc    Add attachment to audit
 * @route   POST /api/v1/audits/:id/attachments
 * @access  Admin, Auditor (assigned)
 */
export const addAttachment = asyncHandler(async (req, res) => {
    const audit = await auditService.addAttachment(
        req.params.id,
        req.body,
        req.user._id
    );

    res.status(201).json({
        success: true,
        message: 'Attachment added successfully',
        data: audit
    });
});

/**
 * @desc    Complete audit and submit final recommendation
 * @route   PUT /api/v1/audits/:id/complete
 * @access  Admin, Auditor (assigned)
 */
export const completeAudit = asyncHandler(async (req, res) => {
    const audit = await auditService.completeAudit(
        req.params.id,
        req.body,
        req.user._id
    );

    res.status(200).json({
        success: true,
        message: 'Audit completed successfully',
        data: audit
    });
});

/**
 * @desc    Get audits by hotel ID
 * @route   GET /api/v1/audits/hotel/:hotelId
 * @access  Admin, Auditor
 */
export const getAuditsByHotel = asyncHandler(async (req, res) => {
    const audits = await auditService.getAuditsByHotel(req.params.hotelId);

    res.status(200).json({
        success: true,
        count: audits.length,
        data: audits
    });
});

/**
 * @desc    Get audits by auditor ID
 * @route   GET /api/v1/audits/auditor/:auditorId
 * @access  Admin, Auditor (own audits)
 */
export const getAuditsByAuditor = asyncHandler(async (req, res) => {
    // If user is auditor, they can only see their own audits
    const auditorId = req.user.role === 'Auditor' ? req.user._id : req.params.auditorId;

    const audits = await auditService.getAuditsByAuditor(auditorId);

    res.status(200).json({
        success: true,
        count: audits.length,
        data: audits
    });
});

/**
 * @desc    Suspend an audit
 * @route   PUT /api/v1/audits/:id/suspend
 * @access  Admin
 */
export const suspendAudit = asyncHandler(async (req, res) => {
    const { reason } = req.body;

    if (!reason) {
        return res.status(400).json({
            success: false,
            error: 'Suspension reason is required'
        });
    }

    const audit = await auditService.suspendAudit(
        req.params.id,
        reason,
        req.user._id
    );

    res.status(200).json({
        success: true,
        message: 'Audit suspended successfully',
        data: audit
    });
});

/**
 * @desc    Resume a suspended audit
 * @route   PUT /api/v1/audits/:id/resume
 * @access  Admin
 */
export const resumeAudit = asyncHandler(async (req, res) => {
    const audit = await auditService.resumeAudit(req.params.id, req.user._id);

    res.status(200).json({
        success: true,
        message: 'Audit resumed successfully',
        data: audit
    });
});

/**
 * @desc    Delete an audit
 * @route   DELETE /api/v1/audits/:id
 * @access  Admin
 */
export const deleteAudit = asyncHandler(async (req, res) => {
    await auditService.deleteAudit(req.params.id);

    res.status(200).json({
        success: true,
        message: 'Audit deleted successfully'
    });
});

/**
 * @desc    Get audit statistics
 * @route   GET /api/v1/audits/stats/overview
 * @access  Admin
 */
export const getAuditStatistics = asyncHandler(async (req, res) => {
    const filters = {};

    if (req.query.auditor) filters.auditor = req.query.auditor;
    if (req.query.hotel) filters.hotel = req.query.hotel;

    const stats = await auditService.getAuditStatistics(filters);

    res.status(200).json({
        success: true,
        data: stats
    });
});

// ============= RAG SYSTEM ENDPOINTS =============

/**
 * @desc    Upload hotel documents and create vector embeddings
 * @route   POST /api/v1/audits/hotels/:hotelId/upload-documents
 * @access  Admin, Auditor, Hotel Owner
 */
export const uploadHotelDocuments = asyncHandler(async (req, res) => {
    const { hotelId } = req.params;

    // Get hotel data from database
    const hotel = await Hotel.findById(hotelId);
    if (!hotel) {
        return res.status(404).json({
            success: false,
            message: 'Hotel not found'
        });
    }

    // Get vector index for this hotel
    const index = await vectorDBService.getHotelIndex(hotelId);

    const processedDocs = [];
    let totalChunks = 0;
    const uploadedDocMetadata = [];

    // ===== PROCESS UPLOADED FILES FIRST =====
    if (req.files && req.files.length > 0) {
        for (let idx = 0; idx < req.files.length; idx++) {
            const file = req.files[idx];
            try {
                // Extract text from uploaded file buffer
                const text = await documentProcessingService.processDocumentBuffer(
                    file.buffer, 
                    file.originalname
                );
                
                const chunks = documentProcessingService.splitIntoChunks(text);
                
                // Create embeddings for each chunk
                for (let i = 0; i < chunks.length; i++) {
                    const embedding = await geminiService.generateEmbedding(chunks[i]);
                    await index.insertItem({
                        id: `uploaded_${idx}_chunk_${i}_${Date.now()}`,
                        metadata: { 
                            text: chunks[i],
                            source: file.originalname,
                            hotelId: hotelId,
                            type: 'uploaded_document'
                        },
                        vector: embedding
                    });
                    totalChunks++;
                }
                
                processedDocs.push(file.originalname);
                
                // Store metadata for hotel record update
                uploadedDocMetadata.push({
                    documentName: file.originalname,
                    type: file.mimetype,
                    uploadDate: new Date(),
                    processedIntoVectorDB: true
                });
            } catch (error) {
                console.error(`Error processing uploaded file ${file.originalname}:`, error.message);
            }
        }
    }

    // Process hotel basic info
    const basicInfo = `Hotel Name: ${hotel.businessInfo.name}
Registration: ${hotel.businessInfo.registrationNumber}
Business Type: ${hotel.businessInfo.businessType}
Owner: ${hotel.businessInfo.contact.ownerName}
Email: ${hotel.businessInfo.contact.email}
Phone: ${hotel.businessInfo.contact.phone}
Address: ${hotel.businessInfo.contact.address}`;

    const basicInfoChunks = documentProcessingService.splitIntoChunks(basicInfo);
    for (let i = 0; i < basicInfoChunks.length; i++) {
        const embedding = await geminiService.generateEmbedding(basicInfoChunks[i]);
        await index.insertItem({
            id: `basic_info_${i}`,
            metadata: { 
                text: basicInfoChunks[i],
                source: 'Business Information',
                hotelId: hotelId,
                type: 'structured_data'
            },
            vector: embedding
        });
        totalChunks++;
    }
    processedDocs.push('Business Information');

    // Process employee practices
    if (hotel.employeePractices) {
        const empInfo = `Total Employees: ${hotel.employeePractices.workforce?.totalEmployees || 'N/A'}
Permanent Staff: ${hotel.employeePractices.workforce?.permanentStaff || 'N/A'}
Local Employees: ${hotel.employeePractices.workforce?.localEmployeesPercentage || 'N/A'}%
Female Employees: ${hotel.employeePractices.workforce?.femaleEmployeesPercentage || 'N/A'}%
Minimum Wage Compliance: ${hotel.employeePractices.workerRights?.minimumWageCompliance ? 'Yes' : 'No'}
Health Insurance: ${hotel.employeePractices.workerRights?.healthInsuranceProvided ? 'Yes' : 'No'}
Overtime Policy: ${hotel.employeePractices.workerRights?.overtimePolicy || 'N/A'}`;

        const empChunks = documentProcessingService.splitIntoChunks(empInfo);
        for (let i = 0; i < empChunks.length; i++) {
            const embedding = await geminiService.generateEmbedding(empChunks[i]);
            await index.insertItem({
                id: `employee_${i}`,
                metadata: { 
                    text: empChunks[i],
                    source: 'Employee Practices',
                    hotelId: hotelId,
                    type: 'structured_data'
                },
                vector: embedding
            });
            totalChunks++;
        }
        processedDocs.push('Employee Practices');
    }

    // Process sustainability info
    if (hotel.sustainability) {
        const sustInfo = `Water Usage: ${hotel.sustainability.resourceUsage?.monthlyWaterUsage || 'N/A'}
Electricity Usage: ${hotel.sustainability.resourceUsage?.monthlyElectricityUsage || 'N/A'}
Renewable Energy: ${hotel.sustainability.resourceUsage?.renewableEnergyPercentage || 'N/A'}%
Waste Segregation: ${hotel.sustainability.wasteManagement?.wasteSegregation ? 'Yes' : 'No'}
Recycling Program: ${hotel.sustainability.wasteManagement?.recyclingProgram ? 'Yes' : 'No'}
Composting: ${hotel.sustainability.wasteManagement?.composting ? 'Yes' : 'No'}`;

        const sustChunks = documentProcessingService.splitIntoChunks(sustInfo);
        for (let i = 0; i < sustChunks.length; i++) {
            const embedding = await geminiService.generateEmbedding(sustChunks[i]);
            await index.insertItem({
                id: `sustainability_${i}`,
                metadata: { 
                    text: sustChunks[i],
                    source: 'Sustainability',
                    hotelId: hotelId,
                    type: 'structured_data'
                },
                vector: embedding
            });
            totalChunks++;
        }
        processedDocs.push('Sustainability Information');
    }

    // Process legal documents (PDFs, DOCX)
    if (hotel.legalDocuments && hotel.legalDocuments.length > 0) {
        for (let idx = 0; idx < hotel.legalDocuments.length; idx++) {
            const doc = hotel.legalDocuments[idx];
            if (doc.fileUrl) {
                try {
                    const text = await documentProcessingService.processDocument(doc.fileUrl);
                    const chunks = documentProcessingService.splitIntoChunks(text);
                    
                    for (let i = 0; i < chunks.length; i++) {
                        const embedding = await geminiService.generateEmbedding(chunks[i]);
                        await index.insertItem({
                            id: `legal_doc_${idx}_chunk_${i}`,
                            metadata: { 
                                text: chunks[i],
                                source: doc.documentName || 'Legal Document',
                                hotelId: hotelId,
                                type: 'legal_document'
                            },
                            vector: embedding
                        });
                        totalChunks++;
                    }
                    processedDocs.push(doc.documentName);
                } catch (error) {
                    console.error(`Error processing ${doc.documentName}:`, error.message);
                }
            }
        }
    }

    // Process employee evidence documents
    if (hotel.employeePractices?.evidence) {
        const evidence = hotel.employeePractices.evidence;
        const evidenceDocs = [
            { url: evidence.salarySlipsUrl, name: 'Salary Slips' },
            { url: evidence.staffHandbookUrl, name: 'Staff Handbook' },
            { url: evidence.hrPolicyUrl, name: 'HR Policy' }
        ];

        for (let idx = 0; idx < evidenceDocs.length; idx++) {
            const doc = evidenceDocs[idx];
            if (doc.url) {
                try {
                    const text = await documentProcessingService.processDocument(doc.url);
                    const chunks = documentProcessingService.splitIntoChunks(text);
                    
                    for (let i = 0; i < chunks.length; i++) {
                        const embedding = await geminiService.generateEmbedding(chunks[i]);
                        await index.insertItem({
                            id: `evidence_${idx}_chunk_${i}`,
                            metadata: { 
                                text: chunks[i],
                                source: doc.name,
                                hotelId: hotelId,
                                type: 'evidence_document'
                            },
                            vector: embedding
                        });
                        totalChunks++;
                    }
                    processedDocs.push(doc.name);
                } catch (error) {
                    console.error(`Error processing ${doc.name}:`, error.message);
                }
            }
        }
    }

    // Update hotel record with uploaded document metadata
    if (uploadedDocMetadata.length > 0) {
        await Hotel.findByIdAndUpdate(hotelId, {
            $push: { 
                legalDocuments: { $each: uploadedDocMetadata }
            }
        });
    }

    res.status(200).json({
        success: true,
        message: 'Hotel documents processed and stored in vector database',
        data: {
            hotelId,
            hotelName: hotel.businessInfo.name,
            processedDocuments: processedDocs,
            uploadedFiles: uploadedDocMetadata.length,
            totalChunks,
            timestamp: new Date()
        }
    });
});

/**
 * @desc    Query hotel data using RAG chatbot
 * @route   POST /api/v1/audits/hotels/:hotelId/chat
 * @access  Admin, Auditor
 */
export const chatWithHotelData = asyncHandler(async (req, res) => {
    const { hotelId } = req.params;
    const { query } = req.body;

    if (!query) {
        return res.status(400).json({
            success: false,
            message: 'Query is required'
        });
    }

    // Check if hotel exists
    const hotel = await Hotel.findById(hotelId);
    if (!hotel) {
        return res.status(404).json({
            success: false,
            message: 'Hotel not found'
        });
    }

    // Get vector index for this hotel
    const index = await vectorDBService.getHotelIndex(hotelId);

    // Check if index has data
    const indexExists = await index.isIndexCreated();
    if (!indexExists) {
        return res.status(400).json({
            success: false,
            message: 'No documents found for this hotel. Please upload documents first.'
        });
    }

    // Generate embedding for the query
    const queryEmbedding = await geminiService.generateEmbedding(query);

    // Search vector database
    const results = await index.queryItems(queryEmbedding, 5);

    if (!results || results.length === 0) {
        return res.status(200).json({
            success: true,
            data: {
                answer: "I don't have enough information to answer that question based on the available documents.",
                query,
                sources: []
            }
        });
    }

    // Prepare context documents
    const contextDocs = results.map(result => ({
        text: result.item.metadata.text || '',
        source: result.item.metadata.source,
        score: result.score
    }));

    // Generate response using RAG
    const answer = await geminiService.generateRAGResponse(query, contextDocs);

    res.status(200).json({
        success: true,
        data: {
            answer,
            query,
            sources: contextDocs.map(doc => ({
                source: doc.source,
                relevance: doc.score
            })),
            timestamp: new Date()
        }
    });
});
