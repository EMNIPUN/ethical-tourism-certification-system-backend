import * as hotelService from '../services/hotelService.js';
import MatchLog from "../models/MatchLog.js";
import * as ratingService from '../services/ratingService.js';
import * as verificationService from '../services/verificationService.js';
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
    const hotel = await hotelService.createHotel(req.body);

    // Use enhanced matching logic
    const { match, candidates } = await ratingService.findBestMatch(hotel);

    // Create MatchLog entry
    const matchLog = new MatchLog({
        hotelId: hotel._id,
        hotelName: hotel.businessInfo.name,
        searchQuery: `${hotel.businessInfo.name} ${hotel.businessInfo.contact.address}`,
        matchFound: !!match || candidates.length > 0,
        autoMatched: false, // Always false now as we require manual confirmation
        matchScore: match ? match.matchScore : (candidates.length > 0 ? candidates[0].matchScore : 0),
        candidatesCount: candidates.length,
        candidates: candidates.map(c => ({
            name: c.name,
            address: c.address,
            score: c.matchScore,
            token: c.token,
            matchLogs: c.matchLogs // Debugging
        }))
    });
    await matchLog.save();

    // Always return 202 Created (Accepted) with candidates for manual confirmation
    // We do NOT save the match automatically anymore.
    res.status(202).json({
        success: true,
        data: {
            _id: hotel._id,
            name: hotel.businessInfo.name,
            address: hotel.businessInfo.contact.address
        },
        // We provide the "best match" as the first suggestion if available
        suggestedMatch: match ? {
            name: match.name,
            address: match.address || match.vicinity,
            rating: match.overall_rating,
            token: match.property_token,
            thumbnail: match.thumbnail,
            matchScore: match.matchScore,
            matchLogs: match.matchLogs
        } : null,
        candidates: candidates.map(c => ({
            name: c.name,
            address: c.address,
            matchScore: c.matchScore,
            matchLogs: c.matchLogs,
            token: c.token, // Ensure frontend has token to confirm
            thumbnail: c.thumbnail
        })),
        message: "Hotel created. Please confirm the correct Google Maps listing."
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
    const hotel = await hotelService.updateHotelById(req.params.id, req.body);
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

/**
 * Confirms a hotel match and updates scores.
 */
export const confirmMatch = asyncHandler(async (req, res) => {
    const { property_token } = req.body;
    const hotel = await verificationService.confirmHotelMatch(req.params.id, property_token);
    res.status(200).json({ success: true, data: hotel });
});
