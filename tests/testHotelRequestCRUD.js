import dotenv from 'dotenv';
import mongoose from 'mongoose';
import connectDB from '../src/common/config/db.js';
import Hotel from '../src/modules/certification/application/models/Hotel.js';
import {
    createHotelRequest,
    getAllHotelRequests,
    getHotelRequestById,
    updateHotelRequestById,
    deleteHotelRequestById
} from '../src/common/services/hotelRequest.js';

dotenv.config();

const runTest = async () => {
    try {
        await connectDB();

        // 1. Setup: Find or Create a Hotel
        let hotel = await Hotel.findOne();
        if (!hotel) {
            console.log('No hotel found, creating a dummy hotel for testing...');
            hotel = await Hotel.create({
                businessInfo: {
                    name: 'Test Hotel',
                    registrationNumber: 'TEST123456',
                    licenseNumber: 'LIC123',
                    businessType: 'Hotel',
                    contact: {
                        ownerName: 'Test Owner',
                        phone: '1234567890',
                        email: 'test@example.com',
                        address: '123 Test St'
                    }
                },
                guestServices: {
                    numberOfRooms: 10
                }
            });
        }

        console.log(`Using Hotel ID: ${hotel._id}`);

        // 2. Test Create
        console.log('\n--- Testing Create ---');
        const newData = {
            hotelId: hotel._id,
            hotelScore: { status: 'passed' },
            auditScore: { status: 'failed' }
        };
        const createdRequest = await createHotelRequest(newData);
        console.log('Created Request:', createdRequest);

        // 3. Test Get All
        console.log('\n--- Testing Get All ---');
        const allRequests = await getAllHotelRequests({});
        console.log(`Total Requests Found: ${allRequests.length}`);

        // 4. Test Get By ID
        console.log('\n--- Testing Get By ID ---');
        const fetchedRequest = await getHotelRequestById(createdRequest._id);
        console.log('Fetched Request:', fetchedRequest);

        // 5. Test Update
        console.log('\n--- Testing Update ---');
        const updateData = { auditScore: { status: 'passed' } };
        const updatedRequest = await updateHotelRequestById(createdRequest._id, updateData);
        console.log('Updated Request:', updatedRequest);

        // 6. Test Delete
        console.log('\n--- Testing Delete ---');
        await deleteHotelRequestById(createdRequest._id);
        const deletedCheck = await getHotelRequestById(createdRequest._id);
        console.log('Deleted Check (should be null):', deletedCheck);

        console.log('\nVerification Complete!');
        process.exit(0);
    } catch (error) {
        console.error('Test Failed:', error);
        process.exit(1);
    }
};

runTest();
