import { getJson } from "serpapi";
import fs from 'fs';
import Hotel from '../models/Hotel.js';
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

const calculateSimilarity = (str1, str2) => {
    const s1 = str1.toLowerCase();
    const s2 = str2.toLowerCase();
    const longer = s1.length > s2.length ? s1 : s2;
    if (longer.length === 0) return 1.0;
    return (longer.length - levenshteinDistance(s1, s2)) / parseFloat(longer.length);
};

const calculateMatchScore = (hotel, candidate) => {
    let score = 0;
    const logs = [];

    // 1. Name Match (Max 40)
    const hName = hotel.businessInfo.name.toLowerCase();
    const cName = candidate.name.toLowerCase();
    let nameSim = calculateSimilarity(hotel.businessInfo.name, candidate.name);

    // Boost if one contains the other
    if (hName.includes(cName) || cName.includes(hName)) {
        nameSim = Math.max(nameSim, 0.9);
    }

    // Token-based matching: boost if all significant words match (handles word reordering)
    const stopWords = ['hotel', 'resort', 'the', 'a', 'an', 'by', 'at'];
    const hTokens = hName.split(/\s+/).filter(w => !stopWords.includes(w) && w.length > 2);
    const cTokens = cName.split(/\s+/).filter(w => !stopWords.includes(w) && w.length > 2);
    const hInC = hTokens.filter(t => cTokens.some(ct => ct.includes(t) || t.includes(ct)));
    if (hTokens.length > 0 && hInC.length >= hTokens.length * 0.7) {
        nameSim = Math.max(nameSim, 0.85);
    }

    const nameScore = nameSim * 40;
    score += nameScore;
    logs.push(`Name: ${nameScore.toFixed(2)} (${nameSim.toFixed(2)})`);

    // 2. Distance Match (Max 30)
    let distScore = 0;
    if (hotel.businessInfo.contact.gps && candidate.gps_coordinates) {
        const dist = calculateDistance(
            hotel.businessInfo.contact.gps.latitude,
            hotel.businessInfo.contact.gps.longitude,
            candidate.gps_coordinates.latitude,
            candidate.gps_coordinates.longitude
        );
        if (dist < 100) distScore = 30;
        else if (dist < 500) distScore = 15;
        logs.push(`Dist: ${distScore} (${dist.toFixed(0)}m)`);
    } else {
        logs.push(`Dist: 0 (No GPS)`);
    }
    score += distScore;

    // 3. Rating Match (Max 15)
    let ratingScore = 0;
    const userRating = hotel.scoring?.googleRating || hotel.guestServices?.experience?.averageRating;

    if (candidate.overall_rating && userRating) {
        const diff = Math.abs(candidate.overall_rating - userRating);
        if (diff <= 0.1) ratingScore = 15;
        else if (diff <= 0.5) ratingScore = 10;
        else ratingScore = 5;
    } else if (candidate.overall_rating) {
        ratingScore = 5; // Base points for having a rating
    }
    score += ratingScore;
    logs.push(`Rating: ${ratingScore}`);

    // 4. Amenity Overlap (Max 10)
    let amenityScore = 0;
    if (candidate.amenities && candidate.amenities.length > 3) {
        amenityScore = 10;
    }
    score += amenityScore;
    logs.push(`Amenities: ${amenityScore}`);

    // 5. Eco-Cert Bonus (Max 5)
    let ecoScore = 0;
    if (candidate.eco_certified || (candidate.eco_certifications && candidate.eco_certifications.length > 0)) {
        if (hotel.sustainability?.certifications && hotel.sustainability.certifications.length > 0) {
            ecoScore = 5;
        }
    }
    score += ecoScore;
    logs.push(`Eco: ${ecoScore}`);

    const logMsg = `[MatchDetails] ${candidate.name}: Total ${score.toFixed(2)} [${logs.join(', ')}]`;
    console.log(logMsg);


    return { score, logs };
};

