import { getJson } from 'serpapi';
import OpenAI from 'openai';
import dotenv from 'dotenv';
dotenv.config();

const openai = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY,
});

const SERPAPI_KEY = process.env.SERPAPI_KEY;
const isE2EMockMode = () => process.env.E2E_MOCK_MODE === 'true';

// 1. Search Tool
const searchHotel = async ({ query, location }) => {
    try {
        const response = await getJson({
            engine: "google_maps",
            q: query,
            ll: "@-8.409518,115.188919,10z", // default center to Bali or use global
            type: "search",
            api_key: SERPAPI_KEY
        });

        let results = [];

        // Google Maps returns a direct match in place_results
        if (response.place_results) {
            results.push({
                place_id: response.place_results.data_id || response.place_results.place_id,
                title: response.place_results.title,
                rating: response.place_results.rating,
                reviews_count: response.place_results.reviews,
                address: response.place_results.address,
                thumbnail: response.place_results.thumbnail,
                gps: response.place_results.gps_coordinates
            });
        }

        // Or multiple matches in local_results
        if (response.local_results) {
            results = results.concat(response.local_results.slice(0, 5).map(res => ({
                place_id: res.data_id || res.place_id,
                title: res.title,
                rating: res.rating,
                reviews_count: res.reviews,
                address: res.address,
                thumbnail: res.thumbnail,
                gps: res.gps_coordinates
            })));
        }

        return results;
    } catch (error) {
        console.error("SerpApi Search Error:", error);
        return { error: "Failed to search hotel on Google" };
    }
};

export const getGoogleMapsDetails = async (placeId) => {
    if (isE2EMockMode()) {
        return {
            place_id: placeId || 'mock-place-1',
            title: 'Mock Google Maps Hotel',
            address: 'Mock Address, Bali, Indonesia',
            thumbnail: 'https://example.com/mock-hotel-thumbnail.jpg',
            gps: {
                latitude: -8.4095,
                longitude: 115.1889
            }
        };
    }

    try {
        const response = await getJson({
            engine: "google_maps",
            q: `data_id:${placeId}`,
            ll: "@-8.409518,115.188919,10z",
            type: "search",
            api_key: SERPAPI_KEY
        });

        if (response.place_results) {
            return {
                place_id: response.place_results.data_id || response.place_results.place_id,
                title: response.place_results.title,
                address: response.place_results.address,
                thumbnail: response.place_results.thumbnail,
                gps: response.place_results.gps_coordinates
            };
        }
        return null;
    } catch (error) {
        console.error("SerpApi Place Details Error:", error);
        return null;
    }
};

// 2. Reviews Tool
const fetchReviews = async ({ place_id }) => {
    try {
        let allReviews = [];
        let next_page_token = undefined;
        // Fetch up to 2 pages of reviews mapped tightly to save tokens
        for (let i = 0; i < 2; i++) {
            const response = await getJson({
                engine: "google_maps_reviews",
                data_id: place_id.startsWith("0x") ? place_id : undefined, // Often data_id looks like 0x...
                place_id: place_id.startsWith("0x") ? undefined : place_id,
                next_page_token: next_page_token,
                api_key: SERPAPI_KEY
            });

            if (response.reviews && response.reviews.length > 0) {
                allReviews = allReviews.concat(response.reviews.map(r => ({
                    rating: r.rating,
                    text: r.snippet || r.text
                })));
            }
            if (response.serpapi_pagination && response.serpapi_pagination.next_page_token) {
                next_page_token = response.serpapi_pagination.next_page_token;
            } else {
                break;
            }
        }
        return allReviews.length ? allReviews : { message: "No reviews found." };
    } catch (error) {
        console.error("SerpApi Reviews Error:", error);
        return { error: "Failed to fetch reviews" };
    }
};

/**
 * Step 1: Search for candidates and return them based on confidence
 */
