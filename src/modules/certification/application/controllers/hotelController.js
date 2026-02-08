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
        autoMatched: !!match,
        matchScore: match ? match.matchScore : (candidates.length > 0 ? candidates[0].matchScore : 0),
        candidatesCount: candidates.length,
        candidates: candidates.map(c => ({
            name: c.name,
            address: c.address,
            score: c.matchScore,
            token: c.token
        }))
    });
    await matchLog.save();

    if (match) {
        // Auto-match found: Update hotel with token and rating
        hotel.businessInfo.serpApiPropertyToken = match.property_token;
        if (!hotel.scoring) hotel.scoring = {};
        hotel.scoring.googleRating = match.overall_rating || 0;
        await hotel.save();

        res.status(201).json({
            success: true,
            data: hotel,
            match: match,
            message: "Hotel created and verified against Google Hotels."
        });
    } else if (candidates.length > 0) {
        // Ambiguous: Return candidates for user selection
        res.status(202).json({
            success: true,
            data: hotel,
            candidates: candidates,
            message: "Hotel created. Please select the correct Google Maps listing from the candidates."
        });
    } else {
        // No match found
        res.status(201).json({
            success: true,
            data: hotel,
            message: "Hotel created. No corresponding Google Maps listing found."
        });
    }
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
