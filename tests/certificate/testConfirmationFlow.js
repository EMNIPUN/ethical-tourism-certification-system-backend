import axios from 'axios';

const BASE_URL = 'http://localhost:5000/api/hotels';

const testFlow = async () => {
    // 1. Create Hotel (User submits form)
    console.log("\n--- Step 1: Create Hotel ---");
    const hotelData = {
        businessInfo: {
            name: "SaDev Lake Villa",
            registrationNumber: "SADEV002",
            licenseNumber: "LIC-FLOW-001",
            businessType: "Hotel",
            contact: {
                ownerName: "Test User",
                phone: "0000000000",
                email: "flow@test.com",
                address: "No 99/A/03/05 Uyana Road, Bandaragama"
            }
        },
        guestServices: {
            reception24Hour: true,
            roomService: true,
            laundry: true,
            parking: true,
            wifi: true,
            facilities: {
                numberOfRooms: 10
            }
        }
    };

    try {
        const createRes = await axios.post(BASE_URL, hotelData);
        if (!createRes.data.success) throw new Error("Creation failed");

        const hotel = createRes.data.data;
        const matches = createRes.data.matches;

        console.log(`Hotel Created. ID: ${hotel._id}`);
        console.log(`Matches returned: ${matches ? matches.length : 0}`);

        if (matches && matches.length > 0) {
            console.log("Top Match:", matches[0].name);
        } else {
            console.log("No matches found (unexpected for SaDev Lake Villa)");
        }

        // 2. Confirm Match (User selects the correct hotel)
        console.log("\n--- Step 2: Confirm Match ---");
        // We'll use the token from the first match if available, or a known working one
        // Token known from previous test: ChoIz6Gn9Pih1cPqARoNL2cvMTFwd3d6ZHo0MhAB
        const tokenToConfirm = matches && matches.length > 0 ? matches[0].token : "ChoIz6Gn9Pih1cPqARoNL2cvMTFwd3d6ZHo0MhAB";

        if (!tokenToConfirm) {
            console.log("No token available to confirm. Skipping.");
            return;
        }

        console.log(`Confirming with token: ${tokenToConfirm}`);
        const confirmUrl = `${BASE_URL}/${hotel._id}/confirm`;
        const confirmRes = await axios.post(confirmUrl, { property_token: tokenToConfirm });

        if (confirmRes.data.success) {
            const updatedHotel = confirmRes.data.data;
            console.log("Confirmation Successful!");
            console.log(`Google Rating: ${updatedHotel.scoring.googleRating}`);
            console.log(`Total Score: ${updatedHotel.scoring.totalScore}`);

            if (updatedHotel.scoring.googleRating > 0) {
                console.log("SUCCESS: Flow verification passed.");
            } else {
                console.log("WARNING: Rating is 0 or null.");
            }
        } else {
            console.log("Confirmation Failed:", confirmRes.data.error);
        }

        // 3. Cleanup
        console.log("\n--- Cleanup ---");
        await axios.delete(`${BASE_URL}/${hotel._id}`);
        console.log("Test hotel deleted.");

    } catch (error) {
        console.error("Test Failed:", error.message);
        if (error.response) {
            console.error("Status:", error.response.status);
            console.error("Data:", JSON.stringify(error.response.data, null, 2));
        }
    }
};

testFlow();
