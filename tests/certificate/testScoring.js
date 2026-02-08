import mongoose from 'mongoose';
import dotenv from 'dotenv';
import { createHotel, updateHotelById, deleteHotelById } from './services/hotelService.js';

dotenv.config();

const runTest = async () => {
    try {
        await mongoose.connect(process.env.MONGO_URI);
        console.log('MongoDB Connected');

        // 1. Create Hotel with minimal data
        const hotelData = {
            businessInfo: {
                name: "Scoring Test Hotel",
                registrationNumber: "SCORE123",
                licenseNumber: "LIC999",
                businessType: "Hotel",
                contact: {
                    ownerName: "Tester",
                    phone: "123",
                    email: "test@test.com",
                    address: "Test St"
                }
            },
            guestServices: {
                facilities: { numberOfRooms: 10 }
            }
        };

        console.log('Creating hotel...');
        const hotel = await createHotel(hotelData);
        console.log('Initial Scores:', hotel.scoring);

        // 2. Update with more data
        console.log('Updating hotel with more data...');
        const updateData = {
            "sustainability.wasteManagement.recyclingProgram": true,
            "sustainability.conservation.energyEfficientLighting": true
        };
        // Note: For our simple update logic in service, we need to pass object structure if we want deep merge in calculation
        // But Mongoose update logic in service uses Object.assign which is shallow.
        // Let's pass full structure for the update to work best with our current logic

        // Actually, let's just test that the update function triggers re-calc.
        // We will send a proper object structure for update.
        const updatePayload = {
            sustainability: {
                wasteManagement: { recyclingProgram: true },
                conservation: { energyEfficientLighting: true }
            }
        };

        const updatedHotel = await updateHotelById(hotel._id, updatePayload);
        console.log('Updated Scores (More Data):', updatedHotel.scoring);

        // 3. Add Auditor Score
        console.log('Adding Auditor Score...');
        const auditorUpdate = {
            scoring: {
                auditorScore: 80,
                googleRating: 4.5
            }
        };
        // We also need to preserve existing data for accurate recalc if we replaced it. 
        // But our update logic fetches existing doc, merges, and calcs.
        const auditedHotel = await updateHotelById(hotel._id, auditorUpdate);
        console.log('Final Scores (Auditor + Google):', auditedHotel.scoring);

        // Cleanup
        await deleteHotelById(hotel._id);
        console.log('Cleanup done.');

        process.exit();
    } catch (error) {
        console.error('Error:', error);
        process.exit(1);
    }
};

runTest();
