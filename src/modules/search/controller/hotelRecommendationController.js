import asyncHandler from '../../../common/utils/asyncHandler.js';
import * as recommendationService from '../services/hotelRecommendationService.js';
import * as comprehensiveAIService from '../services/hotelComprehensiveAIService.js';

export const getBestHotels = asyncHandler(async (req, res) => {
    const limit = req.query.limit ? parseInt(req.query.limit) : 10;
    const bestHotels = await recommendationService.getBestHotelsInSriLanka(limit);

    res.status(200).json({
        success: true,
        count: bestHotels.length,
        data: bestHotels,
    });
});

export const getBestHotelsNearMe = asyncHandler(async (req, res) => {
    const { latitude, longitude } = req.query;
    const limit = req.query.limit ? parseInt(req.query.limit) : 10;
    const radius = req.query.radius ? parseFloat(req.query.radius) : 50;

    if (!latitude || !longitude) {
        return res.status(400).json({
            success: false,
            error: 'latitude and longitude are required query parameters',
        });
    }

    const lat = parseFloat(latitude);
    const lon = parseFloat(longitude);

    if (isNaN(lat) || isNaN(lon)) {
        return res.status(400).json({
            success: false,
            error: 'latitude and longitude must be valid numbers',
        });
    }

    const nearbyHotels = await recommendationService.getBestHotelsNearLocation(lat, lon, radius, limit);

    res.status(200).json({
        success: true,
        count: nearbyHotels.length,
        userLocation: { latitude: lat, longitude: lon, radiusKm: radius },
        data: nearbyHotels,
    });
});

export const getAIHotelRecommendations = asyncHandler(async (req, res) => {
    const recommendations = await comprehensiveAIService.getAIHotelRecommendations();

    res.status(200).json({
        success: true,
        data: recommendations,
    });
});
