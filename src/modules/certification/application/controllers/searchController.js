import * as ratingService from '../services/ratingService.js';
import asyncHandler from '../../../../common/utils/asyncHandler.js';

/**
 * searchController.js
 * 
 * Handles hotel search requests.
 * Owner: Nipun
 */

export const searchHotels = asyncHandler(async (req, res) => {
    const { q } = req.query;
    if (!q) {
        res.status(400);
        throw new Error("Query parameter 'q' is required.");
    }

    const results = await ratingService.searchMatches(q);
    res.status(200).json({ success: true, count: results.length, data: results });
});
