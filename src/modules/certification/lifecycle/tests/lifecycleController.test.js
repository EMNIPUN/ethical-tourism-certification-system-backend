import { describe, expect, it, jest } from '@jest/globals';

const getEligibleHotelsForCertification = jest.fn();
const buildEligibleHotelsSummary = jest.fn();
const issueCertificate = jest.fn();

jest.unstable_mockModule('../services/lifecycleService.js', () => ({
  getEligibleHotelsForCertification,
  buildEligibleHotelsSummary,
  issueCertificate,
}));

const {
  getEligibleHotels,
  issueCertificate: issueCertificateController,
} = await import('../controllers/lifecycleController.js');

const flushAsync = () => new Promise((resolve) => setImmediate(resolve));

const createRes = () => {
  const res = {
    status: jest.fn(() => res),
    json: jest.fn(() => res),
  };

  return res;
};

describe('lifecycleController unit tests', () => {
  it('returns eligible hotels payload with summary and count', async () => {
    const hotels = [{ hotelId: 'hotel-1' }, { hotelId: 'hotel-2' }];
    getEligibleHotelsForCertification.mockResolvedValue(hotels);
    buildEligibleHotelsSummary.mockReturnValue({ totalEligibleHotels: 2 });

    const req = {};
    const res = createRes();
    const next = jest.fn();

    getEligibleHotels(req, res, next);
    await flushAsync();

    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith({
      success: true,
      count: 2,
      summary: { totalEligibleHotels: 2 },
      data: hotels,
    });
    expect(next).not.toHaveBeenCalled();
  });

  it('issues certificate and passes actor context from authenticated user', async () => {
    issueCertificate.mockResolvedValue({ certificateNumber: 'CERT-100' });

    const req = {
      body: {
        hotelId: 'hotel-55',
        validityPeriodInMonths: 12,
      },
      user: {
        _id: 'admin-1',
      },
    };
    const res = createRes();
    const next = jest.fn();

    issueCertificateController(req, res, next);
    await flushAsync();

    expect(issueCertificate).toHaveBeenCalledWith('hotel-55', 12, {
      actorType: 'USER',
      actorId: 'admin-1',
      source: 'API',
    });
    expect(res.status).toHaveBeenCalledWith(201);
    expect(res.json).toHaveBeenCalledWith({
      success: true,
      data: { certificateNumber: 'CERT-100' },
    });
  });

  it('forwards service errors to next through asyncHandler', async () => {
    const serviceError = new Error('Issue certificate failed');
    issueCertificate.mockRejectedValue(serviceError);

    const req = {
      body: {
        hotelId: 'hotel-55',
        validityPeriodInMonths: 12,
      },
      user: {
        _id: 'admin-1',
      },
    };
    const res = createRes();
    const next = jest.fn();

    issueCertificateController(req, res, next);
    await flushAsync();

    expect(next).toHaveBeenCalledWith(serviceError);
  });
});
