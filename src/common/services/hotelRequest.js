import HotelRequest from '../models/HotelRequest.js';

/**
 * Creates a new hotel request in the database.
 * 
 * @param {Object} data - The hotel request data object.
 * @returns {Promise<Object>} The created hotel request document.
 */
export const createHotelRequest = async (data) => {
    const hotelRequest = await HotelRequest.create(data);
    return hotelRequest;
};

/**
 * Retrieves a list of hotel requests based on query parameters.
 * Supports filtering, sorting, limiting, and pagination.
 * 
 * @param {Object} query - The query object from Express (req.query).
 * @returns {Promise<Array>} An array of hotel request documents matching the criteria.
 */
export const getAllHotelRequests = async (query) => {
    // 1. Filtering
    const queryObj = { ...query };
    const excludedFields = ['page', 'sort', 'limit', 'fields'];
    excludedFields.forEach((el) => delete queryObj[el]);

    // Advanced filtering (gt, gte, lt, lte)
    let queryStr = JSON.stringify(queryObj);
    queryStr = queryStr.replace(/\b(gte|gt|lte|lt)\b/g, (match) => `$${match}`);

    let mongooseQuery = HotelRequest.find(JSON.parse(queryStr));

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

    const hotelRequests = await mongooseQuery;
    return hotelRequests;
};

/**
 * Retrieves a single hotel request by its unique ID.
 * 
 * @param {string} id - The MongoDB ObjectId.
 * @returns {Promise<Object|null>} The hotel request document if found, otherwise null.
 */
export const getHotelRequestById = async (id) => {
    const hotelRequest = await HotelRequest.findById(id).populate('hotelId');
    return hotelRequest;
};

/**
 * Updates an existing hotel request record.
 * 
 * @param {string} id - The MongoDB ObjectId.
 * @param {Object} data - The data object to update.
 * @returns {Promise<Object|null>} The updated hotel request document, or null if not found.
 */
export const updateHotelRequestById = async (id, data) => {
    const hotelRequest = await HotelRequest.findByIdAndUpdate(id, data, {
        new: true,
        runValidators: true
    });
    return hotelRequest;
};

/**
 * Deletes a hotel request record from the database.
 * 
 * @param {string} id - The MongoDB ObjectId.
 * @returns {Promise<void>} Resolves when deletion is complete.
 */
export const deleteHotelRequestById = async (id) => {
    await HotelRequest.findByIdAndDelete(id);
};
