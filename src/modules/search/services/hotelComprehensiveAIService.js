import Certificate from '../../../common/models/certificate.model.js';
import Feedback from '../models/Feedback.js';

/**
 * Get comprehensive AI recommendations for all hotels
 * Analyzes all feedbacks across hotels and returns ranked recommendations
 */
export const getAIHotelRecommendations = async () => {
    try {
        // 1. Fetch all active certificates with hotel data
        const certificates = await Certificate.find({ status: 'ACTIVE' })
            .populate('hotelId', 'businessInfo guestServices')
            .lean();

        // 2. For each hotel, collect feedbacks and scores
        const hotelAnalysisData = await Promise.all(
            certificates.map(async (cert) => {
                if (!cert.hotelId) return null;

                const feedbacks = await Feedback.find({ hotelId: cert.hotelId._id }).lean();
                const feedbackAvgRating =
                    feedbacks.length > 0
                        ? Number((feedbacks.reduce((sum, f) => sum + f.rating, 0) / feedbacks.length).toFixed(1))
                        : 0;

                const feedbackTexts = feedbacks
                    .map((f) => `Rating: ${f.rating}/5 - "${f.feedback}"`)
                    .join('\n');

                return {
                    hotelId: cert.hotelId._id,
                    hotelName: cert.hotelId.businessInfo?.name,
                    address: cert.hotelId.businessInfo?.contact?.address,
                    ownerName: cert.hotelId.businessInfo?.contact?.ownerName,
                    email: cert.hotelId.businessInfo?.contact?.email,
                    phone: cert.hotelId.businessInfo?.contact?.phone,
                    gps: cert.hotelId.businessInfo?.contact?.gps,
                    certificateLevel: cert.level,
                    ratingNumber: cert.trustScore,
                    feedbackRating: feedbackAvgRating,
                    reviewCount: feedbacks.length,
                    feedbackTexts,
                    certificateNumber: cert.certificateNumber,
                };
            })
        );

        const validHotels = hotelAnalysisData.filter((h) => h !== null);

        if (validHotels.length === 0) {
            return {
                bestHotel: null,
                topHotels: [],
                aiAnalysis: 'No certified hotels found',
            };
        }

        // 3. Prepare data summary for AI
        const hotelsSummary = validHotels
            .map(
                (h) =>
                    `\n${h.hotelName} (${h.certificateLevel})\nRating Number: ${h.ratingNumber}\nFeedback Rating: ${h.feedbackRating}/5 (${h.reviewCount} reviews)\nRecent Feedback:\n${h.feedbackTexts}`
            )
            .join('\n---\n');

        // 4. Send to OpenAI for comprehensive analysis and ranking
        const aiRanking = await getAIRankedRecommendations(hotelsSummary, validHotels);

        // 5. Calculate combined scores and rank
        const rankedHotels = validHotels.map((hotel) => ({
            ...hotel,
            combinedScore: calculateHotelScore(hotel.feedbackRating, hotel.ratingNumber),
        }));

        rankedHotels.sort((a, b) => b.combinedScore - a.combinedScore);

        // 6. Get best hotel
        const bestHotel = rankedHotels[0];

        return {
            bestHotel: bestHotel ? {
                hotelId: bestHotel.hotelId,
                hotelName: bestHotel.hotelName,
                address: bestHotel.address,
                contact: {
                    ownerName: bestHotel.ownerName,
                    email: bestHotel.email,
                    phone: bestHotel.phone,
                },
                certificateLevel: bestHotel.certificateLevel,
                ratingNumber: bestHotel.ratingNumber,
                feedbackRating: bestHotel.feedbackRating,
                reviewCount: bestHotel.reviewCount,
                combinedScore: bestHotel.combinedScore,
                certificateNumber: bestHotel.certificateNumber,
                gps: bestHotel.gps,
                recommendation: aiRanking.bestHotelReason,
            } : null,
            topHotels: rankedHotels.slice(0, 10).map((h) => ({
                rank: rankedHotels.indexOf(h) + 1,
                hotelId: h.hotelId,
                hotelName: h.hotelName,
                address: h.address,
                certificateLevel: h.certificateLevel,
                ratingNumber: h.ratingNumber,
                feedbackRating: h.feedbackRating,
                reviewCount: h.reviewCount,
                combinedScore: h.combinedScore,
            })),
            aiAnalysis: aiRanking.analysis,
            totalCertifiedHotels: validHotels.length,
        };
    } catch (error) {
        console.error('Error in getAIHotelRecommendations:', error);
        throw error;
    }
};

