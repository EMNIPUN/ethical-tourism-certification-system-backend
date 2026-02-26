import asyncHandler from '../../../common/utils/asyncHandler.js';
import * as comprehensiveAIService from '../services/hotelComprehensiveAIService.js';

export const getAIHotelRecommendations = asyncHandler(async (req, res) => {
    console.info('[search][getAIHotelRecommendations] Request received');

    const recommendations = await comprehensiveAIService.getAIHotelRecommendations();

    console.info(
        `[search][getAIHotelRecommendations] Completed | topHotels=${recommendations?.topHotels?.length || 0} totalCertifiedHotels=${recommendations?.totalCertifiedHotels || 0}`
    );

    res.status(200).json({
        success: true,
        data: recommendations,
    });
});
