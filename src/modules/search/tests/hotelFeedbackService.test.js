import { beforeEach, describe, expect, it, jest } from '@jest/globals';

const hotelFindById = jest.fn();
const hotelFindByIdAndUpdate = jest.fn();

const feedbackFind = jest.fn();
const feedbackCreate = jest.fn();
const feedbackFindById = jest.fn();
const feedbackFindByIdAndDelete = jest.fn();

const updateCertificateTrustScore = jest.fn();

jest.unstable_mockModule('../../certification/application/models/Hotel.js', () => ({
  default: {
    findById: hotelFindById,
    findByIdAndUpdate: hotelFindByIdAndUpdate,
  },
}));

jest.unstable_mockModule('../models/Feedback.js', () => ({
  default: {
    find: feedbackFind,
    create: feedbackCreate,
    findById: feedbackFindById,
    findByIdAndDelete: feedbackFindByIdAndDelete,
  },
}));

jest.unstable_mockModule('../../certification/lifecycle/services/lifecycleService.js', () => ({
  updateCertificateTrustScore,
}));

const {
  getHotelFeedbackById,
  addFeedbackToHotel,
  updateHotelFeedback,
  addFeedbackAndSyncCertificate,
  deleteHotelFeedback,
} = await import('../services/hotelFeedbackService.js');

const makeId = (value) => ({ toString: () => value });

const createHotelLeanQuery = (hotel) => ({
  lean: jest.fn(async () => hotel),
});

describe('hotelFeedbackService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('returns null when hotel does not exist in getHotelFeedbackById', async () => {
    hotelFindById.mockReturnValue(createHotelLeanQuery(null));

    const result = await getHotelFeedbackById('hotel-x');

    expect(result).toBeNull();
    expect(hotelFindById).toHaveBeenCalledWith('hotel-x', {
      _id: 1,
      'businessInfo.name': 1,
      'guestServices.experience.averageRating': 1,
    });
  });

  it('adds feedback and recalculates hotel average rating', async () => {
    hotelFindById.mockResolvedValue({ _id: 'hotel-1' });
    feedbackCreate.mockResolvedValue({
      _id: 'f-1',
      userId: 'user-1',
      userName: 'Nipun',
      rating: 5,
      feedback: 'Excellent stay',
      createdAt: new Date('2025-01-01T00:00:00.000Z'),
      updatedAt: new Date('2025-01-01T00:00:00.000Z'),
    });
    feedbackFind.mockResolvedValue([
      { rating: 4 },
      { rating: 2 },
    ]);

    const result = await addFeedbackToHotel(
      'hotel-1',
      { _id: 'user-1', name: 'Nipun' },
      { rating: 5, feedback: 'Excellent stay' }
    );

    expect(feedbackCreate).toHaveBeenCalledWith({
      hotelId: 'hotel-1',
      userId: 'user-1',
      userName: 'Nipun',
      rating: 5,
      feedback: 'Excellent stay',
    });
    expect(hotelFindByIdAndUpdate).toHaveBeenCalledWith(
      'hotel-1',
      { 'guestServices.experience.averageRating': 3 },
      { new: true }
    );
    expect(result.reviewCount).toBe(2);
    expect(result.averageRating).toBe(3);
  });

  it('returns forbidden when non-admin tries to update another user feedback', async () => {
    hotelFindById.mockResolvedValue({ _id: 'hotel-1' });
    feedbackFindById.mockResolvedValue({
      _id: 'feedback-1',
      hotelId: makeId('hotel-1'),
      userId: makeId('owner-1'),
    });

    const result = await updateHotelFeedback(
      'hotel-1',
      'feedback-1',
      { _id: 'other-user' },
      { rating: 1 },
      false
    );

    expect(result).toEqual({ forbidden: true });
  });

  it('deletes feedback and returns updated summary', async () => {
    hotelFindById.mockResolvedValue({ _id: 'hotel-1' });
    feedbackFindById.mockResolvedValue({
      _id: 'feedback-1',
      hotelId: makeId('hotel-1'),
      userId: makeId('user-1'),
    });
    feedbackFind.mockResolvedValue([{ rating: 5 }]);

    const result = await deleteHotelFeedback('hotel-1', 'feedback-1', { _id: 'user-1' }, false);

    expect(feedbackFindByIdAndDelete).toHaveBeenCalledWith('feedback-1');
    expect(result).toEqual({ reviewCount: 1, averageRating: 5 });
  });

  it('sync call failure does not break addFeedbackAndSyncCertificate', async () => {
    hotelFindById.mockResolvedValue({ _id: 'hotel-1' });
    feedbackCreate.mockResolvedValue({
      _id: 'f-1',
      userId: 'user-1',
      userName: 'Nipun',
      rating: 4,
      feedback: 'Good',
      createdAt: new Date('2025-01-01T00:00:00.000Z'),
      updatedAt: new Date('2025-01-01T00:00:00.000Z'),
    });
    feedbackFind.mockResolvedValue([{ rating: 4 }]);
    updateCertificateTrustScore.mockRejectedValue(new Error('No active certificate'));

    const result = await addFeedbackAndSyncCertificate(
      'hotel-1',
      { _id: 'user-1', name: 'Nipun' },
      { rating: 4, feedback: 'Good' }
    );

    expect(updateCertificateTrustScore).toHaveBeenCalledWith('hotel-1', 4, 1);
    expect(result.averageRating).toBe(4);
    expect(result.reviewCount).toBe(1);
  });
});
