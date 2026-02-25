import { getJson } from 'serpapi';
import OpenAI from 'openai';
import dotenv from 'dotenv';
dotenv.config();

const openai = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY,
});

const SERPAPI_KEY = process.env.SERPAPI_KEY;

// Tool implementations
const searchHotel = async ({ query, location }) => {
    try {
        const response = await getJson({
            engine: "google_local",
            q: query,
            location: location || "Global",
            api_key: SERPAPI_KEY
        });

        return response.local_results?.slice(0, 5).map(res => ({
            place_id: res.place_id,
            title: res.title,
            rating: res.rating,
            reviews_count: res.reviews,
            address: res.address
        })) || [];
    } catch (error) {
        console.error("SerpApi Search Error:", error);
        return { error: "Failed to search hotel on Google" };
    }
};

const fetchReviews = async ({ place_id }) => {
    try {
        let allReviews = [];
        let next_page_token = undefined;
        // Fetch up to 2 pages of reviews mapped tightly to save tokens
        for (let i = 0; i < 2; i++) {
            const response = await getJson({
                engine: "google_maps_reviews",
                data_id: undefined, // Requires data_id if place_id fails, but usually place_id works if fetched from local
                place_id: place_id,
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
        return allReviews || { message: "No reviews found." };
    } catch (error) {
        console.error("SerpApi Reviews Error:", error);
        return { error: "Failed to fetch reviews" };
    }
};

// Tool Definitions for OpenAI
const tools = [
    {
        type: "function",
        function: {
            name: "search_hotel",
            description: "Search for a hotel on Google Local to find its correct place_id.",
            parameters: {
                type: "object",
                properties: {
                    query: { type: "string", description: "The name of the hotel to search for." },
                    location: { type: "string", description: "The location/city of the hotel." }
                },
                required: ["query"]
            }
        }
    },
    {
        type: "function",
        function: {
            name: "fetch_reviews",
            description: "Fetch reviews for a specific Google place_id.",
            parameters: {
                type: "object",
                properties: {
                    place_id: { type: "string", description: "The Google place_id of the hotel." }
                },
                required: ["place_id"]
            }
        }
    }
];

export const evaluateHotelAgent = async (hotelRegistrationData) => {
    const messages = [
        {
            role: "system",
            content: `You are an ethical tourism evaluator. 
Your goal is to find the correct hotel using the provided tools, read its reviews, and evaluate its ethical and sustainability practices.
If the initial search fails, self-correct and try variations of the hotel name or location.
Once you have retrieved the reviews, analyze them for positive and negative patterns regarding sustainability, ethics, and service.
You MUST output your final answer as a raw JSON object (with no markdown block formatting) matching this schema:
{
  "score": <Number 0-100>,
  "justification": "<String explaining the score based on reviews>"
}`
        },
        {
            role: "user",
            content: `Please evaluate this hotel: \n${JSON.stringify(hotelRegistrationData, null, 2)}`
        }
    ];

    try {
        while (true) {
            const response = await openai.chat.completions.create({
                model: "gpt-4o",
                messages: messages,
                tools: tools,
                tool_choice: "auto",
                response_format: { type: "json_object" }
            });

            const responseMessage = response.choices[0].message;
            messages.push(responseMessage);

            if (responseMessage.tool_calls) {
                for (const toolCall of responseMessage.tool_calls) {
                    const functionName = toolCall.function.name;
                    const functionArgs = JSON.parse(toolCall.function.arguments);
                    let functionResult;

                    console.log(`[Agent] Calling ${functionName} with ${JSON.stringify(functionArgs)}`);

                    if (functionName === 'search_hotel') {
                        functionResult = await searchHotel(functionArgs);
                    } else if (functionName === 'fetch_reviews') {
                        functionResult = await fetchReviews(functionArgs);
                    }

                    messages.push({
                        tool_call_id: toolCall.id,
                        role: "tool",
                        name: functionName,
                        content: JSON.stringify(functionResult)
                    });
                }
            } else {
                // No more tool calls, the model gave us the final answer
                console.log("[Agent] Final answer received.");
                let parsedResult;
                try {
                    // Try to parse the raw text output
                    let rawContent = responseMessage.content;
                    // Remove markdown formatting if the LLM ignored instructions
                    rawContent = rawContent.replace(/^\`\`\`json/m, '').replace(/^\`\`\`/m, '').trim();
                    parsedResult = JSON.parse(rawContent);
                } catch (e) {
                    console.error("Failed to parse LLM final output as JSON:", e);
                    // Fallback
                    parsedResult = {
                        score: 0,
                        justification: "Failed to evaluate via Agent due to formatting error."
                    };
                }
                return parsedResult;
            }
        }
    } catch (error) {
        console.error("Evaluation Agent Error:", error);
        return {
            score: 0,
            justification: "An error occurred during evaluation."
        };
    }
};
