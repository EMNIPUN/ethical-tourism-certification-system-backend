import Hotel from '../../../../common/models/Hotel.js';
import * as ratingService from './ratingService.js';
import { calculateTotalScore } from './scoringService.js';

/**
 * verificationService.js
 * 
 * Business logic for hotel verification and score updates.
 */

/**
 * Confirms a hotel match with Google via SerpApi.
 * Fetches rating, updates score, and saves.
 * 
 * @param {string} hotelId - The hotel ID.
 * @param {string|null} propertyToken - The selected Google property token (or null if skipped).
 * @returns {Promise<Object>} The updated hotel document.
 */
export const confirmHotelMatch = async (hotelId, propertyToken) => {
    const hotel = await Hotel.findById(hotelId);
    if (!hotel) {
        throw new Error('Hotel not found');
    }

    if (propertyToken) {
        hotel.businessInfo.serpApiPropertyToken = propertyToken;

        // Fetch rating using the token.
        // We rely on fetchGoogleRating from ratingService.js which searches by name again.
        // If the name is accurate, it should find it using the token or name match.
        const { rating } = await ratingService.fetchGoogleRating(hotel);

        if (rating !== null) {
            hotel.scoring.googleRating = rating;
        }
    } else {
        console.log(`Verification skipped for hotel ${hotelId}`);
    }

    // Recalculate scores
    const hotelObj = hotel.toObject();

    // Ensure googleReviewScore is updated based on new googleRating
    if (hotel.scoring.googleRating !== undefined) {
        hotel.scoring.googleReviewScore = Math.round((hotel.scoring.googleRating / 5) * 100);
    }

    // Recalculate total score
    // We pass hotel.scoring directly as calculateTotalScore mutates/reads it, 
    // but better to pass object fitting the expected interface
    const calculatedScoring = calculateTotalScore({ scoring: hotel.scoring });
    hotel.scoring = calculatedScoring;

    return await hotel.save();
};
