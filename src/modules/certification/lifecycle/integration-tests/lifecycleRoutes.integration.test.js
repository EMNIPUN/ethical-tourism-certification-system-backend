import express from 'express';
import request from 'supertest';
import { beforeEach, describe, expect, it, jest } from '@jest/globals';
import { errorHandler } from '../../../../common/middleware/errorMiddleware.js';

const issueCertificate = jest.fn();
const getAllHotelsWithCertificates = jest.fn();
const getCertificateByNumber = jest.fn();
const renewCertificate = jest.fn();

jest.unstable_mockModule('../../../../common/middleware/authMiddleware.js', () => ({
  protect: (req, res, next) => {
    req.user = { _id: 'admin-1', role: 'Admin', email: 'admin@test.com' };
    next();
  },
  authorize: () => (req, res, next) => next(),
}));

jest.unstable_mockModule('../services/lifecycleService.js', () => ({
  issueCertificate,
  getAllHotelsWithCertificates,
  getOwnerCertificatesByEmail: jest.fn(),
  getEligibleHotelsForCertification: jest.fn(),
  buildEligibleHotelsSummary: jest.fn(),
  getCertificateOverviewStats: jest.fn(),
  getCertificateOverviewCharts: jest.fn(),
  getCertificateByNumber,
  updateCertificateDetails: jest.fn(),
  updateTrustScore: jest.fn(),
  renewCertificate,
  revokeCertificate: jest.fn(),
  inactivateCertificate: jest.fn(),
  deleteCertificatePermanently: jest.fn(),
  updateCertificateTrustScore: jest.fn(),
  getCertificateTimeline: jest.fn(),
  resolveCertificateDownloadAssetFromToken: jest.fn(),
}));

const { default: lifecycleRoutes } = await import('../routes/index.js');

const createApp = () => {
  const app = express();
  app.use(express.json());
  app.use('/certification', lifecycleRoutes);
  app.use(errorHandler);
  return app;
};

describe('certificate lifecycle routes integration tests', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('POST /certification/certificates creates certificate for valid payload', async () => {
    issueCertificate.mockResolvedValue({
      _id: 'cert-1',
      certificateNumber: 'CERT-001',
      status: 'ACTIVE',
    });

    const app = createApp();
    const response = await request(app).post('/certification/certificates').send({
      hotelId: '664f1a2b3c4d5e6f7a8b9c0d',
      validityPeriodInMonths: 12,
    });

    expect(response.status).toBe(201);
    expect(response.body.success).toBe(true);
    expect(response.body.data.certificateNumber).toBe('CERT-001');
    expect(issueCertificate).toHaveBeenCalledWith(
      '664f1a2b3c4d5e6f7a8b9c0d',
      12,
      expect.objectContaining({
        actorType: 'USER',
        actorId: 'admin-1',
      })
    );
  });

  it('POST /certification/certificates rejects invalid request body', async () => {
    const app = createApp();
    const response = await request(app).post('/certification/certificates').send({
      hotelId: '664f1a2b3c4d5e6f7a8b9c0d',
    });

    expect(response.status).toBe(400);
    expect(response.body).toEqual(
      expect.objectContaining({
        success: false,
        error: expect.stringContaining('validityPeriodInMonths is required'),
      })
    );
    expect(issueCertificate).not.toHaveBeenCalled();
  });

  it('GET /certification/certificates returns list payload', async () => {
    getAllHotelsWithCertificates.mockResolvedValue([
      { certificateNumber: 'CERT-001' },
      { certificateNumber: 'CERT-002' },
    ]);

    const app = createApp();
    const response = await request(app).get('/certification/certificates?status=ACTIVE');

    expect(response.status).toBe(200);
    expect(response.body).toEqual({
      success: true,
      count: 2,
      data: [{ certificateNumber: 'CERT-001' }, { certificateNumber: 'CERT-002' }],
    });
    expect(getAllHotelsWithCertificates).toHaveBeenCalledWith('ACTIVE');
  });

  it('GET /certification/certificates/:certificateNumber returns 404 when not found', async () => {
    const notFoundError = new Error('Certificate not found');
    notFoundError.statusCode = 404;
    getCertificateByNumber.mockRejectedValue(notFoundError);

    const app = createApp();
    const response = await request(app).get('/certification/certificates/CERT-404');

    expect(response.status).toBe(404);
    expect(response.body).toEqual(
      expect.objectContaining({
        success: false,
        error: 'Certificate not found',
      })
    );
  });

  it('PUT /certification/certificates/:id/renew renews certificate with default period', async () => {
    renewCertificate.mockResolvedValue({
      _id: 'cert-1',
      certificateNumber: 'CERT-001',
      status: 'ACTIVE',
      renewalCount: 1,
    });

    const app = createApp();
    const response = await request(app)
      .put('/certification/certificates/cert-1/renew')
      .send({});

    expect(response.status).toBe(200);
    expect(response.body.success).toBe(true);
    expect(renewCertificate).toHaveBeenCalledWith(
      'cert-1',
      12,
      expect.objectContaining({ actorId: 'admin-1' })
    );
  });
});
