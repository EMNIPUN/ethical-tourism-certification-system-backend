import { jest } from '@jest/globals';

// 1. Mock the dependent module first before importing the target
jest.unstable_mockModule('../../services/auditService.js', () => ({
    default: {
        createAudit: jest.fn()
    }
}));

// 2. dynamically import the target controller and the mock service AFTER mocking
const auditService = (await import('../../services/auditService.js')).default;
const { createAudit } = await import('../../controllers/auditController.js');

describe('Audit Controller - Unit Tests', () => {

    beforeEach(() => {
        jest.clearAllMocks();
    });

    describe('createAudit', () => {
        it('should successfully create an audit and return 201', async () => {
            // Setup Mock Request
            const req = {
                body: { hotelId: '65abc123', status: 'Pending' },
                user: { _id: 'admin_123' }
            };
            
            // Setup Mock Response
            const res = {
                status: jest.fn().mockReturnThis(),
                json: jest.fn()
            };
            
            const next = jest.fn();

            const mockCreatedAudit = { _id: 'audit_789', hotelId: '65abc123', status: 'Pending' };
            auditService.createAudit.mockResolvedValue(mockCreatedAudit);

            // Our controller is wrapped in asyncHandler. 
            // Calling it will return a Promise.
            await createAudit(req, res, next);

            expect(auditService.createAudit).toHaveBeenCalledWith(req.body, req.user._id);
            expect(res.status).toHaveBeenCalledWith(201);
            expect(res.json).toHaveBeenCalledWith({
                success: true,
                message: 'Audit created successfully',
                data: mockCreatedAudit
            });
            expect(next).not.toHaveBeenCalled();
        });
    });
});
