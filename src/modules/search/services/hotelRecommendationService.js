import Certificate from '../../../common/models/certificate.model.js';
import Feedback from '../models/Feedback.js';

/**
 * Calculate combined score for a hotel
 * Combines: Feedback rating (40%) + Hotel rating score (30%) + Certificate trust score (30%)
 */
export const calculateHotelScore = (feedbackAvgRating, hotelRatingScore, certificateTrustScore) => {
    const feedbackWeight = 0.4;
    const hotelRatingWeight = 0.3;
    const trustScoreWeight = 0.3;

    const normalizedFeedback = feedbackAvgRating ? (feedbackAvgRating / 5) * 100 : 0;
    const normalizedHotelRatingScore = hotelRatingScore || 0;
    const normalizedTrustScore = certificateTrustScore || 0;

    const combinedScore =
        normalizedFeedback * feedbackWeight +
        normalizedHotelRatingScore * hotelRatingWeight +
        normalizedTrustScore * trustScoreWeight;
    return Math.round(combinedScore);
};

/**
 * Calculate distance between two GPS coordinates using Haversine formula
 * Returns distance in kilometers
 */
export const calculateDistance = (lat1, lon1, lat2, lon2) => {
    const R = 6371; // Earth's radius in km
    const dLat = (lat2 - lat1) * (Math.PI / 180);
    const dLon = (lon2 - lon1) * (Math.PI / 180);
    const a =
        Math.sin(dLat / 2) * Math.sin(dLat / 2) +
        Math.cos(lat1 * (Math.PI / 180)) * Math.cos(lat2 * (Math.PI / 180)) * Math.sin(dLon / 2) * Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
};

/**
 * Get best hotels in Sri Lanka sorted by combined score
 */
export const getBestHotelsInSriLanka = async (limit = 10) => {
    const certificates = await Certificate.find({ status: 'ACTIVE' })
        .populate('hotelId', 'businessInfo guestServices scoring')
        .sort({ trustScore: -1 })
        .lean();

    const hotelScores = await Promise.all(
        certificates.map(async (cert) => {
            if (!cert.hotelId) return null;

            const feedbacks = await Feedback.find({ hotelId: cert.hotelId._id });
            const feedbackAvgRating =
                feedbacks.length > 0
                    ? Number((feedbacks.reduce((sum, f) => sum + f.rating, 0) / feedbacks.length).toFixed(1))
                    : 0;

            const hotelRatingScore = cert.hotelId.scoring?.totalScore || 0;

            const combinedScore = calculateHotelScore(feedbackAvgRating, hotelRatingScore, cert.trustScore);

            return {
                hotelId: cert.hotelId._id,
                hotelName: cert.hotelId.businessInfo?.name,
                address: cert.hotelId.businessInfo?.contact?.address,
                gps: cert.hotelId.businessInfo?.contact?.gps,
                certificateLevel: cert.level,
                ratingNumber: hotelRatingScore,
                certificateTrustScore: cert.trustScore,
                feedbackRating: feedbackAvgRating,
                reviewCount: feedbacks.length,
                combinedScore,
                certificateNumber: cert.certificateNumber,
            };
        })
    );

    return hotelScores
        .filter((h) => h !== null)
        .sort((a, b) => b.combinedScore - a.combinedScore)
        .slice(0, limit);
};

/**
 * Get best hotels near user's GPS location
 */
export const getBestHotelsNearLocation = async (userLat, userLon, radiusKm = 50, limit = 10) => {
    const certificates = await Certificate.find({ status: 'ACTIVE' })
        .populate('hotelId', 'businessInfo guestServices scoring')
        .lean();

    const hotelScores = await Promise.all(
        certificates
            .filter((cert) => cert.hotelId?.businessInfo?.contact?.gps)
            .map(async (cert) => {
                const hotelGps = cert.hotelId.businessInfo.contact.gps;
                const distance = calculateDistance(userLat, userLon, hotelGps.latitude, hotelGps.longitude);

                if (distance > radiusKm) return null;

                const feedbacks = await Feedback.find({ hotelId: cert.hotelId._id });
                const feedbackAvgRating =
                    feedbacks.length > 0
                        ? Number((feedbacks.reduce((sum, f) => sum + f.rating, 0) / feedbacks.length).toFixed(1))
                        : 0;

                const hotelRatingScore = cert.hotelId.scoring?.totalScore || 0;

                const combinedScore = calculateHotelScore(feedbackAvgRating, hotelRatingScore, cert.trustScore);

                return {
                    hotelId: cert.hotelId._id,
                    hotelName: cert.hotelId.businessInfo?.name,
                    address: cert.hotelId.businessInfo?.contact?.address,
                    gps: cert.hotelId.businessInfo?.contact?.gps,
                    certificateLevel: cert.level,
                    ratingNumber: hotelRatingScore,
                    certificateTrustScore: cert.trustScore,
                    feedbackRating: feedbackAvgRating,
                    reviewCount: feedbacks.length,
                    combinedScore,
                    distanceKm: Number(distance.toFixed(2)),
                    certificateNumber: cert.certificateNumber,
                };
            })
    );

    return hotelScores
        .filter((h) => h !== null)
        .sort((a, b) => b.combinedScore - a.combinedScore)
        .slice(0, limit);
};