/**
 * Use OpenAI to rank and recommend best hotels
 */
const getAIRankedRecommendations = async (hotelsSummary, validHotels) => {
    try {
        const apiKey = process.env.OPENAI_API_KEY;
        if (!apiKey) {
            throw new Error('OpenAI API key not configured');
        }

        const response = await fetch('https://api.openai.com/v1/chat/completions', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                Authorization: `Bearer ${apiKey}`,
            },
            body: JSON.stringify({
                model: 'gpt-3.5-turbo',
                messages: [
                    {
                        role: 'system',
                        content:
                            'You are an expert hotel recommendation AI for Sri Lanka. Based on guest feedback and certification trust scores, recommend the best hotel and provide analysis. Return response in JSON format with fields: bestHotelName, bestHotelReason, analysis (2-3 sentences about overall hotel quality in Sri Lanka based on feedback and trust scores).',
                    },
                    {
                        role: 'user',
                        content: `Based on the following hotel data, recommend the best hotel in Sri Lanka:\n${hotelsSummary}\n\nConsider both trust scores and guest feedback ratings. Return JSON response.`,
                    },
                ],
                temperature: 0.7,
                max_tokens: 600,
            }),
        });

        if (!response.ok) {
            throw new Error(`OpenAI API error: ${response.statusText}`);
        }

        const data = await response.json();
        const analysisText = data.choices[0].message.content;

        // Parse JSON from response
        const jsonMatch = analysisText.match(/\{[\s\S]*\}/);
        const analysis = jsonMatch ? JSON.parse(jsonMatch[0]) : getFallbackRanking(validHotels);

        return {
            bestHotelReason: analysis.bestHotelReason || 'Highly recommended based on feedback and trust score',
            analysis: analysis.analysis || 'Certified hotels in Sri Lanka offer excellent service quality',
        };
    } catch (error) {
        console.error('Error calling OpenAI:', error);
        return {
            bestHotelReason: 'Best hotel based on combined feedback and trust score',
            analysis: 'Unable to fetch AI analysis at this moment. Recommendations based on scores only.',
        };
    }
};

/**
 * Fallback ranking if OpenAI unavailable
 */
const getFallbackRanking = (validHotels) => {
    const best = validHotels.reduce((prev, current) => {
        const prevScore = calculateHotelScore(prev.feedbackRating, prev.ratingNumber);
        const currentScore = calculateHotelScore(current.feedbackRating, current.ratingNumber);
        return currentScore > prevScore ? current : prev;
    });

    return {
        bestHotelReason: `${best.hotelName} is recommended for its ${best.certificateLevel} certification and ${best.feedbackRating}/5 guest rating.`,
        analysis: `Hotels in Sri Lanka with active certifications maintain high standards. ${best.hotelName} stands out with excellent guest feedback.`,
    };
};

/**
 * Calculate combined score
 */
const calculateHotelScore = (feedbackAvgRating, certificateRatingNumber) => {
    const feedbackWeight = 0.6;
    const ratingNumberWeight = 0.4;

    const normalizedFeedback = feedbackAvgRating ? (feedbackAvgRating / 5) * 100 : 0;
    const normalizedRatingNumber = certificateRatingNumber || 0;

    const combinedScore = normalizedFeedback * feedbackWeight + normalizedRatingNumber * ratingNumberWeight;
    return Math.round(combinedScore);
};
