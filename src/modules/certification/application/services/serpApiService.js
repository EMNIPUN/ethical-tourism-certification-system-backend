import { getJson } from "serpapi";
import dotenv from 'dotenv';

dotenv.config();

const API_KEY = process.env.SERPAPI_KEY;

/**
 * Searches for hotels on Google Hotels via SerpApi.
 */
export const searchMatches = async (query) => {
    if (!API_KEY) {
        console.warn("SERPAPI_KEY is not set.");
        return [];
    }

    const today = new Date();
    const checkIn = new Date(today);
    checkIn.setDate(today.getDate() + 30);
    const checkOut = new Date(checkIn);
    checkOut.setDate(checkIn.getDate() + 1);
    const formatDate = (date) => date.toISOString().split('T')[0];

    return new Promise((resolve) => {
        console.log(`Searching matches for: "${query}"`);
        getJson({
            engine: "google_hotels",
            q: query,
            check_in_date: formatDate(checkIn),
            check_out_date: formatDate(checkOut),
            api_key: API_KEY
        }, (json) => {
            if (!json || !json.properties) {
                resolve([]);
                return;
            }

            const results = json.properties.map(p => ({
                name: p.name,
                address: p.formatted_address || p.location_description, // Fallback if formatted_address missing
                rating: p.overall_rating || null,
                token: p.property_token,
                thumbnail: p.images && p.images[0] ? p.images[0].thumbnail : null,
                gps: p.gps_coordinates
            }));

            resolve(results);
        });
    });
};
