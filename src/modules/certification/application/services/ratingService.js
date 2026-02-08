import { getJson } from "serpapi";
import Hotel from '../../../../common/models/Hotel.js';
import dotenv from 'dotenv';

dotenv.config();

const API_KEY = process.env.SERPAPI_KEY;

/**
 * Calculates the distance between two GPS coordinates in meters.
 * Using Haversine formula.
 */
const calculateDistance = (lat1, lon1, lat2, lon2) => {
    const R = 6371e3; // metres
    const φ1 = lat1 * Math.PI / 180; // φ, λ in radians
    const φ2 = lat2 * Math.PI / 180;
    const Δφ = (lat2 - lat1) * Math.PI / 180;
    const Δλ = (lon2 - lon1) * Math.PI / 180;

    const a = Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
        Math.cos(φ1) * Math.cos(φ2) *
        Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

    return R * c; // in metres
};

/**
 * Searches for a hotel on Google Hotels via SerpApi.
 * Returns the property token and overall rating if found.
 * 
 * @param {Object} hotel - The hotel object containing name, address, and optional GPS.
 * @returns {Promise<{token: string|null, rating: number|null}>}
 */
const searchHotel = async (hotel) => {
    if (!API_KEY) {
        console.warn("SERPAPI_KEY is not set.");
        return { token: null, rating: null };
    }

    const query = `${hotel.businessInfo.name} ${hotel.businessInfo.contact.address} `;
    const today = new Date();
    const checkIn = new Date(today);
    checkIn.setDate(today.getDate() + 30); // 30 days in future
    const checkOut = new Date(checkIn);
    checkOut.setDate(checkIn.getDate() + 1);

    const formatDate = (date) => date.toISOString().split('T')[0];

    return new Promise(async (resolve, reject) => {
        // Helper to perform search
        const performSearch = (q) => {
            return new Promise((res) => {
                console.log(`Searching Google Hotels for: "${q}"`);
                getJson({
                    engine: "google_hotels",
                    q: q,
                    check_in_date: formatDate(checkIn),
                    check_out_date: formatDate(checkOut),
                    api_key: API_KEY
                }, (json) => res(json));
            });
        };

        // Attempt 1: Full Query (Name + Address)
        let json = await performSearch(query);

        // Attempt 2: Name Only (Fallback)
        if (!json || !json.properties || json.properties.length === 0) {
            console.log(`No results for full address.Retrying with name only: "${hotel.businessInfo.name}"`);
            json = await performSearch(hotel.businessInfo.name);
        }

        // Final Check
        if (!json || !json.properties || json.properties.length === 0) {
            console.log("No properties found after fallback.");
            resolve({ token: null, rating: null });
            return;
        }

        // Verification Logic
        const hotelGps = hotel.businessInfo.contact.gps;
        let bestMatch = null;

        if (hotelGps && hotelGps.latitude && hotelGps.longitude) {
            // Find the closest property within 500m
            for (const property of json.properties) {
                if (property.gps_coordinates) {
                    const distance = calculateDistance(
                        hotelGps.latitude,
                        hotelGps.longitude,
                        property.gps_coordinates.latitude,
                        property.gps_coordinates.longitude
                    );
                    console.log(`Checking ${property.name}: Distance = ${distance} m`);
                    if (distance < 500) {
                        bestMatch = property;
                        break; // Stop at first close match
                    }
                }
            }
        } else {
            console.log("No valid GPS provided for hotel, using first result.");
            bestMatch = json.properties[0];
        }

        if (bestMatch && bestMatch.property_token) {
            console.log(`Match found: ${bestMatch.name} `);
            console.log(`Token: ${bestMatch.property_token} `);
            console.log(`Rating: ${bestMatch.overall_rating || 'N/A'} `);

            resolve({
                token: bestMatch.property_token,
                rating: bestMatch.overall_rating || null
            });
        } else {
            console.log("No matching property found within GPS range or no token available.");
            resolve({ token: null, rating: null });
        }
    });
};

/**
 * Computes Levenshtein Distance between two strings.
 */
const levenshteinDistance = (a, b) => {
    if (a.length === 0) return b.length;
    if (b.length === 0) return a.length;
    const matrix = [];
    for (let i = 0; i <= b.length; i++) {
        matrix[i] = [i];
    }
    for (let j = 0; j <= a.length; j++) {
        matrix[0][j] = j;
    }
    for (let i = 1; i <= b.length; i++) {
        for (let j = 1; j <= a.length; j++) {
            if (b.charAt(i - 1) === a.charAt(j - 1)) {
                matrix[i][j] = matrix[i - 1][j - 1];
            } else {
                matrix[i][j] = Math.min(
                    matrix[i - 1][j - 1] + 1,
                    matrix[i][j - 1] + 1,
                    matrix[i - 1][j] + 1
                );
            }
        }
    }
    return matrix[b.length][a.length];
};

/**
 * Calculates similarity percentage between two strings.
 */
const calculateSimilarity = (str1, str2) => {
    const s1 = str1.toLowerCase();
    const s2 = str2.toLowerCase();
    const longer = s1.length > s2.length ? s1 : s2;
    if (longer.length === 0) return 1.0;
    return (longer.length - levenshteinDistance(s1, s2)) / parseFloat(longer.length);
};

