import VectorEmbedding from '../models/VectorEmbedding.js';
import mongoose from 'mongoose';

/**
 * Vector Database Service using MongoDB Vector Search
 * Manages hotel-specific vector embeddings for RAG system
 */
class VectorDBService {
    constructor() {
        this.collectionName = 'vectorembeddings';
    }

    /**
     * Get or create a vector index for a specific hotel
     * Each hotel has isolated embeddings via hotelId filter
     * @param {String} hotelId - Hotel MongoDB ObjectId
     * @returns {Object} Helper object with hotel context
     */
    async getHotelIndex(hotelId) {
        // Return helper object with hotelId context
        return {
            hotelId,
            insertItem: async (item) => {
                await this.addDocuments(hotelId, [item]);
            },
            queryItems: async (vector, limit = 5) => {
                return await this.search(hotelId, vector, limit);
            },
            isIndexCreated: async () => {
                const count = await VectorEmbedding.countDocuments({ hotelId });
                return count > 0;
            }
        };
    }

    /**
     * Add document embeddings to hotel's vector database
     * @param {String} hotelId - Hotel ID
     * @param {Array} items - Array of {id, text, metadata, vector}
     */
    async addDocuments(hotelId, items) {
        const documents = items.map(item => ({
            hotelId,
            embedding: item.vector,
            text: item.metadata?.text || item.text || '',
            metadata: {
                source: item.metadata?.source || 'unknown',
                type: item.metadata?.type || 'structured_data',
                documentId: item.id,
                chunkIndex: item.metadata?.chunkIndex
            }
        }));

        await VectorEmbedding.insertMany(documents);
        console.log(`Added ${items.length} documents to MongoDB vector DB for hotel ${hotelId}`);
    }

    /**
     * Search for similar documents using MongoDB Vector Search
     * @param {String} hotelId - Hotel ID
     * @param {Array} queryVector - Query embedding vector
     * @param {Number} topK - Number of results to return
     * @returns {Array} Similar documents with scores
     */
    async search(hotelId, queryVector, topK = 5) {
        try {
            // Use MongoDB aggregation with $vectorSearch (requires Atlas Vector Search index)
            const results = await VectorEmbedding.aggregate([
                {
                    $vectorSearch: {
                        index: "vector_index",
                        path: "embedding",
                        queryVector: queryVector,
                        numCandidates: topK * 10,
                        limit: topK,
                        filter: {
                            hotelId: new mongoose.Types.ObjectId(hotelId)
                        }
                    }
                },
                {
                    $project: {
                        text: 1,
                        metadata: 1,
                        score: { $meta: "vectorSearchScore" }
                    }
                }
            ]);

            return results.map(result => ({
                item: {
                    id: result._id,
                    metadata: {
                        text: result.text,
                        ...result.metadata
                    }
                },
                score: result.score
            }));
        } catch (error) {
            // Fallback to cosine similarity if vector search not available
            console.warn('Vector search index not found, using fallback cosine similarity');
            return await this.cosineSimilaritySearch(hotelId, queryVector, topK);
        }
    }

    /**
     * Fallback: Manual cosine similarity search (slower but works without vector index)
     * @param {String} hotelId - Hotel ID
     * @param {Array} queryVector - Query embedding vector
     * @param {Number} topK - Number of results to return
     * @returns {Array} Similar documents with scores
     */
    async cosineSimilaritySearch(hotelId, queryVector, topK = 5) {
        const allDocs = await VectorEmbedding.find({ hotelId }).lean();

        const results = allDocs.map(doc => {
            const similarity = this.cosineSimilarity(queryVector, doc.embedding);
            return {
                item: {
                    id: doc._id,
                    metadata: {
                        text: doc.text,
                        ...doc.metadata
                    }
                },
                score: similarity
            };
        });

        // Sort by similarity descending
        results.sort((a, b) => b.score - a.score);

        return results.slice(0, topK);
    }

    /**
     * Calculate cosine similarity between two vectors
     * @param {Array} vecA - First vector
     * @param {Array} vecB - Second vector
     * @returns {Number} Cosine similarity score (0-1)
     */
    cosineSimilarity(vecA, vecB) {
        let dotProduct = 0;
        let normA = 0;
        let normB = 0;

        for (let i = 0; i < vecA.length; i++) {
            dotProduct += vecA[i] * vecB[i];
            normA += vecA[i] * vecA[i];
            normB += vecB[i] * vecB[i];
        }

        return dotProduct / (Math.sqrt(normA) * Math.sqrt(normB));
    }

    /**
     * Delete all embeddings for a hotel
     * @param {String} hotelId - Hotel ID
     */
    async deleteHotelIndex(hotelId) {
        try {
            const result = await VectorEmbedding.deleteMany({ hotelId });
            console.log(`Deleted ${result.deletedCount} embeddings for hotel ${hotelId}`);
        } catch (error) {
            console.error(`Error deleting embeddings for hotel ${hotelId}:`, error.message);
        }
    }

    /**
     * Update a specific document in hotel's vector database
     * @param {String} hotelId - Hotel ID
     * @param {String} itemId - Document ID to update
     * @param {Object} item - Updated item data
     */
    async updateDocument(hotelId, itemId, item) {
        await VectorEmbedding.findOneAndUpdate(
            { hotelId, _id: itemId },
            {
                embedding: item.vector,
                text: item.text,
                metadata: item.metadata
            },
            { upsert: true }
        );

        console.log(`Updated document ${itemId} in MongoDB vector DB for hotel ${hotelId}`);
    }

    /**
     * Get statistics about hotel's vector database
     * @param {String} hotelId - Hotel ID
     * @returns {Object} Statistics
     */
    async getStats(hotelId) {
        try {
            const count = await VectorEmbedding.countDocuments({ hotelId });
            const firstDoc = await VectorEmbedding.findOne({ hotelId }).sort({ createdAt: 1 });
            const lastDoc = await VectorEmbedding.findOne({ hotelId }).sort({ createdAt: -1 });

            return {
                hotelId,
                totalDocuments: count,
                storage: 'MongoDB',
                created: firstDoc?.createdAt,
                modified: lastDoc?.createdAt,
                indexExists: count > 0
            };
        } catch (error) {
            return {
                hotelId,
                totalDocuments: 0,
                error: error.message
            };
        }
    }

    /**
     * Clear cache and free memory (not needed for MongoDB)
     */
    clearCache() {
        console.log('MongoDB vector DB does not use cache');
    }
}

export default new VectorDBService();
