import Certificate from '../../../common/models/certificate.model.js';
import Feedback from '../models/Feedback.js';

const LOG_PREFIX = '[search][hotelContactService]';

const CERTIFICATE_LEVEL_PRIORITY = {
    PLATINUM: 1,
    GOLD: 2,
    SILVER: 3,
};

const sortByCertificateLevelPriority = (a, b) => {
    const aLevel = a.certificate?.level;
    const bLevel = b.certificate?.level;

    const aPriority = CERTIFICATE_LEVEL_PRIORITY[aLevel] || Number.MAX_SAFE_INTEGER;
    const bPriority = CERTIFICATE_LEVEL_PRIORITY[bLevel] || Number.MAX_SAFE_INTEGER;

    if (aPriority !== bPriority) {
        return aPriority - bPriority;
    }

    const aTrustScore = a.certificate?.trustScore || 0;
    const bTrustScore = b.certificate?.trustScore || 0;
    return bTrustScore - aTrustScore;
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

const buildFeedbackSummaryMap = async (hotelIds = []) => {
    if (!hotelIds.length) {
        return new Map();
    }

    const feedbacks = await Feedback.find({
        hotelId: { $in: hotelIds },
    })
        .sort('-createdAt')
        .lean();

    const summaryMap = new Map();

    for (const feedback of feedbacks) {
        const hotelId = String(feedback.hotelId);
        const existing = summaryMap.get(hotelId) || {
            reviewCount: 0,
            averageRating: 0,
            totalRating: 0,
            recentFeedbacks: [],
        };

        existing.reviewCount += 1;
        existing.totalRating += Number(feedback.rating) || 0;

        if (existing.recentFeedbacks.length < 3) {
            existing.recentFeedbacks.push({
                rating: feedback.rating,
                feedback: feedback.feedback,
                createdAt: feedback.createdAt,
            });
        }

        summaryMap.set(hotelId, existing);
    }

    for (const [hotelId, summary] of summaryMap.entries()) {
        summary.averageRating = summary.reviewCount
            ? Number((summary.totalRating / summary.reviewCount).toFixed(1))
            : 0;
        delete summary.totalRating;
        summaryMap.set(hotelId, summary);
    }

    return summaryMap;
};

const toHotelContactResponse = (hotel, certificate, feedbackSummary) => ({
    hotelId: hotel._id,
    businessInfo: hotel.businessInfo,
    hotelImage: buildHotelImage(hotel),
    certificate: certificate ? {
        certificateNumber: certificate.certificateNumber,
        issuedDate: certificate.issuedDate,
        expiryDate: certificate.expiryDate,
        status: certificate.status,
        trustScore: certificate.trustScore,
        level: certificate.level,
        renewalCount: certificate.renewalCount,
        revokedReason: certificate.revokedReason,
        createdAt: certificate.createdAt,
        updatedAt: certificate.updatedAt,
    } : null,
    feedbackSummary: feedbackSummary || {
        reviewCount: 0,
        averageRating: 0,
        recentFeedbacks: [],
    },
    createdAt: hotel.createdAt,
    updatedAt: hotel.updatedAt,
});

export const getAllHotelContactDetails = async () => {
    console.info(`${LOG_PREFIX} getAllHotelContactDetails started`);

    const certificates = await Certificate.find({ status: 'ACTIVE' })
        .populate('hotelId')
        .sort('-createdAt')
        .lean();

    const validCertificates = certificates.filter((certificate) => certificate.hotelId);
    const hotelIds = validCertificates.map((certificate) => certificate.hotelId._id);
    const feedbackSummaryMap = await buildFeedbackSummaryMap(hotelIds);

    const results = validCertificates.map((certificate) => {
        const hotelIdString = String(certificate.hotelId._id);
        const feedbackSummary = feedbackSummaryMap.get(hotelIdString);

        return toHotelContactResponse(certificate.hotelId, certificate, feedbackSummary);
    });

    const sortedResults = results.sort(sortByCertificateLevelPriority);
    console.info(`${LOG_PREFIX} getAllHotelContactDetails completed | count=${sortedResults.length}`);

    return sortedResults;
};

export const getHotelContactDetailsById = async (id) => {
    console.info(`${LOG_PREFIX} getHotelContactDetailsById started | hotelId=${id}`);

    const certificate = await Certificate.findOne({
        status: 'ACTIVE',
        hotelId: id,
    })
        .populate('hotelId')
        .lean();

    if (!certificate?.hotelId) {
        console.info(`${LOG_PREFIX} getHotelContactDetailsById completed | hotelId=${id} found=false`);
        return null;
    }

    const feedbackSummaryMap = await buildFeedbackSummaryMap([certificate.hotelId._id]);
    const feedbackSummary = feedbackSummaryMap.get(String(certificate.hotelId._id));

    console.info(`${LOG_PREFIX} getHotelContactDetailsById completed | hotelId=${id} found=true`);

    return toHotelContactResponse(certificate.hotelId, certificate, feedbackSummary);
};

export const searchHotelContactsByLocation = async (location) => {
    const normalizedLocation = location.trim().toLowerCase();

    console.info(`${LOG_PREFIX} searchHotelContactsByLocation started | location=${normalizedLocation}`);

    const certificates = await Certificate.find({ status: 'ACTIVE' })
        .populate({
            path: 'hotelId',
            match: {
                'businessInfo.contact.address': {
                    $regex: normalizedLocation,
                    $options: 'i',
                },
            },
        })
        .sort('-createdAt')
        .lean();

    const matchedCertificates = certificates.filter((certificate) => certificate.hotelId);
    const hotelIds = matchedCertificates.map((certificate) => certificate.hotelId._id);
    const feedbackSummaryMap = await buildFeedbackSummaryMap(hotelIds);

    const results = matchedCertificates.map((certificate) => {
        const hotelIdString = String(certificate.hotelId._id);
        const feedbackSummary = feedbackSummaryMap.get(hotelIdString);

        return toHotelContactResponse(certificate.hotelId, certificate, feedbackSummary);
    });

    const sortedResults = results.sort(sortByCertificateLevelPriority);
    console.info(
        `${LOG_PREFIX} searchHotelContactsByLocation completed | location=${normalizedLocation} count=${sortedResults.length}`
    );

    return sortedResults;
};
