import Certificate from '../../../common/models/certificate.model.js';
import Feedback from '../models/Feedback.js';

const LOG_PREFIX = '[search][hotelComprehensiveAIService]';

const createServiceError = (message, statusCode = 500) => {
    const error = new Error(message);
    error.statusCode = statusCode;
    return error;
};

const buildHotelImage = (hotel = {}) => {
    const thumbnail = hotel?.googleMapsData?.thumbnail || null;
    const placeId = hotel?.googleMapsData?.placeId || null;

    return {
        thumbnail,
        placeId,
        source: thumbnail || placeId ? 'google_maps' : null,
    };
};

/**
 * Get comprehensive AI recommendations for all hotels
 * Analyzes all feedbacks across hotels and returns ranked recommendations
 */
export const getAIHotelRecommendations = async () => {
    try {
        console.info(`${LOG_PREFIX} Starting comprehensive AI recommendation flow`);

        // 1. Fetch all active certificates with hotel data
        const certificates = await Certificate.find({ status: 'ACTIVE' })
            .populate('hotelId', 'businessInfo guestServices scoring googleMapsData')
            .lean();

        console.info(`${LOG_PREFIX} Active certificates fetched: ${certificates.length}`);

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
                    ratingNumber: cert.hotelId.scoring?.totalScore || 0,
                    trustScore: cert.trustScore,
                    feedbackRating: feedbackAvgRating,
                    reviewCount: feedbacks.length,
                    feedbackTexts,
                    certificateNumber: cert.certificateNumber,
                    hotelImage: buildHotelImage(cert.hotelId),
                };
            })
        );

        const validHotels = hotelAnalysisData.filter((h) => h !== null);

        console.info(`${LOG_PREFIX} Valid hotels for analysis: ${validHotels.length}`);

        if (validHotels.length === 0) {
            console.warn(`${LOG_PREFIX} No certified hotels found for recommendation`);
            return {
                bestHotel: null,
                topHotels: [],
                aiAnalysis: 'No certified hotels found',
            };
        }

        // 3. Calculate score-based ranking from hotel analysis data
        const scoreRankedHotels = validHotels
            .map((hotel) => ({
                ...hotel,
                hotelId: String(hotel.hotelId),
                combinedScore: calculateHotelScore(hotel.feedbackRating, hotel.ratingNumber, hotel.trustScore),
            }))
            .sort((a, b) => b.combinedScore - a.combinedScore);

        // 4. Prepare data summary for AI
        const hotelsSummary = scoreRankedHotels
            .map(
                (h) =>
                    `\nID: ${h.hotelId}\n${h.hotelName} (${h.certificateLevel})\nCombined Score: ${h.combinedScore}/100\nHotel Rating Score: ${h.ratingNumber}/100\nTrust Score: ${h.trustScore}/100\nFeedback Rating: ${h.feedbackRating}/5 (${h.reviewCount} reviews)\nRecent Feedback:\n${h.feedbackTexts || 'No feedback yet'}`
            )
            .join('\n---\n');

        // 5. Send to OpenAI for comprehensive analysis and ranking
        const aiRanking = await getAIRankedRecommendations(hotelsSummary, scoreRankedHotels);

        console.info(
            `${LOG_PREFIX} AI ranking received | rankedIds=${aiRanking?.rankedHotelIds?.length || 0}`
        );

        // 6. Merge AI ranking with deterministic score ranking
        const rankedHotels = applyAIRanking(scoreRankedHotels, aiRanking.rankedHotelIds);

        // 7. Get best hotel
        const bestHotel = rankedHotels[0];

        console.info(
            `${LOG_PREFIX} Recommendation completed | bestHotel=${bestHotel?.hotelName || 'N/A'} topHotels=${Math.min(
                rankedHotels.length,
                5
            )}`
        );

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
                trustScore: bestHotel.trustScore,
                feedbackRating: bestHotel.feedbackRating,
                reviewCount: bestHotel.reviewCount,
                combinedScore: bestHotel.combinedScore,
                certificateNumber: bestHotel.certificateNumber,
                gps: bestHotel.gps,
                hotelImage: bestHotel.hotelImage,
                recommendation: aiRanking.bestHotelReason,
            } : null,
            topHotels: rankedHotels.slice(0, 5).map((h, index) => ({
                rank: index + 1,
                hotelId: h.hotelId,
                hotelName: h.hotelName,
                address: h.address,
                certificateLevel: h.certificateLevel,
                ratingNumber: h.ratingNumber,
                trustScore: h.trustScore,
                feedbackRating: h.feedbackRating,
                reviewCount: h.reviewCount,
                combinedScore: h.combinedScore,
                hotelImage: h.hotelImage,
            })),
            aiAnalysis: aiRanking.analysis,
            totalCertifiedHotels: validHotels.length,
        };
    } catch (error) {
        console.error(`${LOG_PREFIX} Error in getAIHotelRecommendations:`, error);
        throw createServiceError('Failed to generate AI hotel recommendations');
    }
};