export const searchHotelCandidates = async (hotelRegistrationData) => {
    if (isE2EMockMode()) {
        return [
            {
                place_id: 'mock-place-1',
                title: `${hotelRegistrationData.name} - Mock Match`,
                address: hotelRegistrationData.address,
                thumbnail: 'https://example.com/mock-hotel-thumbnail.jpg',
                confidence: 96,
                gps: {
                    latitude: -8.4095,
                    longitude: 115.1889
                }
            },
            {
                place_id: 'mock-place-2',
                title: `${hotelRegistrationData.name} - Alternative Mock`,
                address: `${hotelRegistrationData.address} (Alt)`,
                thumbnail: 'https://example.com/mock-hotel-thumbnail-alt.jpg',
                confidence: 84,
                gps: {
                    latitude: -8.4101,
                    longitude: 115.1902
                }
            }
        ];
    }

    const searchArgs = {
        query: hotelRegistrationData.name,
        location: hotelRegistrationData.address
    };

    const searchResults = await searchHotel(searchArgs);

    if (!searchResults || searchResults.length === 0 || searchResults.error) {
        return [];
    }

    const messages = [
        {
            role: "system",
            content: `You are an AI assistant helping to verify hotel registrations.
You will be provided with the hotel details registered by the user, and an array of Google Local search results.
Your task is to calculate a match confidence score (0-100) for each search result based on how closely it matches the registered hotel name and address.

You MUST follow these rules exactly:
- If your confidence for the BEST match is > 90, return ONLY that 1 hotel in the array.
- If your confidence for the BEST match is > 80 but <= 90, return the top matching hotels (up to 5) in descending order of confidence.
- If your confidence for the BEST match is <= 80, return the top matching hotels (up to 5) in descending order.

Output strictly in JSON format matching this schema:
{
  "candidates": [
    {
      "place_id": "string", // Return the data_id if present, else place_id
      "title": "string",
      "address": "string",
      "thumbnail": "string", // Copy verbatim from search results
      "confidence": number,
      "gps": {
         "latitude": number,
         "longitude": number
      } // Copy verbatim from search results
    }
  ]
}`
        },
        {
            role: "user",
            content: `Registered Hotel Data:
Name: ${hotelRegistrationData.name}
Address: ${hotelRegistrationData.address}

Google Search Results:
${JSON.stringify(searchResults, null, 2)}`
        }
    ];

    try {
        const response = await openai.chat.completions.create({
            model: "gpt-4o", // gpt-4o-mini is also fine here if speed/cost is prioritized
            messages: messages,
            response_format: { type: "json_object" }
        });

        const rawContent = response.choices[0].message.content;
        return JSON.parse(rawContent).candidates || [];

    } catch (error) {
        console.error("Agent Search Error:", error);
        return [];
    }
};

/**
 * Step 2: Evaluate a confirmed place_id's reviews to generate a score and justification
 */
export const evaluateHotelReviews = async (placeId, hotelRegistrationData) => {
    if (isE2EMockMode()) {
        return {
            score: 78,
            justification: `Mock evaluation for ${hotelRegistrationData.name}. Reviews indicate generally strong sustainability and ethical service practices.`
        };
    }

    const reviews = await fetchReviews({ place_id: placeId });

    if (!Array.isArray(reviews) || reviews.length === 0) {
        return {
            score: 0,
            justification: "No reviews found or error fetching reviews."
        };
    }

    const messages = [
        {
            role: "system",
            content: `You are an ethical tourism evaluator. 
Your goal is to analyze the provided Google reviews for a hotel and evaluate its ethical and sustainability practices.
Analyze the reviews for positive and negative patterns regarding sustainability, ethics, environmental impact, and staff treatment.
You MUST output your final answer as a raw JSON object matching this schema:
{
  "score": <Number 0-100>,
  "justification": "<String explaining the score based on reviews>"
}`
        },
        {
            role: "user",
            content: `Hotel Registered Data: ${JSON.stringify(hotelRegistrationData)}
            
Google Reviews:
${JSON.stringify(reviews, null, 2)}`
        }
    ];

    try {
        const response = await openai.chat.completions.create({
            model: "gpt-4o",
            messages: messages,
            response_format: { type: "json_object" }
        });

        const rawContent = response.choices[0].message.content;
        return JSON.parse(rawContent);

    } catch (error) {
        console.error("Agent Evaluation Error:", error);
        return {
            score: 0,
            justification: "Failed to evaluate via Agent due to formatting or network error."
        };
    }
};
