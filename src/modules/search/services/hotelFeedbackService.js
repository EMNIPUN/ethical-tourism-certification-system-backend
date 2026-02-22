import Hotel from '../../../common/models/Hotel.js';

const getReviewSummary = (feedbacks = []) => {
    const reviewCount = feedbacks.length;
    const averageRating =
        reviewCount === 0
            ? 0
            : Number(
                  (
                      feedbacks.reduce((sum, item) => sum + item.rating, 0) / reviewCount
                  ).toFixed(1),
              );

    return { reviewCount, averageRating };
};

const applyAverageRatingToHotel = (hotel) => {
    if (!hotel.guestServices) {
        hotel.guestServices = {};
    }

    if (!hotel.guestServices.experience) {
        hotel.guestServices.experience = {};
    }

    const { averageRating } = getReviewSummary(hotel.feedbacks || []);
    hotel.guestServices.experience.averageRating = averageRating;
};

export const getHotelFeedbackById = async (hotelId) => {
    const hotel = await Hotel.findById(
        hotelId,
        {
            _id: 1,
            'businessInfo.name': 1,
            feedbacks: 1,
            'guestServices.experience.averageRating': 1,
        },
    ).lean();

    if (!hotel) return null;

    return {
        hotelId: hotel._id,
        hotelName: hotel.businessInfo?.name,
        averageRating: hotel.guestServices?.experience?.averageRating || 0,
        reviewCount: hotel.feedbacks?.length || 0,
        reviews: (hotel.feedbacks || []).map((item) => ({
            feedbackId: item._id,
            userId: item.userId,
            userName: item.userName,
            rating: item.rating,
            feedback: item.feedback,
            createdAt: item.createdAt,
            updatedAt: item.updatedAt,
        })),
    };
};

export const addFeedbackToHotel = async (hotelId, user, payload) => {
    const hotel = await Hotel.findById(hotelId);
    if (!hotel) return null;

    hotel.feedbacks.push({
        userId: user._id,
        userName: user.name,
        rating: payload.rating,
        feedback: payload.feedback,
    });

    applyAverageRatingToHotel(hotel);
    await hotel.save();

    const added = hotel.feedbacks[hotel.feedbacks.length - 1];
    const summary = getReviewSummary(hotel.feedbacks);

    return {
        feedback: {
            feedbackId: added._id,
            userId: added.userId,
            userName: added.userName,
            rating: added.rating,
            feedback: added.feedback,
            createdAt: added.createdAt,
            updatedAt: added.updatedAt,
        },
        ...summary,
    };
};

export const updateHotelFeedback = async (
    hotelId,
    feedbackId,
    user,
    payload,
    isAdmin,
) => {
    const hotel = await Hotel.findById(hotelId);
    if (!hotel) return { notFound: 'hotel' };

    const existing = hotel.feedbacks.id(feedbackId);
    if (!existing) return { notFound: 'feedback' };

    if (!isAdmin && existing.userId.toString() !== user._id.toString()) {
        return { forbidden: true };
    }

    if (payload.rating !== undefined) {
        existing.rating = payload.rating;
    }

    if (payload.feedback !== undefined) {
        existing.feedback = payload.feedback;
    }

    applyAverageRatingToHotel(hotel);
    await hotel.save();

    const summary = getReviewSummary(hotel.feedbacks);

    return {
        feedback: {
            feedbackId: existing._id,
            userId: existing.userId,
            userName: existing.userName,
            rating: existing.rating,
            feedback: existing.feedback,
            createdAt: existing.createdAt,
            updatedAt: existing.updatedAt,
        },
        ...summary,
    };
};

export const deleteHotelFeedback = async (hotelId, feedbackId, user, isAdmin) => {
    const hotel = await Hotel.findById(hotelId);
    if (!hotel) return { notFound: 'hotel' };

    const existing = hotel.feedbacks.id(feedbackId);
    if (!existing) return { notFound: 'feedback' };

    if (!isAdmin && existing.userId.toString() !== user._id.toString()) {
        return { forbidden: true };
    }

    existing.deleteOne();

    applyAverageRatingToHotel(hotel);
    await hotel.save();

    return getReviewSummary(hotel.feedbacks);
};
