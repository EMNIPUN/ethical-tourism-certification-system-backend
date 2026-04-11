import { beforeEach, describe, expect, it, jest } from '@jest/globals';

const certificateFind = jest.fn();
const certificateFindOne = jest.fn();
const feedbackFind = jest.fn();

jest.unstable_mockModule('../../../common/models/certificate.model.js', () => ({
  default: {
    find: certificateFind,
    findOne: certificateFindOne,
  },
}));

jest.unstable_mockModule('../models/Feedback.js', () => ({
  default: {
    find: feedbackFind,
  },
}));

const { getAllHotelContactDetails, getHotelContactDetailsById, searchHotelContactsByLocation } =
  await import('../services/hotelContactService.js');

const createQueryChain = (leanValue) => {
  const query = {
    populate: jest.fn(() => query),
    sort: jest.fn(() => query),
    lean: jest.fn(async () => leanValue),
  };

  return query;
};

const makeHotel = ({ id, name, address }) => ({
  _id: id,
  businessInfo: {
    name,
    contact: {
      address,
      ownerName: 'Owner',
      email: 'owner@example.com',
      phone: '+94112223344',
    },
  },
  createdAt: new Date('2025-01-01T00:00:00.000Z'),
  updatedAt: new Date('2025-01-02T00:00:00.000Z'),
});

describe('hotelContactService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('returns active certified hotels sorted by certificate priority and trust score', async () => {
    const bronzeHotel = makeHotel({ id: 'h-1', name: 'Bronze Bay', address: 'Galle' });
    const goldHotel = makeHotel({ id: 'h-2', name: 'Gold Coast', address: 'Colombo' });
    const platinumHotel = makeHotel({ id: 'h-3', name: 'Platinum Peak', address: 'Kandy' });

    certificateFind.mockReturnValue(
      createQueryChain([
        {
          hotelId: bronzeHotel,
          level: 'SILVER',
          status: 'ACTIVE',
          trustScore: 88,
          certificateNumber: 'CERT-SILVER',
          createdAt: new Date('2025-01-03T00:00:00.000Z'),
          updatedAt: new Date('2025-01-04T00:00:00.000Z'),
        },
        {
          hotelId: goldHotel,
          level: 'GOLD',
          status: 'ACTIVE',
          trustScore: 70,
          certificateNumber: 'CERT-GOLD',
          createdAt: new Date('2025-01-03T00:00:00.000Z'),
          updatedAt: new Date('2025-01-04T00:00:00.000Z'),
        },
        {
          hotelId: platinumHotel,
          level: 'PLATINUM',
          status: 'ACTIVE',
          trustScore: 60,
          certificateNumber: 'CERT-PLAT',
          createdAt: new Date('2025-01-03T00:00:00.000Z'),
          updatedAt: new Date('2025-01-04T00:00:00.000Z'),
        },
      ])
    );

    feedbackFind.mockReturnValue(
      createQueryChain([
        { hotelId: 'h-1', rating: 4, feedback: 'Good', createdAt: new Date('2025-01-10T00:00:00.000Z') },
        { hotelId: 'h-1', rating: 2, feedback: 'Average', createdAt: new Date('2025-01-09T00:00:00.000Z') },
        { hotelId: 'h-2', rating: 5, feedback: 'Excellent', createdAt: new Date('2025-01-08T00:00:00.000Z') },
      ])
    );

    const results = await getAllHotelContactDetails();

    expect(certificateFind).toHaveBeenCalledWith({ status: 'ACTIVE' });
    expect(results).toHaveLength(3);
    expect(results.map((item) => item.businessInfo.name)).toEqual(['Platinum Peak', 'Gold Coast', 'Bronze Bay']);

    const bronze = results[2];
    expect(bronze.feedbackSummary.reviewCount).toBe(2);
    expect(bronze.feedbackSummary.averageRating).toBe(3);
  });

  it('returns null when no active certificate exists for hotel id', async () => {
    certificateFindOne.mockReturnValue(createQueryChain(null));

    const result = await getHotelContactDetailsById('hotel-404');

    expect(certificateFindOne).toHaveBeenCalledWith({ status: 'ACTIVE', hotelId: 'hotel-404' });
    expect(result).toBeNull();
  });

  it('normalizes location search input and returns only matched hotels', async () => {
    const cityHotel = makeHotel({ id: 'h-city', name: 'City Stay', address: 'Colombo 03' });

    const query = createQueryChain([
      {
        hotelId: cityHotel,
        level: 'GOLD',
        status: 'ACTIVE',
        trustScore: 89,
        certificateNumber: 'CERT-100',
      },
      {
        hotelId: null,
        level: 'GOLD',
        status: 'ACTIVE',
        trustScore: 20,
        certificateNumber: 'CERT-EMPTY',
      },
    ]);

    certificateFind.mockReturnValue(query);
    feedbackFind.mockReturnValue(createQueryChain([]));

    const result = await searchHotelContactsByLocation('  CoLoMbO  ');

    expect(query.populate).toHaveBeenCalledWith({
      path: 'hotelId',
      match: {
        'businessInfo.contact.address': {
          $regex: 'colombo',
          $options: 'i',
        },
      },
    });
    expect(result).toHaveLength(1);
    expect(result[0].businessInfo.name).toBe('City Stay');
    expect(result[0].feedbackSummary.reviewCount).toBe(0);
  });
});
