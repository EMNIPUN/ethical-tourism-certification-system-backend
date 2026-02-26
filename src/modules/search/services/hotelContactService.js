import Hotel from '../../certification/application/models/Hotel.js';
import Certificate from '../../../common/models/certificate.model.js';

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

const toHotelContactResponse = (hotel, certificate) => ({
    hotelId: hotel._id,
    businessInfo: hotel.businessInfo,
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
    createdAt: hotel.createdAt,
    updatedAt: hotel.updatedAt,
});

export const getAllHotelContactDetails = async () => {
    const hotels = await Hotel.find({})
        .sort('-createdAt')
        .lean();

    const results = await Promise.all(
        hotels.map(async (hotel) => {
            const certificate = await Certificate.findOne({ hotelId: hotel._id }).lean();
            return toHotelContactResponse(hotel, certificate);
        })
    );

    return results.sort(sortByCertificateLevelPriority);
};

export const getHotelContactDetailsById = async (id) => {
    const hotel = await Hotel.findById(id).lean();

    if (!hotel) return null;

    const certificate = await Certificate.findOne({ hotelId: id }).lean();

    return toHotelContactResponse(hotel, certificate);
};

export const searchHotelContactsByLocation = async (location) => {
    const normalizedLocation = location.trim().toLowerCase();

    const hotels = await Hotel.find({
        'businessInfo.contact.address': { $regex: normalizedLocation, $options: 'i' },
    })
        .sort('-createdAt')
        .lean();

    const results = await Promise.all(
        hotels.map(async (hotel) => {
            const certificate = await Certificate.findOne({ hotelId: hotel._id }).lean();
            return toHotelContactResponse(hotel, certificate);
        })
    );

    return results.sort(sortByCertificateLevelPriority);
};
