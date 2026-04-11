import Hotel from '../models/Hotel.js';
import HotelRequest from '../../../../common/models/HotelRequest.js';
import { searchHotelCandidates, evaluateHotelReviews, getGoogleMapsDetails } from './evaluationAgent.js';



/**
 * hotelService.js
 * 
 * Handles Core CRUD operations for Hotels.
 * Delegates domain logic (scoring) and external integrations (rating) to other services.
 */

/**
 * Creates a new hotel record in the database.
 * 
 * @param {Object} data - The hotel data object.
 * @returns {Promise<Object>} The created hotel document.
 */
export const createHotel = async (data) => {
    // 0. Duplicate Check
    const existingHotel = await Hotel.findOne({
        $or: [
            { 'businessInfo.contact.email': data.businessInfo.contact.email },
            {
                'businessInfo.name': { $regex: new RegExp(`^${data.businessInfo.name}$`, 'i') },
                'businessInfo.contact.address': { $regex: new RegExp(`^${data.businessInfo.contact.address}$`, 'i') }
            }
        ]
    });

    if (existingHotel) {
        const msg = existingHotel.businessInfo.contact.email === data.businessInfo.contact.email
            ? `Hotel already registered with email: ${data.businessInfo.contact.email}`
            : `Hotel already registered: ${data.businessInfo.name} at ${data.businessInfo.contact.address}`;
        const error = new Error(msg);
        error.statusCode = 409;
        throw error;
    }

    // Ensure scoring object exists
    data.scoring = {
        dataCompletionScore: 0,
        googleRating: 0,
        googleReviewScore: 0,
        aiReviewJustification: '',
        auditorScore: 0,
        totalScore: 0,
        certificationLevel: 'None',
        ...data.scoring // Merge any provided scoring
    };

    let candidates = [];
    try {
        console.log("Searching for hotel candidates via AI Agent...");
        candidates = await searchHotelCandidates({
            name: data.businessInfo?.name,
            address: data.businessInfo?.contact?.address,
            type: data.businessInfo?.businessType
        });
        console.log("Candidate Search completed:", candidates.length, "found.");
    } catch (err) {
        console.error("Agent Search failed during registration:", err);
    }

    const hotel = await Hotel.create(data);

    return { hotel, candidates };
};

/**
 * Confirms the hotel's Google Maps match and performs the final AI review evaluation.
 * 
 * @param {string} hotelId - The ID of the registered hotel.
 * @param {string|null} placeId - The selected Google place_id, or null if none matched.
 * @returns {Promise<Object>} Object containing the updated hotel and the new hotelRequest.
 */
export const confirmHotelMatch = async (hotelId, placeId, clientThumbnail) => {
    const hotel = await Hotel.findById(hotelId);
    if (!hotel) {
        throw new Error("Hotel not found");
    }

    let hotelScoreStatus = 'pending';
    let evaluationResult = null;

    if (placeId) {
        try {
            console.log(`Evaluating reviews for place_id: ${placeId}`);

            // Fetch map details for GPS/address (thumbnail used as fallback if client didn't provide one)
            const mapDetails = await getGoogleMapsDetails(placeId);
            if (mapDetails) {
                hotel.googleMapsData = {
                    placeId: mapDetails.place_id || placeId,
                    // Prefer thumbnail already available from the candidate list (no extra API call needed)
                    thumbnail: clientThumbnail || mapDetails.thumbnail,
                    address: mapDetails.address,
                    gps: mapDetails.gps
                };
            } else if (clientThumbnail) {
                // mapDetails call failed but we still have the thumbnail from the candidate picker
                hotel.googleMapsData = {
                    placeId: placeId,
                    thumbnail: clientThumbnail,
                };
            }

            evaluationResult = await evaluateHotelReviews(placeId, {
                name: hotel.businessInfo?.name,
                address: hotel.businessInfo?.contact?.address,
                type: hotel.businessInfo?.businessType
            });

            hotel.scoring.googleReviewScore = evaluationResult.score || 0;
            hotel.scoring.aiReviewJustification = evaluationResult.justification || '';

            await hotel.save();

            hotelScoreStatus = hotel.scoring.googleReviewScore >= 60 ? 'passed' : 'failed';
            console.log("AI Review Evaluation completed:", evaluationResult);
        } catch (err) {
            console.error("AI Review Evaluation failed:", err);
            hotelScoreStatus = 'failed';
        }
    }

    // Create the HotelRequest based on the status
    const hotelRequest = await HotelRequest.create({
        hotelId: hotel._id,
        hotelScore: { status: hotelScoreStatus },
        auditScore: { status: 'pending' }
    });

    return { hotel, hotelRequest, evaluationResult };
};