/**
 * Use OpenAI to rank and recommend best hotels
 */
const getAIRankedRecommendations = async (hotelsSummary, validHotels) => {
    try {
        const apiKey = process.env.OPENAI_API_KEY;
        if (!apiKey) {
            console.warn(`${LOG_PREFIX} OPENAI_API_KEY missing, using fallback ranking`);
            return getFallbackRanking(validHotels);
        }

        const response = await fetch('https://api.openai.com/v1/chat/completions', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                Authorization: `Bearer ${apiKey}`,
            },
            body: JSON.stringify({
                model: 'gpt-4o-mini',
                messages: [
                    {
                        role: 'system',
                        content:
                            'You are an expert hotel recommendation AI for Sri Lanka. Rank hotels using only these metrics: Combined Score, Trust Score, Hotel Rating Score, and Feedback Rating with review count context. Return strict JSON with fields: bestHotelId, bestHotelReason, rankedHotelIds (array ordered best to worst), analysis (2-3 sentences).',
                    },
                    {
                        role: 'user',
                        content: `Based on the following hotel data, pick the best hotel and rank all hotels from best to worst:\n${hotelsSummary}\n\nPrioritize higher Combined Score. Return only valid JSON.`,
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
        const analysisText = data?.choices?.[0]?.message?.content || '';

        // Parse JSON from response safely
        const jsonMatch = analysisText.match(/\{[\s\S]*\}/);
        const analysis = jsonMatch ? parseJsonSafely(jsonMatch[0]) : null;
        if (!analysis) {
            console.warn(`${LOG_PREFIX} AI response JSON parsing failed, using fallback ranking`);
            return getFallbackRanking(validHotels);
        }

        const validHotelIds = new Set(validHotels.map((hotel) => String(hotel.hotelId)));
        const rankedHotelIds = Array.isArray(analysis.rankedHotelIds)
            ? analysis.rankedHotelIds.filter((id) => validHotelIds.has(String(id))).map(String)
            : [];

        return {
            bestHotelReason: analysis.bestHotelReason || 'Highly recommended based on feedback and trust score',
            analysis: analysis.analysis || 'Certified hotels in Sri Lanka offer excellent service quality',
            rankedHotelIds,
        };
    } catch (error) {
        console.error(`${LOG_PREFIX} Error calling OpenAI:`, error);
        return getFallbackRanking(validHotels);
    }
};

/**
 * Fallback ranking if OpenAI unavailable
 */
const getFallbackRanking = (validHotels) => {
    const ranked = [...validHotels].sort((a, b) => b.combinedScore - a.combinedScore);
    const best = ranked[0];

    return {
        bestHotelReason: `${best.hotelName} is recommended for its ${best.certificateLevel} certification and ${best.feedbackRating}/5 guest rating.`,
        analysis: `Hotels in Sri Lanka with active certifications maintain high standards. ${best.hotelName} stands out with excellent guest feedback.`,
        rankedHotelIds: ranked.map((hotel) => String(hotel.hotelId)),
    };
};

/**
 * Apply AI ranking first, then append remaining score-ranked hotels.
 */
const applyAIRanking = (scoreRankedHotels, rankedHotelIds = []) => {
    if (!Array.isArray(rankedHotelIds) || rankedHotelIds.length === 0) {
        return scoreRankedHotels;
    }

    const hotelMap = new Map(scoreRankedHotels.map((hotel) => [String(hotel.hotelId), hotel]));
    const aiRankedHotels = rankedHotelIds.map((id) => hotelMap.get(String(id))).filter(Boolean);
    const aiRankedIdSet = new Set(aiRankedHotels.map((hotel) => String(hotel.hotelId)));
    const remainingHotels = scoreRankedHotels.filter((hotel) => !aiRankedIdSet.has(String(hotel.hotelId)));

    return [...aiRankedHotels, ...remainingHotels];
};

/**
 * Safely parse JSON string.
 */
const parseJsonSafely = (value) => {
    try {
        return JSON.parse(value);
    } catch {
        return null;
    }
};

/**
 * Calculate combined score
 */
const calculateHotelScore = (feedbackAvgRating, ratingNumber, trustScore) => {
    const feedbackWeight = 0.4;
    const ratingNumberWeight = 0.3;
    const trustScoreWeight = 0.3;

    const normalizedFeedback = feedbackAvgRating ? (feedbackAvgRating / 5) * 100 : 0;
    const normalizedRatingNumber = ratingNumber || 0;
    const normalizedTrustScore = trustScore || 0;

    const combinedScore =
        normalizedFeedback * feedbackWeight +
        normalizedRatingNumber * ratingNumberWeight +
        normalizedTrustScore * trustScoreWeight;
    return Math.round(combinedScore);
};
