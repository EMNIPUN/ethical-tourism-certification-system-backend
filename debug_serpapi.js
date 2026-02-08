
import { getJson } from "serpapi";
import dotenv from 'dotenv';
dotenv.config();

const API_KEY = process.env.SERPAPI_KEY;

if (!API_KEY) {
    console.error("No SERPAPI_KEY found in .env");
    process.exit(1);
}

const params = {
    engine: "google_hotels",
    q: "Shangri-La Colombo", // Simplified query
    check_in_date: "2026-05-01", // Future date
    check_out_date: "2026-05-02",
    api_key: API_KEY
};

console.log("Searching SerpApi...");

// Wrap in async function to handle potential async issues if any, though getJson is callback based
try {
    getJson(params, (json) => {
        if (json.error) {
            console.error("Error:", json.error);
        } else {
            if (json.properties && json.properties.length > 0) {
                console.log("First Property Structure:");
                console.log(JSON.stringify(json.properties[0], null, 2));

                // Log unique keys across first 3 properties to get a better idea
                const allKeys = new Set();
                json.properties.slice(0, 3).forEach(p => Object.keys(p).forEach(k => allKeys.add(k)));
                console.log("\nAll Property Keys found:", Array.from(allKeys));

                // Deep dive into specific fields if they exist
                if (json.properties[0].amenities) {
                    console.log("\nAmenities Example:", json.properties[0].amenities);
                }
                if (json.properties[0].nearby_places) {
                    console.log("\nNearby Places Example:", JSON.stringify(json.properties[0].nearby_places, null, 2));
                }
                if (json.properties[0].reviews_breakdown) {
                    console.log("\nReviews Breakdown Example:", JSON.stringify(json.properties[0].reviews_breakdown, null, 2));
                }
                if (json.properties[0].images) {
                    console.log("\nImages Example (first 2):", JSON.stringify(json.properties[0].images.slice(0, 2), null, 2));
                }
            } else {
                console.log("No properties found.");
                console.log("Full JSON:", JSON.stringify(json, null, 2));
            }
        }
    });
} catch (e) {
    console.error("Execution Error:", e);
}
