import axios from 'axios';

const BASE_URL = 'http://localhost:5000/api/v1';

const uniqueId = Date.now();
const testUser = {
    name: "Script Evaluator",
    email: 'script.evaluator@example.com',
    password: 'password123'
};

const testHotelData = {
    businessInfo: {
        name: `Oasis Resort & Spa ${uniqueId}`, // Make name unique to avoid 409 Conflict
        registrationNumber: `REG-${uniqueId}`,
        licenseNumber: `LIC-${uniqueId}`,
        businessType: "Hotel",
        contact: {
            ownerName: testUser.name,
            phone: "+1234567890",
            email: testUser.email,
            address: "Bali, Indonesia"
        }
    },
    guestServices: {
        facilities: {
            numberOfRooms: 20
        }
    }
};

const runTest = async () => {
    console.log("==========================================");
    console.log("Starting End-to-End Hotel Registration Test");
    console.log("==========================================");

    try {
        // Step 1: Login User
        console.log(`\n[Step 1] Logging in as ${testUser.email} to get token`);
        const loginRes = await axios.post(`${BASE_URL}/auth/login`, {
            email: testUser.email,
            password: testUser.password
        });

        const token = loginRes.data.token;
        console.log("Login Response:", loginRes.data.success ? "Success" : "Failed");

        if (!token) {
            throw new Error("Failed to obtain authentication token.");
        }
        console.log("✅ Token acquired.");

        // Step 2: Register Hotel
        console.log("\n[Step 2] Sending POST request to create hotel");
        console.log("Waiting for backend processing (This includes the AI Agent evaluation via SerpApi)...");

        const response = await axios.post(`${BASE_URL}/hotels`, testHotelData, {
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            }
        });

        console.log("\n[Step 3] Response Received (Status:", response.status + ")");

        const hotel = response.data.data?.data || response.data.data || response.data;

        console.log("\n==========================================");
        console.log("Test Outcome Analysis:");
        console.log("==========================================");

        if (hotel && hotel.scoring) {
            console.log(`✅ Hotel created successfully. ID: ${hotel._id}`);
            console.log(`✅ AI Agent Score (googleReviewScore): ${hotel.scoring.googleReviewScore}`);
            console.log(`✅ AI Justification: ${hotel.scoring.aiReviewJustification || "None provided"}`);
        } else {
            console.log("❌ Response received, but missing expected hotel/scoring data payload.");
        }

    } catch (error) {
        console.log("\n❌ Request Failed with an Error");
        console.log("==========================================");

        if (error.response) {
            console.log("Status Code:", error.response.status);
            console.log("Response Data:", JSON.stringify(error.response.data, null, 2));
        } else {
            console.log("Error Message:", error.message);
        }
    }
};

runTest();
