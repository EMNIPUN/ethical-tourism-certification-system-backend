/**
 * OpenAI Service for RAG System
 * Uses OpenAI API for embeddings and chat completions
 */
class OpenAIService {
    constructor() {
        this.apiKey = process.env.OPENAI_API_KEY;

        if (!this.apiKey) {
            console.warn('⚠️  OPENAI_API_KEY not found in environment variables');
        }

        this.apiUrl = 'https://api.openai.com/v1';
        this.embeddingModel = 'text-embedding-ada-002'; // Stable, reliable embedding model
        this.chatModel = 'gpt-3.5-turbo'; // Chat model
    }

    /**
     * Generate embedding for text
     */
    async generateEmbedding(text) {
        try {
            const response = await fetch(`${this.apiUrl}/embeddings`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${this.apiKey}`
                },
                body: JSON.stringify({
                    model: this.embeddingModel,
                    input: text
                })
            });

            if (!response.ok) {
                const error = await response.json();
                throw new Error(`OpenAI API error: ${error.error?.message || response.statusText}`);
            }

            const data = await response.json();
            return data.data[0].embedding;
        } catch (error) {
            throw new Error(`Failed to generate embedding: ${error.message}`);
        }
    }

    /**
     * Generate RAG response with context
     */
    async generateRAGResponse(query, contextDocs) {
        try {
            // Build context from retrieved documents
            const context = contextDocs
                .map((doc, idx) => `[Document ${idx + 1}]:\n${doc.text}`)
                .join('\n\n');

            const response = await fetch(`${this.apiUrl}/chat/completions`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${this.apiKey}`
                },
                body: JSON.stringify({
                    model: this.chatModel,
                    messages: [
                        {
                            role: 'system',
                            content: 'You are an AI assistant helping auditors review hotel information. Answer based ONLY on the provided context. If information is not in context, clearly state "I don\'t have that information in the documents."'
                        },
                        {
                            role: 'user',
                            content: `CONTEXT:\n${context}\n\nQUESTION: ${query}\n\nProvide a clear, concise answer based only on the context above.`
                        }
                    ],
                    temperature: 0.7,
                    max_tokens: 500
                })
            });

            if (!response.ok) {
                const error = await response.json();
                throw new Error(`OpenAI API error: ${error.error?.message || response.statusText}`);
            }

            const data = await response.json();
            return data.choices[0].message.content;
        } catch (error) {
            throw new Error(`Failed to generate response: ${error.message}`);
        }
    }
}

export default new OpenAIService();

