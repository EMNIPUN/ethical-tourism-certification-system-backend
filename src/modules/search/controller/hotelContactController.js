import asyncHandler from '../../../common/utils/asyncHandler.js';
import * as hotelContactService from '../services/hotelContactService.js';

export const getHotelContactDetails = asyncHandler(async (req, res) => {
    console.info('[search][getHotelContactDetails] Request received');

    const contacts = await hotelContactService.getAllHotelContactDetails();

    console.info(`[search][getHotelContactDetails] Completed | count=${contacts.length}`);

    res.status(200).json({
        success: true,
        count: contacts.length,
        data: contacts
    });
});

export const getHotelContactDetailById = asyncHandler(async (req, res) => {
    console.info(`[search][getHotelContactDetailById] Request received | hotelId=${req.params.id}`);

    const contact = await hotelContactService.getHotelContactDetailsById(req.params.id);

    if (!contact) {
        res.status(404);
        throw new Error('Hotel contact details not found');
    }

    console.info(`[search][getHotelContactDetailById] Completed | hotelId=${req.params.id}`);

    res.status(200).json({
        success: true,
        data: contact
    });
});

export const searchHotelContactsByLocation = asyncHandler(async (req, res) => {
    const { location } = req.query;

    console.info(`[search][searchHotelContactsByLocation] Request received | location=${location || ''}`);

    if (!location || !location.trim()) {
        return res.status(400).json({
            success: false,
            error: 'location query parameter is required'
        });
    }

    const contacts = await hotelContactService.searchHotelContactsByLocation(location);

    console.info(
        `[search][searchHotelContactsByLocation] Completed | location=${location.trim()} count=${contacts.length}`
    );

    res.status(200).json({
        success: true,
        count: contacts.length,
        location,
        data: contacts
    });
});
