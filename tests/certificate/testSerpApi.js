import mongoose from 'mongoose';
import dotenv from 'dotenv';
import { createHotel, deleteHotelById } from './services/hotelService.js';

dotenv.config();

const runTest = async () => {
    try {
        await mongoose.connect(process.env.MONGO_URI);
        console.log('MongoDB Connected');

        if (!process.env.SERPAPI_KEY) {
            console.warn('Skipping SerpApi test: SERPAPI_KEY not found in .env');
            process.exit(0);
        }

        // Test Data: Real Hotel
        const hotelData = {
            businessInfo: {
                name: "SaDev Lake Villa",
                registrationNumber: "SADEV001",
                licenseNumber: "LIC-SERP",
                businessType: "Hotel",
                contact: {
                    ownerName: "N/A",
                    phone: "0000000000",
                    email: "info@example.com",
                    // Address helps SerpApi find the correct one
                    address: "No 99/A/03/05 Uyana Road, Bandaragama"
                }
            },
            guestServices: {
                facilities: { numberOfRooms: 100 }
            }
        };

        console.log('Creating hotel (triggering SerpApi fetch)...');
        const start = Date.now();
        const hotel = await createHotel(hotelData);
        const duration = Date.now() - start;
        console.log(`Creation took ${duration}ms`);

        console.log('Hotel Created:', hotel.businessInfo.name);
        console.log('SerpApi Property Token:', hotel.businessInfo.serpApiPropertyToken);
        console.log('Google Rating:', hotel.scoring.googleRating);
        console.log('Google Review Score:', hotel.scoring.googleReviewScore);
        console.log('Total Score:', hotel.scoring.totalScore);

        if (hotel.scoring.googleRating > 0) {
            console.log('SUCCESS: Google Rating fetched.');
        } else {
            console.log('WARNING: Google Rating is 0 (maybe not found or key invalid).');
        }

        // Log results to file for debugging
        const fs = await import('fs');
        const logContent = `
Hotel: ${hotel.businessInfo.name}
Token: ${hotel.businessInfo.serpApiPropertyToken}
Google Rating: ${hotel.scoring.googleRating}
Review Score: ${hotel.scoring.googleReviewScore}
Total Score: ${hotel.scoring.totalScore}
        `;
        fs.writeFileSync('test_result.log', logContent.trim());
        console.log('Results written to test_result.log');

        // Cleanup
        await deleteHotelById(hotel._id);
        console.log('Cleanup done.');

        process.exit();
    } catch (error) {
        console.error('Error:', error);
        const fs = await import('fs');
        fs.writeFileSync('test_result.log', `Error: ${error.message}`);
        process.exit(1);
    }
};

runTest();