export const fetchGoogleRating = async (hotel) => {
    try {
        let property = null;

        // 1. PRIORITIZE TOKEN LOOKUP
        // If we have a specific token (e.g. from manual confirmation), use it to match the exact property
        if (hotel.businessInfo.serpApiPropertyToken) {
            console.log(`[fetchGoogleRating] Using Token: ${hotel.businessInfo.serpApiPropertyToken}`);
            // We still need to search because SerpApi "google_hotels" doesn't have a direct "get by token" endpoint
            // that returns the rating in the same format easily without a search context.
            // However, we can search by name and then filter by token.
        }

        // Search Google Hotels
        const params = {
            engine: "google_hotels",
            q: `${hotel.businessInfo.name} ${hotel.businessInfo.contact.address}`,
            check_in_date: new Date().toISOString().split('T')[0],
            check_out_date: new Date(Date.now() + 86400000).toISOString().split('T')[0],
            currency: "USD",
            gl: "us",
            hl: "en",
            api_key: process.env.SERPAPI_KEY
        };

        const response = await getJson(params);

        // 2. Filter by Token if available
        if (hotel.businessInfo.serpApiPropertyToken && response.properties) {
            property = response.properties.find(p => p.property_token === hotel.businessInfo.serpApiPropertyToken);
        }

        // 3. Fallback to first result if no token or token not found
        if (!property && response.properties && response.properties.length > 0) {
            // Only fallback if we didn't have a specific token we were looking for, 
            // OR if the token search failed but the name match is very strong.
            // But for "fetchGoogleRating" which is used for updates, we generally want the best match.
            // If the user *confirmed* a token, we should probably stick to it or warn. 
            // For now, if token lookup fails, we assume the search results might have changed or token expired,
            // so we take the top result *if* it matches the name well.
            // unexpected fallback might be dangerous if we already confirmed a specific hotel.

            // However, simplicity for now:
            if (!hotel.businessInfo.serpApiPropertyToken) {
                property = response.properties[0];
            }
        }

        if (property) {
            console.log(`[fetchGoogleRating] Found: ${property.name} (Rating: ${property.overall_rating})`);
            return {
                rating: property.overall_rating || 0,
                reviews: property.reviews || 0
            };
        } else {
            console.log("[fetchGoogleRating] No property found.");
            return { rating: null };
        }
    } catch (error) {
        console.error("Error fetching Google rating:", error);
        return { rating: null };
    }
};

export const findBestMatch = async (hotel) => {
    // Strip random ID from name for clean search/scoring if present (heuristic: 5-char alphanumeric at end)
    const cleanName = hotel.businessInfo.name.replace(/\s[a-z0-9]{5,13}$/i, '');
    const cleanAddress = hotel.businessInfo.contact.address.replace(/(\s#[a-z0-9]{5,13})$/i, '');

    const query = `${cleanName} ${cleanAddress}`;

    // Create a clean hotel object for scoring to avoid penalizing the random suffix
    const cleanHotel = {
        ...hotel,
        businessInfo: {
            ...hotel.businessInfo,
            name: cleanName,
            contact: {
                ...hotel.businessInfo.contact,
                address: cleanAddress
            }
        }
    };

    if (!API_KEY) return { match: null, candidates: [] };

    const today = new Date();
    const checkIn = new Date(today);
    checkIn.setDate(today.getDate() + 30);
    const formatDate = (date) => date.toISOString().split('T')[0];

    const performSearch = (q) => {
        return new Promise((resolve) => {
            console.log(`[findBestMatch] Searching Google Hotels for: "${q}"`);
            getJson({
                engine: "google_hotels",
                q: q,
                check_in_date: formatDate(checkIn),
                check_out_date: formatDate(checkIn), // 1 night
                api_key: API_KEY
            }, resolve);
        });
    };

    // Attempt 1: Name + Address
    let json = await performSearch(query);

    // Initial Processing
    let processCandidates = (properties) => {
        if (!properties) return [];
        const processed = properties.map(p => {
            const { score, logs } = calculateMatchScore(cleanHotel, p);
            return {
                ...p,
                matchScore: score,
                matchLogs: logs,
                token: p.property_token,
                ratring: p.overall_rating,
                thumbnail: p.images?.[0]?.thumbnail,
                address: p.formatted_address || p.location_description
            };
        });
        processed.sort((a, b) => b.matchScore - a.matchScore);
        return processed;
    };

    let candidates = processCandidates(json?.properties);

    // check if we have a good match
    let best = candidates[0];

    // Fallback: If no results or best score < 60, try Name Only
    if (!best || best.matchScore < 60) {
        console.log(`[findBestMatch] Weak or no match (Score: ${best?.matchScore || 0}). Retrying with name only: "${cleanName}"`);
        json = await performSearch(cleanName);

        const fallbackCandidates = processCandidates(json?.properties);

        // Merge or replace? 
        // If fallback finds better scores, use them. 
        // Let's combine and re-sort to be safe, prioritizing unique tokens.
        const allCandidates = [...candidates, ...fallbackCandidates];
        // Deduplicate by token
        const uniqueCandidates = Array.from(new Map(allCandidates.map(c => [c.property_token, c])).values());
        uniqueCandidates.sort((a, b) => b.matchScore - a.matchScore);

        candidates = uniqueCandidates;
        best = candidates[0];
    }

    if (best && best.matchScore > 50) {
        return { match: best, candidates: [] };
    } else if (candidates.length > 0) {
        return { match: null, candidates: candidates.slice(0, 5) }; // Return top 5
    }

    return { match: null, candidates: [] };
};

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
