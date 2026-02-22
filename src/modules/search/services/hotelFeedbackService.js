import Hotel from '../../certification/application/models/Hotel.js';
import Feedback from '../models/Feedback.js';

const getReviewSummary = async (hotelId) => {
    const feedbacks = await Feedback.find({ hotelId });
    const reviewCount = feedbacks.length;
    const averageRating =
        reviewCount === 0
            ? 0
            : Number(
                  (
                      feedbacks.reduce((sum, item) => sum + item.rating, 0) / reviewCount
                  ).toFixed(1),
              );

    return { reviewCount, averageRating, feedbacks };
};

const updateHotelAverageRating = async (hotelId, averageRating) => {
    await Hotel.findByIdAndUpdate(
        hotelId,
        { 'guestServices.experience.averageRating': averageRating },
        { new: true },
    );
};

export const getHotelFeedbackById = async (hotelId) => {
    const hotel = await Hotel.findById(hotelId, {
        _id: 1,
        'businessInfo.name': 1,
        'guestServices.experience.averageRating': 1,
    }).lean();

    if (!hotel) return null;

    const { feedbacks, reviewCount, averageRating } = await getReviewSummary(hotelId);

    return {
        hotelId: hotel._id,
        hotelName: hotel.businessInfo?.name,
        averageRating: averageRating || hotel.guestServices?.experience?.averageRating || 0,
        reviewCount,
        reviews: feedbacks.map((item) => ({
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

    const newFeedback = await Feedback.create({
        hotelId,
        userId: user._id,
        userName: user.name,
        rating: payload.rating,
        feedback: payload.feedback,
    });

    const { reviewCount, averageRating } = await getReviewSummary(hotelId);
    await updateHotelAverageRating(hotelId, averageRating);

    return {
        feedback: {
            feedbackId: newFeedback._id,
            userId: newFeedback.userId,
            userName: newFeedback.userName,
            rating: newFeedback.rating,
            feedback: newFeedback.feedback,
            createdAt: newFeedback.createdAt,
            updatedAt: newFeedback.updatedAt,
        },
        reviewCount,
        averageRating,
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

    const existing = await Feedback.findById(feedbackId);
    if (!existing) return { notFound: 'feedback' };

    if (existing.hotelId.toString() !== hotelId) {
        return { notFound: 'feedback' };
    }

    if (!isAdmin && existing.userId.toString() !== user._id.toString()) {
        return { forbidden: true };
    }

    if (payload.rating !== undefined) {
        existing.rating = payload.rating;
    }

    if (payload.feedback !== undefined) {
        existing.feedback = payload.feedback;
    }

    await existing.save();

    const { reviewCount, averageRating } = await getReviewSummary(hotelId);
    await updateHotelAverageRating(hotelId, averageRating);

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
        reviewCount,
        averageRating,
    };
};

export const deleteHotelFeedback = async (hotelId, feedbackId, user, isAdmin) => {
    const hotel = await Hotel.findById(hotelId);
    if (!hotel) return { notFound: 'hotel' };

    const existing = await Feedback.findById(feedbackId);
    if (!existing) return { notFound: 'feedback' };

    if (existing.hotelId.toString() !== hotelId) {
        return { notFound: 'feedback' };
    }

    if (!isAdmin && existing.userId.toString() !== user._id.toString()) {
        return { forbidden: true };
    }

    await Feedback.findByIdAndDelete(feedbackId);

    const { reviewCount, averageRating } = await getReviewSummary(hotelId);
    await updateHotelAverageRating(hotelId, averageRating);

    return { reviewCount, averageRating };
};
