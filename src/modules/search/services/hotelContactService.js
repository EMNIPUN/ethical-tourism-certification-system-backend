import Hotel from '../../../common/models/Hotel.js';

const toHotelContactResponse = (hotel) => ({
    hotelId: hotel._id,
    hotelName: hotel.businessInfo?.name,
    ownerName: hotel.businessInfo?.contact?.ownerName,
    phone: hotel.businessInfo?.contact?.phone,
    email: hotel.businessInfo?.contact?.email,
    website: hotel.businessInfo?.contact?.website,
    address: hotel.businessInfo?.contact?.address,
    gps: hotel.businessInfo?.contact?.gps
});

export const getAllHotelContactDetails = async () => {
    const hotels = await Hotel.find(
        {},
        {
            _id: 1,
            'businessInfo.name': 1,
            'businessInfo.contact.ownerName': 1,
            'businessInfo.contact.phone': 1,
            'businessInfo.contact.email': 1,
            'businessInfo.contact.website': 1,
            'businessInfo.contact.address': 1,
            'businessInfo.contact.gps': 1
        }
    )
        .sort('-createdAt')
        .lean();

    return hotels.map(toHotelContactResponse);
};

export const getHotelContactDetailsById = async (id) => {
    const hotel = await Hotel.findById(
        id,
        {
            _id: 1,
            'businessInfo.name': 1,
            'businessInfo.contact.ownerName': 1,
            'businessInfo.contact.phone': 1,
            'businessInfo.contact.email': 1,
            'businessInfo.contact.website': 1,
            'businessInfo.contact.address': 1,
            'businessInfo.contact.gps': 1
        }
    ).lean();

    if (!hotel) return null;

    return toHotelContactResponse(hotel);
};
