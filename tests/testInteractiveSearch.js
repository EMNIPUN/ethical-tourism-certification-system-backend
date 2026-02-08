import axios from 'axios';

const API_URL = 'http://localhost:5000/api/hotels/search';

const testSearch = async () => {
    const query = "SaDev Lake Villa Bandaragama";
    console.log(`Testing search with query: "${query}"`);

    try {
        const response = await axios.get(API_URL, { params: { q: query } });

        if (response.status === 200 && response.data.success) {
            console.log(`Success! Found ${response.data.count} results.`);
            const matches = response.data.data;

            if (matches.length > 0) {
                const first = matches[0];
                console.log("Top Result:");
                console.log(`Name: ${first.name}`);
                console.log(`Address: ${first.address}`);
                console.log(`Rating: ${first.rating}`);
                console.log(`Token: ${first.token}`);
                console.log(`Thumbnail: ${first.thumbnail ? 'Present' : 'Missing'}`);

                if (first.name.includes("SaDev") && first.rating) {
                    console.log("Validation PASSED: Correct hotel found with rating.");
                } else {
                    console.log("Validation WARNING: Result might not match expectation completely.");
                }
            } else {
                console.log("Validation FAILED: No results found.");
            }
        } else {
            console.log("Validation FAILED: API Error", response.data);
        }
    } catch (error) {
        console.error("Validation FAILED: Request Error", error.message);
        if (error.response) {
            console.error("Status:", error.response.status);
            console.error("Data:", error.response.data);
        }
    }
};

testSearch();
