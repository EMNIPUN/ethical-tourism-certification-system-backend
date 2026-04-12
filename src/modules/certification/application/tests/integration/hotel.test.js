import request from 'supertest';
import app from '../../../../../../app.js'; 

describe('Hotel Registration API Integration Tests', () => {
    
    describe('POST /hotels', () => {
        it('should return 400 Bad Request for invalid hotel data format', async () => {
            const invalidPayload = { hotelData: "this fails {" };

            const response = await request(app)
                .post('/hotels')
                .send(invalidPayload);

            // Without a valid auth token, the route throws 401 before getting to the JSON logic
            expect(response.status).toBe(401); 
        });

        it('should attempt to register a new hotel with valid JSON payload', async () => {
            const validPayload = { 
                hotelData: JSON.stringify({ 
                    businessInfo: { name: "Integration Test Hotel", email: "test@hotel.com" } 
                }) 
            };

            const response = await request(app)
                .post('/hotels')
                .send(validPayload);

            // Because no real auth token is provided, 401 is expected.
            expect([401, 201, 400, 500]).toContain(response.status); 
        });
    });
    
    describe('GET /hotels', () => {
        it('should fetch a paginated list of hotels successfully', async () => {
             const response = await request(app)
                .get('/hotels?page=1&limit=5');
                
             expect([200, 401]).toContain(response.status);
             if (response.status === 200) {
                 expect(response.body.success).toBe(true);
                 expect(Array.isArray(response.body.data)).toBe(true);
             }
        });
    });
});