/**
 * Calculates a match score for a candidate property against the user-provided hotel data.
 * Max Score: 100 + 5 (Bonus)
 * 
 * Weights:
 * - Name: 40
 * - Distance: 30
 * - Rating: 15
 * - Amenities: 10
 * - Eco-Cert: 5 (Bonus)
 */
const calculateMatchScore = (hotel, candidate) => {
    let score = 0;

    // 1. Name Match (Max 40)
    const nameSim = calculateSimilarity(hotel.businessInfo.name, candidate.name);
    score += nameSim * 40;

    // 2. Distance Match (Max 30)
    if (hotel.businessInfo.contact.gps && candidate.gps_coordinates) {
        const dist = calculateDistance(
            hotel.businessInfo.contact.gps.latitude,
            hotel.businessInfo.contact.gps.longitude,
            candidate.gps_coordinates.latitude,
            candidate.gps_coordinates.longitude
        );
        if (dist < 100) score += 30;
        else if (dist < 500) score += 15;
        // else 0
    }

    // 3. Rating Match (Max 15)
    if (candidate.overall_rating && hotel.scoring && hotel.scoring.googleRating) {
        const diff = Math.abs(candidate.overall_rating - hotel.scoring.googleRating);
        if (diff <= 0.1) score += 15;
        else if (diff <= 0.5) score += 10;
    } else if (candidate.overall_rating) {
        // If user didn't provide rating but candidate has one, give partial points
        score += 5;
    }

    // 4. Amenity Overlap (Max 10)
    if (candidate.amenities && hotel.guestServices.facilities) {
        // This is tricky as format differs. 
        // Simple check: does name of amenity appear in candidate amenities?
        // We'll skip deep comparison for now and just give points if candidate has rich data
        if (candidate.amenities.length > 3) score += 10;
    }

    // 5. Eco-Cert Bonus (Max 5)
    if (candidate.eco_certified || (candidate.eco_certifications && candidate.eco_certifications.length > 0)) {
        // If user also claims certs, full bonus
        if (hotel.sustainability.certifications && hotel.sustainability.certifications.length > 0) {
            score += 5;
        }
    }

    return score;
};

/**
 * Orchestrates the fetching of Google Rating.
 * Wrapper around findBestMatch to maintain backward compatibility for services.
 * 
 * @param {Object} hotel - The hotel object.
 * @returns {Promise<{rating: number|null, token: string|null}>}
 */
export const fetchGoogleRating = async (hotel) => {
    try {
        const { match } = await findBestMatch(hotel);
        if (match) {
            return {
                rating: match.overall_rating || null,
                token: match.property_token || null
            };
        }
        return { rating: null, token: null };
    } catch (error) {
        console.error("Error in fetchGoogleRating:", error);
        return { rating: null, token: null };
    }
};

/**
 * Orchestrates the finding of the best hotel match.
 * 
 * @param {Object} hotel - The hotel object.
 * @returns {Promise<{match: Object|null, candidates: Array<Object>}>}
 */
export const findBestMatch = async (hotel) => {
    const query = `${hotel.businessInfo.name} ${hotel.businessInfo.contact.address}`;
    // Use searchMatches to get potential candidates from SerpApi
    // We need to slightly modify searchMatches to return raw objects for scoring if needed
    // But currently searchMatches maps them. Let's reuse the logic but get raw or map correctly.

    // We'll reimplement the fetching here to have full control or update searchMatches.
    // For now, let's assume searchMatches returns formatted objects, 
    // but we need 'eco_certifications', 'amenities' etc which searchMatches MIGHT NOT return yet.
    // So we need to update searchMatches first or duplicate fetch logic.
    // Duplicating fetch logic for clarity inside this advanced matcher.

    if (!API_KEY) return { match: null, candidates: [] };

    const today = new Date();
    const checkIn = new Date(today);
    checkIn.setDate(today.getDate() + 30);
    const formatDate = (date) => date.toISOString().split('T')[0];

    const json = await new Promise((resolve) => {
        getJson({
            engine: "google_hotels",
            q: query,
            check_in_date: formatDate(checkIn),
            check_out_date: formatDate(checkIn), // 1 night
            api_key: API_KEY
        }, resolve);
    });

    if (!json || !json.properties) return { match: null, candidates: [] };

    const candidates = json.properties.map(p => {
        const score = calculateMatchScore(hotel, p);
        return {
            ...p,
            matchScore: score,
            // Standardize fields for frontend
            token: p.property_token,
            ratring: p.overall_rating,
            thumbnail: p.images?.[0]?.thumbnail,
            address: p.formatted_address || p.location_description
        };
    });

    // Sort by score
    candidates.sort((a, b) => b.matchScore - a.matchScore);

    const best = candidates[0];
    if (best && best.matchScore > 85) {
        return { match: best, candidates: [] };
    } else if (candidates.length > 0) {
        return { match: null, candidates: candidates.slice(0, 5) }; // Return top 5
    }

    return { match: null, candidates: [] };
};

/**
 * Searches for potential hotel matches on Google Hotels.
 * Legacy wrapper: Returns simple list.
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
