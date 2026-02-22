import Hotel from '../../certification/application/models/Hotel.js';
import Certificate from '../../../common/models/certificate.model.js';

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

    return results;
};

export const getHotelContactDetailsById = async (id) => {
    const hotel = await Hotel.findById(id).lean();

    if (!hotel) return null;

    const certificate = await Certificate.findOne({ hotelId: id }).lean();

    return toHotelContactResponse(hotel, certificate);
};
