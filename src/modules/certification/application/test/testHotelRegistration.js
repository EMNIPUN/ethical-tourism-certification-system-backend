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
        name: `AYANA Resort Bali`,
        registrationNumber: `REG-${uniqueId}`,
        licenseNumber: `LIC-${uniqueId}`,
        businessType: "Hotel",
        contact: {
            ownerName: testUser.name,
            phone: "+1234567890",
            email: `hotel-${uniqueId}@example.com`,
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
    console.log("Starting End-to-End Hotel Registration Test (2-Step Flow)");
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

        // Step 2: Register Hotel (Search Candidates)
        console.log("\n[Step 2] Sending POST request to create hotel and search for candidates...");

        const createResponse = await axios.post(`${BASE_URL}/hotels`, testHotelData, {
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            }
        });

        console.log("Server Message:", createResponse.data.message);

        const { hotelId, candidates } = createResponse.data.data;
        console.log(`✅ Hotel Draft Created. ID: ${hotelId}`);
        console.log(`Found ${candidates?.length || 0} candidate(s):`);

        candidates?.forEach((c, i) => {
            console.log(`  ${i + 1}. ${c.title} (Confidence: ${c.confidence || 'N/A'}) - ${c.address}`);
        });

        // Step 3: Confirm Hotel Match
        console.log("\n[Step 3] Simulating user confirming the first match...");
        let selectedPlaceId = null;
        if (candidates && candidates.length > 0) {
            selectedPlaceId = candidates[0].place_id;
            console.log(`Selected place_id: ${selectedPlaceId}`);
        } else {
            console.log("No candidates found. Proceeding with 'None' (null)...");
        }

        console.log("Waiting for backend review evaluation...");

        const confirmResponse = await axios.post(`${BASE_URL}/hotels/${hotelId}/confirm-match`,
            {
                placeId: selectedPlaceId
            },
            {
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                }
            });

        const hotel = confirmResponse.data.data?.hotel;
        const evaluation = confirmResponse.data.evaluation;

        console.log("\n==========================================");
        console.log("Final Outcome Analysis:");
        console.log("==========================================");

        console.log(`Server Message: ${confirmResponse.data.message}`);

        if (hotel && evaluation) {
            console.log(`✅ AI Agent Score (googleReviewScore): ${evaluation.aiScore}`);
            console.log(`✅ AI Evaluation Status: ${evaluation.status.toUpperCase()}`);
            console.log(`✅ AI Justification: ${evaluation.aiJustification || "None provided"}`);
        } else {
            console.log("❌ Response received, but missing expected evaluation data payload.");
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