export const getHotelCandidates = async (hotelId, requesterEmail) => {
    const hotel = await Hotel.findById(hotelId);
    if (!hotel) {
        const error = new Error('Hotel not found');
        error.statusCode = 404;
        throw error;
    }

    const normalizedRequesterEmail = String(requesterEmail || '').trim().toLowerCase();
    const hotelEmail = String(hotel.businessInfo?.contact?.email || '').trim().toLowerCase();

    if (normalizedRequesterEmail && hotelEmail && normalizedRequesterEmail !== hotelEmail) {
        const error = new Error('Not authorized to access this hotel');
        error.statusCode = 403;
        throw error;
    }

    let candidates = [];
    try {
        candidates = await searchHotelCandidates({
            name: hotel.businessInfo?.name,
            address: hotel.businessInfo?.contact?.address,
            type: hotel.businessInfo?.businessType,
        });
    } catch (err) {
        console.error('Candidate search failed:', err);
    }

    return candidates;
};


/**
 * Retrieves a list of hotels based on query parameters.
 * Supports filtering, sorting, limiting, and pagination.
 * 
 * @param {Object} query - The query object from Express (req.query).
 * @returns {Promise<Array>} An array of hotel documents matching the criteria.
 */
export const getAllHotels = async (query) => {
    // 1. Filtering
    const queryObj = { ...query };
    const excludedFields = ['page', 'sort', 'limit', 'fields', 'search'];
    excludedFields.forEach((el) => delete queryObj[el]);

    // Advanced filtering (gt, gte, lt, lte, regex, options)
    let queryStr = JSON.stringify(queryObj);
    queryStr = queryStr.replace(/\b(gte|gt|lte|lt|regex|options)\b/g, (match) => `$${match}`);

    const mongoFilter = JSON.parse(queryStr);

    // Dedicated full-text name search via ?search=...
    if (query.search && query.search.trim()) {
        mongoFilter['businessInfo.name'] = {
            $regex: query.search.trim(),
            $options: 'i',
        };
    }

    let mongooseQuery = Hotel.find(mongoFilter);

    // 2. Sorting
    if (query.sort) {
        const sortBy = query.sort.split(',').join(' ');
        mongooseQuery = mongooseQuery.sort(sortBy);
    } else {
        mongooseQuery = mongooseQuery.sort('-createdAt');
    }

    // 3. Field Limiting
    if (query.fields) {
        const fields = query.fields.split(',').join(' ');
        mongooseQuery = mongooseQuery.select(fields);
    } else {
        mongooseQuery = mongooseQuery.select('-__v');
    }

    // 4. Pagination
    const page = query.page * 1 || 1;
    const limit = query.limit * 1 || 100;
    const skip = (page - 1) * limit;

    mongooseQuery = mongooseQuery.skip(skip).limit(limit);

    const hotels = await mongooseQuery;
    return hotels;
};

/**
 * Retrieves a single hotel by its unique ID.
 * 
 * @param {string} id - The MongoDB ObjectId.
 * @returns {Promise<Object|null>} The hotel document if found, otherwise null.
 */
export const getHotelById = async (id) => {
    const hotel = await Hotel.findById(id);
    return hotel;
};

/**
 * Updates an existing hotel record.
 * 
 * @param {string} id - The MongoDB ObjectId.
 * @param {Object} data - The partial or complete data object to update.
 * @returns {Promise<Object|null>} The updated hotel document, or null if not found.
 */
export const updateHotelById = async (id, data) => {
    const hotel = await Hotel.findById(id);
    if (!hotel) return null;

    // Update fields
    Object.assign(hotel, data);



    await hotel.save();
    return hotel;
};

/**
 * Deletes a hotel record from the database.
 * 
 * @param {string} id - The MongoDB ObjectId.
 * @returns {Promise<void>} Resolves when deletion is complete.
 */
export const deleteHotelById = async (id) => {
    // Note: We use deleteOne or findByIdAndDelete for the Hotel
    // and deleteMany for associated requests
    await Hotel.findByIdAndDelete(id);
    await HotelRequest.deleteMany({ hotelId: id });
};
