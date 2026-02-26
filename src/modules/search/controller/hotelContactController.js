import asyncHandler from '../../../common/utils/asyncHandler.js';
import * as hotelContactService from '../services/hotelContactService.js';

export const getHotelContactDetails = asyncHandler(async (req, res) => {
    const contacts = await hotelContactService.getAllHotelContactDetails();

    res.status(200).json({
        success: true,
        count: contacts.length,
        data: contacts
    });
});

export const getHotelContactDetailById = asyncHandler(async (req, res) => {
    const contact = await hotelContactService.getHotelContactDetailsById(req.params.id);

    if (!contact) {
        res.status(404);
        throw new Error('Hotel contact details not found');
    }

    res.status(200).json({
        success: true,
        data: contact
    });
});

export const searchHotelContactsByLocation = asyncHandler(async (req, res) => {
    const { location } = req.query;

    if (!location || !location.trim()) {
        return res.status(400).json({
            success: false,
            error: 'location query parameter is required'
        });
    }

    const contacts = await hotelContactService.searchHotelContactsByLocation(location);

    res.status(200).json({
        success: true,
        count: contacts.length,
        location,
        data: contacts
    });
});
