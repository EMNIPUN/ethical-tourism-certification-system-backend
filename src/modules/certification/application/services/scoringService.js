/**
 * scoringService.js
 * 
 * Contains pure domain logic for calculating hotel scores.
 * Independent of database or external APIs.
 */

/**
 * Calculates the data completion score based on populated fields.
 * 
 * @param {Object} data - The hotel data object.
 * @returns {number} The calculated data completion score (0-100).
 */
export const calculateDataCompletion = (data) => {
    let score = 0;
    let totalFields = 0;

    // Helper to check nested objects
    const checkFields = (obj) => {
        for (const key in obj) {
            if (obj[key] && typeof obj[key] === 'object' && !Array.isArray(obj[key])) {
                checkFields(obj[key]);
            } else if (Array.isArray(obj[key])) {
                totalFields++;
                if (obj[key].length > 0) score++;
            } else {
                totalFields++;
                if (obj[key]) score++;
            }
        }
    };

    if (data.businessInfo) checkFields(data.businessInfo);
    if (data.guestServices) checkFields(data.guestServices);
    if (data.employeePractices) checkFields(data.employeePractices);
    if (data.sustainability) checkFields(data.sustainability);
    if (data.community) checkFields(data.community);

    // Legal documents have a specific structure, treating the array existence as one field
    totalFields++;
    if (data.legalDocuments && data.legalDocuments.length > 0) score++;

    return totalFields > 0 ? Math.round((score / totalFields) * 100) : 0;
};

/**
 * Calculates the total score and certification level.
 * 
 * @param {Object} hotelData - The hotel data including scoring.
 * @returns {Object} The updated scoring object with totalScore and certificationLevel.
 */
export const calculateTotalScore = (hotelData) => {
    const scoring = hotelData.scoring || {};

    // Auto-calculate data completion if not provided
    if (scoring.dataCompletionScore === undefined) {
        scoring.dataCompletionScore = calculateDataCompletion(hotelData);
    }

    // Google rating conversion (0-5 stars -> 0-100 score)
    if (scoring.googleRating !== undefined) {
        scoring.googleReviewScore = Math.round((scoring.googleRating / 5) * 100);
    }

    // Weights: Data (30%), Google (20%), Auditor (50%)
    const dataWeight = 0.3;
    const googleWeight = 0.2;
    const auditorWeight = 0.5;

    const total = (
        (scoring.dataCompletionScore || 0) * dataWeight +
        (scoring.googleReviewScore || 0) * googleWeight +
        (scoring.auditorScore || 0) * auditorWeight
    );

    scoring.totalScore = Math.round(total);

    // Determine certification level
    if (scoring.totalScore >= 90) scoring.certificationLevel = 'Gold';
    else if (scoring.totalScore >= 70) scoring.certificationLevel = 'Silver';
    else if (scoring.totalScore >= 50) scoring.certificationLevel = 'Bronze';
    else scoring.certificationLevel = 'None';

    return scoring;
};
