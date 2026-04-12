import { jest } from '@jest/globals';

// 1. Mock the dependent hotelService module
jest.unstable_mockModule('../../services/hotelService.js', () => ({
    createHotel: jest.fn(),
    confirmHotelMatch: jest.fn(),
    getAllHotels: jest.fn(),
    getHotelById: jest.fn(),
    updateHotelById: jest.fn(),
    deleteHotelById: jest.fn()
}));

// 2. dynamically import the target controller and the mock service AFTER mocking
const hotelService = await import('../../services/hotelService.js');
const { createHotel } = await import('../../controllers/hotelController.js');

describe('Hotel Controller - Registration Unit Tests', () => {

    beforeEach(() => {
        jest.clearAllMocks();
    });

    describe('createHotel', () => {
        it('should successfully parse hotel data and register a hotel', async () => {
            // Setup Mock Request
            const req = {
                body: { hotelData: JSON.stringify({ name: 'Eco Resort', location: 'Bali' }) },
                files: null // No files attached
            };
            
            const res = {
                status: jest.fn().mockReturnThis(),
                json: jest.fn()
            };
            
            const next = jest.fn();

            // Mocking the service response
            const mockCreatedHotel = { _id: 'hotel_123' };
            const mockCandidates = [];
            hotelService.createHotel.mockResolvedValue({ hotel: mockCreatedHotel, candidates: mockCandidates });

            await createHotel(req, res, next);

            expect(hotelService.createHotel).toHaveBeenCalledWith({ name: 'Eco Resort', location: 'Bali' });
            expect(res.status).toHaveBeenCalledWith(201);
            expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
                success: true,
                message: expect.any(String),
                data: {
                    hotelId: 'hotel_123',
                    candidates: mockCandidates
                }
            }));
        });
        
        it('should throw an error if hotelData JSON is invalid', async () => {
            const req = {
                body: { hotelData: "invalid json string { { " }
            };
            
            const res = {
                status: jest.fn().mockReturnThis()
            };
            const next = jest.fn();

            await createHotel(req, res, next);
            expect(res.status).toHaveBeenCalledWith(400);
            expect(next).toHaveBeenCalledWith(expect.any(Error));
            expect(next.mock.calls[0][0].message).toBe("Invalid JSON format in hotelData field.");
        });
    });
});
