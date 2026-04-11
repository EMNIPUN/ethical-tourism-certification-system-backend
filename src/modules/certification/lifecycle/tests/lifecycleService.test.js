import { beforeEach, describe, expect, it, jest } from '@jest/globals';

const certificateFind = jest.fn();
const hotelRequestFind = jest.fn();

jest.unstable_mockModule('../../../../common/models/certificate.model.js', () => ({
  default: {
    find: certificateFind,
  },
  CERTIFICATE_STATUS: {
    ACTIVE: 'ACTIVE',
    EXPIRED: 'EXPIRED',
    REVOKED: 'REVOKED',
    INACTIVE: 'INACTIVE',
  },
  CERTIFICATE_LEVEL: {
    PLATINUM: 'PLATINUM',
    GOLD: 'GOLD',
    SILVER: 'SILVER',
  },
  TRUST_SCORE: {
    MIN: 0,
    MAX: 100,
    DEFAULT: 70,
    REVIEW_CONFIDENCE_K: 20,
    PLATINUM_MIN: 90,
    GOLD_MIN: 75,
    SILVER_MIN: 50,
  },
}));

jest.unstable_mockModule('../../application/models/Hotel.js', () => ({
  default: {},
}));

jest.unstable_mockModule('../../../../common/models/HotelRequest.js', () => ({
  default: {
    find: hotelRequestFind,
  },
}));

jest.unstable_mockModule('../../../../common/utils/emailService.js', () => ({
  sendCertificateIssuedEmail: jest.fn(),
  sendCertificateExpiredEmail: jest.fn(),
  sendCertificateRenewedEmail: jest.fn(),
  sendCertificateRevokedEmail: jest.fn(),
}));

jest.unstable_mockModule('../../../../common/utils/certificateDownloadToken.js', () => ({
  createCertificateDownloadLink: jest.fn(),
  verifyCertificateDownloadToken: jest.fn(),
}));

jest.unstable_mockModule('../services/certificateDocumentService.js', () => ({
  generateAndUploadCertificatePdf: jest.fn(),
  buildCloudinaryDownloadUrl: jest.fn(),
  buildCloudinarySignedRawDownloadUrl: jest.fn(),
}));

jest.unstable_mockModule('../models/CertificateActivity.js', () => ({
  default: {
    create: jest.fn(),
    countDocuments: jest.fn(),
    find: jest.fn(),
  },
  CERTIFICATE_ACTIVITY_ACTOR: {
    SYSTEM: 'SYSTEM',
    USER: 'USER',
  },
  CERTIFICATE_ACTIVITY_EVENT: {
    CERTIFICATE_ISSUED: 'CERTIFICATE_ISSUED',
  },
  CERTIFICATE_ACTIVITY_SOURCE: {
    API: 'API',
    SYSTEM: 'SYSTEM',
    FEEDBACK_SYNC: 'FEEDBACK_SYNC',
  },
}));

const {
  calculateLevel,
  calculateTrustScore,
  getEligibleHotelsForCertification,
  buildEligibleHotelsSummary,
} = await import('../services/lifecycleService.js');

const createSelectQuery = (value) => ({
  select: jest.fn(async () => value),
});

describe('lifecycleService unit tests', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('maps score boundaries to certificate levels', () => {
    expect(calculateLevel(95)).toBe('PLATINUM');
    expect(calculateLevel(75)).toBe('GOLD');
    expect(calculateLevel(50)).toBe('SILVER');
    expect(calculateLevel(49)).toBeNull();
  });

  it('calculates trust score with confidence blending and clamps to 0..100', () => {
    const nearNow = new Date().toISOString();

    const lowScore = calculateTrustScore({
      averageRating: 0,
      reviewCount: 0,
      renewalCount: 0,
      issuedDate: nearNow,
      baselineScore: 0,
    });

    const highScore = calculateTrustScore({
      averageRating: 10,
      reviewCount: 500,
      renewalCount: 200,
      issuedDate: '2018-01-01T00:00:00.000Z',
      baselineScore: 99,
    });

    expect(lowScore).toBe(0);
    expect(highScore).toBe(100);
  });

  it('returns eligible hotels with alreadyCertified and activeCertificate details', async () => {
    const eligibleRequests = [
      {
        _id: 'request-1',
        hotelId: {
          _id: 'hotel-1',
          businessInfo: { name: 'Sunrise Resort' },
        },
        hotelScore: { status: 'passed' },
        auditScore: { status: 'passed' },
        createdAt: new Date('2026-03-01T00:00:00.000Z'),
        updatedAt: new Date('2026-03-02T00:00:00.000Z'),
      },
      {
        _id: 'request-2',
        hotelId: {
          _id: 'hotel-2',
          businessInfo: { name: 'Ocean Breeze' },
        },
        hotelScore: { status: 'passed' },
        auditScore: { status: 'passed' },
        createdAt: new Date('2026-03-03T00:00:00.000Z'),
        updatedAt: new Date('2026-03-04T00:00:00.000Z'),
      },
    ];

    hotelRequestFind.mockReturnValue({
      populate: jest.fn(async () => eligibleRequests),
    });

    certificateFind.mockReturnValue(
      createSelectQuery([
        {
          hotelId: 'hotel-1',
          certificateNumber: 'CERT-001',
          level: 'GOLD',
          trustScore: 80,
          status: 'ACTIVE',
          issuedDate: new Date('2026-01-01T00:00:00.000Z'),
          expiryDate: new Date('2027-01-01T00:00:00.000Z'),
        },
      ])
    );

    const result = await getEligibleHotelsForCertification();

    expect(hotelRequestFind).toHaveBeenCalledWith({
      hotelScore: { status: 'passed' },
      auditScore: { status: 'passed' },
    });
    expect(certificateFind).toHaveBeenCalledWith({
      hotelId: { $in: ['hotel-1', 'hotel-2'] },
      status: 'ACTIVE',
    });

    expect(result).toHaveLength(2);
    expect(result[0]).toEqual(
      expect.objectContaining({
        hotelId: 'hotel-1',
        alreadyCertified: true,
        activeCertificate: expect.objectContaining({
          certificateNumber: 'CERT-001',
          level: 'GOLD',
        }),
      })
    );
    expect(result[1].alreadyCertified).toBe(false);
    expect(result[1].activeCertificate).toBeNull();
  });

  it('builds eligible hotel summary with issuance and business type breakdown', () => {
    const summary = buildEligibleHotelsSummary([
      {
        alreadyCertified: false,
        hotel: { businessInfo: { businessType: 'Hotel' } },
        createdAt: new Date().toISOString(),
      },
      {
        alreadyCertified: true,
        hotel: { businessInfo: { businessType: 'Resort' } },
        createdAt: '2025-01-01T00:00:00.000Z',
        activeCertificate: {
          issuedDate: '2025-01-01T00:00:00.000Z',
          expiryDate: '2026-01-01T00:00:00.000Z',
        },
      },
    ]);

    expect(summary.totalEligibleHotels).toBe(2);
    expect(summary.readyToIssue).toBe(1);
    expect(summary.alreadyCertifiedCount).toBe(1);
    expect(summary.businessTypeBreakdown).toEqual(
      expect.arrayContaining([
        { businessType: 'Hotel', count: 1 },
        { businessType: 'Resort', count: 1 },
      ])
    );
    expect(summary.averageActiveValidityMonths).toBeGreaterThanOrEqual(12);
  });
});
