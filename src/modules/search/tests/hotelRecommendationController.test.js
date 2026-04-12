import { describe, expect, it, jest } from '@jest/globals';

const getAIHotelRecommendationsService = jest.fn();

jest.unstable_mockModule('../services/hotelComprehensiveAIService.js', () => ({
  getAIHotelRecommendations: getAIHotelRecommendationsService,
}));

const { getAIHotelRecommendations } = await import('../controller/hotelRecommendationController.js');

const flushAsync = () => new Promise((resolve) => setImmediate(resolve));

const createRes = () => {
  const res = {
    status: jest.fn(() => res),
    json: jest.fn(() => res),
  };

  return res;
};

describe('hotelRecommendationController', () => {
  it('responds with 200 and recommendation payload when service succeeds', async () => {
    getAIHotelRecommendationsService.mockResolvedValue({
      bestHotel: { hotelId: 'h-1', hotelName: 'Golden Palm' },
      topHotels: [{ hotelId: 'h-1' }],
      totalCertifiedHotels: 1,
    });

    const req = {};
    const res = createRes();
    const next = jest.fn();

    getAIHotelRecommendations(req, res, next);
    await flushAsync();

    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith({
      success: true,
      data: {
        bestHotel: { hotelId: 'h-1', hotelName: 'Golden Palm' },
        topHotels: [{ hotelId: 'h-1' }],
        totalCertifiedHotels: 1,
      },
    });
    expect(next).not.toHaveBeenCalled();
  });

  it('forwards service errors to next via asyncHandler', async () => {
    const serviceError = new Error('Failed to generate AI hotel recommendations');
    getAIHotelRecommendationsService.mockRejectedValue(serviceError);

    const req = {};
    const res = createRes();
    const next = jest.fn();

    getAIHotelRecommendations(req, res, next);
    await flushAsync();

    expect(next).toHaveBeenCalledTimes(1);
    expect(next).toHaveBeenCalledWith(serviceError);
  });
});
