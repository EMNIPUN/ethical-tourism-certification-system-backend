import Hotel from '../models/Hotel.js';
import { calculateDataCompletion, calculateTotalScore } from './scoringService.js';

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

    // Initial scoring calculation (Data Completion only)
    const dataScore = calculateDataCompletion(data);

    // Ensure scoring object exists
    data.scoring = {
        dataCompletionScore: dataScore,
        googleRating: 0,
        googleReviewScore: 0,
        auditorScore: 0,
        totalScore: 0,
        certificationLevel: 'None',
        ...data.scoring // Merge any provided scoring
    };

    // Calculate initial total score (will be low without Google rating)
    const calculatedScoring = calculateTotalScore({ scoring: data.scoring });
    data.scoring = calculatedScoring;

    const hotel = await Hotel.create(data);
    return hotel;
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
    const excludedFields = ['page', 'sort', 'limit', 'fields'];
    excludedFields.forEach((el) => delete queryObj[el]);

    // Advanced filtering (gt, gte, lt, lte)
    let queryStr = JSON.stringify(queryObj);
    queryStr = queryStr.replace(/\b(gte|gt|lte|lt)\b/g, (match) => `$${match} `);

    let mongooseQuery = Hotel.find(JSON.parse(queryStr));

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

    // Fetch Google Rating if needed (e.g. if name/address changed or explicitly requested)
    if (data.businessInfo) {
        const { rating, token } = await fetchGoogleRating(hotel);
        if (rating !== null) {
            hotel.scoring = hotel.scoring || {};
            hotel.scoring.googleRating = rating;
        }
        if (token) {
            hotel.businessInfo.serpApiPropertyToken = token;
        }
    }

    // Recalculate scoring
    const hotelObj = hotel.toObject();
    const dataScore = calculateDataCompletion(hotelObj);

    if (!hotel.scoring) hotel.scoring = {};
    hotel.scoring.dataCompletionScore = dataScore;
    hotelObj.scoring = hotel.scoring;

    const calculatedScoring = calculateTotalScore(hotelObj);
    hotel.scoring = calculatedScoring;

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
    await Hotel.findByIdAndDelete(id);
};
