import express from 'express';
import request from 'supertest';
import { beforeEach, describe, expect, it, jest } from '@jest/globals';
import { errorHandler } from '../../../common/middleware/errorMiddleware.js';

const getAllHotelContactDetails = jest.fn();
const getHotelContactDetailsById = jest.fn();
const searchHotelContactsByLocation = jest.fn();
const getHotelFeedbackById = jest.fn();
const addFeedbackAndSyncCertificate = jest.fn();
const updateHotelFeedback = jest.fn();
const deleteHotelFeedback = jest.fn();
const getAIHotelRecommendations = jest.fn();

jest.unstable_mockModule('../../../common/middleware/authMiddleware.js', () => ({
  protect: (req, res, next) => {
    req.user = { _id: 'user-1', role: 'Tourist', name: 'Test User' };
    next();
  },
  authorize: () => (req, res, next) => next(),
}));

jest.unstable_mockModule('../services/hotelContactService.js', () => ({
  getAllHotelContactDetails,
  getHotelContactDetailsById,
  searchHotelContactsByLocation,
}));

jest.unstable_mockModule('../services/hotelFeedbackService.js', () => ({
  getHotelFeedbackById,
  addFeedbackAndSyncCertificate,
  updateHotelFeedback,
  deleteHotelFeedback,
}));

jest.unstable_mockModule('../services/hotelComprehensiveAIService.js', () => ({
  getAIHotelRecommendations,
}));

const { default: searchRoutes } = await import('../routes/index.js');

const createApp = () => {
  const app = express();
  app.use(express.json());
  app.use('/api/v1/hotels-search', searchRoutes);
  app.use(errorHandler);
  return app;
};

describe('search routes integration', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('GET /contacts returns contact list payload', async () => {
    getAllHotelContactDetails.mockResolvedValue([
      { hotelId: 'h-1', businessInfo: { name: 'Golden Palm' } },
    ]);

    const app = createApp();
    const response = await request(app).get('/api/v1/hotels-search/contacts');

    expect(response.status).toBe(200);
    expect(response.body).toEqual({
      success: true,
      count: 1,
      data: [{ hotelId: 'h-1', businessInfo: { name: 'Golden Palm' } }],
    });
    expect(getAllHotelContactDetails).toHaveBeenCalledTimes(1);
  });

  it('GET /contacts/search validates location and returns filtered data', async () => {
    searchHotelContactsByLocation.mockResolvedValue([
      { hotelId: 'h-2', businessInfo: { name: 'City View' } },
    ]);

    const app = createApp();
    const response = await request(app).get('/api/v1/hotels-search/contacts/search?location=colombo');

    expect(response.status).toBe(200);
    expect(response.body).toEqual({
      success: true,
      count: 1,
      location: 'colombo',
      data: [{ hotelId: 'h-2', businessInfo: { name: 'City View' } }],
    });
    expect(searchHotelContactsByLocation).toHaveBeenCalledWith('colombo');
  });

  it('GET /contacts/:id returns 404 when contact does not exist', async () => {
    getHotelContactDetailsById.mockResolvedValue(null);

    const app = createApp();
    const response = await request(app).get('/api/v1/hotels-search/contacts/hotel-404');

    expect(response.status).toBe(404);
    expect(response.body).toEqual(
      expect.objectContaining({ success: false, error: 'Hotel contact details not found' })
    );
  });

  it('POST /contacts/:id/feedback rejects invalid payload with 400', async () => {
    const app = createApp();
    const response = await request(app)
      .post('/api/v1/hotels-search/contacts/hotel-1/feedback')
      .send({ rating: 6 });

    expect(response.status).toBe(400);
    expect(response.body.success).toBe(false);
    expect(addFeedbackAndSyncCertificate).not.toHaveBeenCalled();
  });

  it('POST /contacts/:id/feedback creates feedback and returns summary', async () => {
    addFeedbackAndSyncCertificate.mockResolvedValue({
      feedback: {
        feedbackId: 'feedback-1',
        userId: 'user-1',
        userName: 'Test User',
        rating: 5,
        feedback: 'Excellent stay',
      },
      averageRating: 4.8,
      reviewCount: 12,
    });

    const app = createApp();
    const response = await request(app)
      .post('/api/v1/hotels-search/contacts/hotel-1/feedback')
      .send({ rating: 5, feedback: 'Excellent stay' });

    expect(response.status).toBe(201);
    expect(response.body).toEqual({
      success: true,
      data: {
        feedbackId: 'feedback-1',
        userId: 'user-1',
        userName: 'Test User',
        rating: 5,
        feedback: 'Excellent stay',
      },
      summary: {
        averageRating: 4.8,
        reviewCount: 12,
      },
    });
  });

  it('GET /ai-recommendations returns AI recommendation payload', async () => {
    getAIHotelRecommendations.mockResolvedValue({
      bestHotel: { hotelId: 'h-9', hotelName: 'Gold Shore' },
      topHotels: [{ hotelId: 'h-9', hotelName: 'Gold Shore' }],
      totalCertifiedHotels: 1,
    });

    const app = createApp();
    const response = await request(app).get('/api/v1/hotels-search/ai-recommendations');

    expect(response.status).toBe(200);
    expect(response.body).toEqual({
      success: true,
      data: {
        bestHotel: { hotelId: 'h-9', hotelName: 'Gold Shore' },
        topHotels: [{ hotelId: 'h-9', hotelName: 'Gold Shore' }],
        totalCertifiedHotels: 1,
      },
    });
  });
});
