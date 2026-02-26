import * as hotelService from '../services/hotelService.js';
import asyncHandler from '../../../../common/utils/asyncHandler.js';

/**
 * hotelController.js
 * 
 * Handles standard CRUD HTTP requests for Hotels.
 */

/**
 * Creates a new hotel via the API.
 * 
 * @description
 * Handles POST requests to `/api/hotels`.
 * Expects the hotel data in `req.body`.
 * Returns 201 Created on success, or 400 Bad Request on validation error.
 * 
 * @returns {Promise<void>}
 */
export const createHotel = asyncHandler(async (req, res) => {
    // 1. Parse JSON data from form-data
    let hotelData;
    try {
        hotelData = req.body.hotelData ? JSON.parse(req.body.hotelData) : req.body;
    } catch (err) {
        res.status(400);
        throw new Error("Invalid JSON format in hotelData field.");
    }

    // 2. Process Files
    if (req.files) {
        // Legal Documents
        if (req.files.legalDocuments && hotelData.legalDocuments) {
            req.files.legalDocuments.forEach((file, index) => {
                if (hotelData.legalDocuments[index]) {
                    hotelData.legalDocuments[index].file = {
                        data: file.buffer,
                        contentType: file.mimetype
                    };
                }
            });
        }

        // Employee Evidence
        if (!hotelData.employeePractices) hotelData.employeePractices = {};
        if (!hotelData.employeePractices.evidence) hotelData.employeePractices.evidence = {};

        if (req.files.salarySlips?.[0]) {
            hotelData.employeePractices.evidence.salarySlips = {
                data: req.files.salarySlips[0].buffer,
                contentType: req.files.salarySlips[0].mimetype
            };
        }
        if (req.files.staffHandbook?.[0]) {
            hotelData.employeePractices.evidence.staffHandbook = {
                data: req.files.staffHandbook[0].buffer,
                contentType: req.files.staffHandbook[0].mimetype
            };
        }
        if (req.files.hrPolicy?.[0]) {
            hotelData.employeePractices.evidence.hrPolicy = {
                data: req.files.hrPolicy[0].buffer,
                contentType: req.files.hrPolicy[0].mimetype
            };
        }
    }

    const { hotel, hotelRequest } = await hotelService.createHotel(hotelData);

    const hasPassed = hotelRequest.hotelScore.status === 'passed';
    const message = hasPassed
        ? "Hotel created successfully! The AI evaluation passed the initial ethical check."
        : "Hotel created, but the AI evaluation scored below the minimum threshold. Manual review may be required.";

    res.status(201).json({
        success: true,
        message: message,
        evaluation: {
            status: hotelRequest.hotelScore.status,
            aiScore: hotel.scoring.googleReviewScore,
            aiJustification: hotel.scoring.aiReviewJustification
        },
        data: {
            hotel,
            hotelRequest
        }
    });
});

/**
 * Retrieves a list of hotels via the API.
 * 
 * @description
 * Handles GET requests to `/api/hotels`.
 * parses query parameters for filtering, sorting, limiting, and pagination.
 */
export const getHotels = asyncHandler(async (req, res) => {
    const hotels = await hotelService.getAllHotels(req.query);
    res.status(200).json({ success: true, count: hotels.length, data: hotels });
});

/**
 * Retrieves a single hotel by ID via the API.
 * 
 * @description
 * Handles GET requests to `/api/hotels/:id`.
 */
export const getHotel = asyncHandler(async (req, res) => {
    const hotel = await hotelService.getHotelById(req.params.id);
    if (!hotel) {
        res.status(404);
        throw new Error('Hotel not found');
    }
    res.status(200).json({ success: true, data: hotel });
});

/**
 * Updates a hotel by ID via the API.
 * 
 * @description
 * Handles PUT requests to `/api/hotels/:id`.
 */
export const updateHotel = asyncHandler(async (req, res) => {
    // 1. Parse JSON data from form-data
    let hotelData;
    try {
        hotelData = req.body.hotelData ? JSON.parse(req.body.hotelData) : req.body;
    } catch (err) {
        res.status(400);
        throw new Error("Invalid JSON format in hotelData field.");
    }

    // 2. Process Files (similar to create)
    if (req.files) {
        if (req.files.legalDocuments && hotelData.legalDocuments) {
            req.files.legalDocuments.forEach((file, index) => {
                if (hotelData.legalDocuments[index]) {
                    hotelData.legalDocuments[index].file = {
                        data: file.buffer,
                        contentType: file.mimetype
                    };
                }
            });
        }

        if (req.files.salarySlips || req.files.staffHandbook || req.files.hrPolicy) {
            if (!hotelData.employeePractices) hotelData.employeePractices = {};
            if (!hotelData.employeePractices.evidence) hotelData.employeePractices.evidence = {};

            if (req.files.salarySlips?.[0]) {
                hotelData.employeePractices.evidence.salarySlips = {
                    data: req.files.salarySlips[0].buffer,
                    contentType: req.files.salarySlips[0].mimetype
                };
            }
            if (req.files.staffHandbook?.[0]) {
                hotelData.employeePractices.evidence.staffHandbook = {
                    data: req.files.staffHandbook[0].buffer,
                    contentType: req.files.staffHandbook[0].mimetype
                };
            }
            if (req.files.hrPolicy?.[0]) {
                hotelData.employeePractices.evidence.hrPolicy = {
                    data: req.files.hrPolicy[0].buffer,
                    contentType: req.files.hrPolicy[0].mimetype
                };
            }
        }
    }

    const hotel = await hotelService.updateHotelById(req.params.id, hotelData);
    if (!hotel) {
        res.status(404);
        throw new Error('Hotel not found');
    }
    res.status(200).json({ success: true, data: hotel });
});

/**
 * Deletes a hotel by ID via the API.
 * 
 * @description
 * Handles DELETE requests to `/api/hotels/:id`.
 */
export const deleteHotel = asyncHandler(async (req, res) => {
    const hotel = await hotelService.getHotelById(req.params.id);
    if (!hotel) {
        res.status(404);
        throw new Error('Hotel not found');
    }
    await hotelService.deleteHotelById(req.params.id);
    res.status(200).json({ success: true, data: {} });
});

