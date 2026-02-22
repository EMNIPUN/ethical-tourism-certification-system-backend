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
    const hotel = await hotelService.createHotel(req.body);

    res.status(201).json({
        success: true,
        data: hotel,
        message: "Hotel created successfully."
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

