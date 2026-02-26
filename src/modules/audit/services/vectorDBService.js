import { LocalIndex } from 'vectra';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs/promises';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/**
 * Vector Database Service using Vectra
 * Manages hotel-specific vector databases for RAG system
 */
class VectorDBService {
    constructor() {
        // Base directory for all vector databases
        this.baseVectorPath = path.join(__dirname, '../../../../vector_dbs');
        this.indexes = new Map(); // Cache for loaded indexes
    }

    /**
     * Get or create a vector index for a specific hotel
     * Each hotel has its own isolated vector database
     * @param {String} hotelId - Hotel MongoDB ObjectId
     * @returns {LocalIndex} Vector index instance
     */
    async getHotelIndex(hotelId) {
        // Check if already loaded in cache
        if (this.indexes.has(hotelId)) {
            return this.indexes.get(hotelId);
        }

        // Create hotel-specific directory
        const hotelVectorPath = path.join(this.baseVectorPath, hotelId);
        
        // Ensure directory exists
        await fs.mkdir(hotelVectorPath, { recursive: true });

        // Create or load index
        const index = new LocalIndex(hotelVectorPath);

        // Check if index exists, if not create it
        if (!(await index.isIndexCreated())) {
            await index.createIndex();
        }

        // Cache the index
        this.indexes.set(hotelId, index);

        return index;
    }

    /**
     * Add document embeddings to hotel's vector database
     * @param {String} hotelId - Hotel ID
     * @param {Array} items - Array of {id, text, metadata, vector}
     */
    async addDocuments(hotelId, items) {
        const index = await this.getHotelIndex(hotelId);

        for (const item of items) {
            await index.insertItem({
                id: item.id,
                metadata: {
                    text: item.text,
                    source: item.metadata?.source || 'unknown',
                    section: item.metadata?.section || 'general',
                    timestamp: item.metadata?.timestamp || new Date().toISOString(),
                    ...item.metadata
                },
                vector: item.vector
            });
        }

        console.log(`Added ${items.length} documents to vector DB for hotel ${hotelId}`);
    }

    /**
     * Search for similar documents in hotel's vector database
     * @param {String} hotelId - Hotel ID
     * @param {Array} queryVector - Query embedding vector
     * @param {Number} topK - Number of results to return
     * @returns {Array} Similar documents with scores
     */
    async search(hotelId, queryVector, topK = 5) {
        const index = await this.getHotelIndex(hotelId);

        const results = await index.queryItems(queryVector, topK);

        return results.map(result => ({
            id: result.item.id,
            text: result.item.metadata.text,
            metadata: result.item.metadata,
            score: result.score
        }));
    }

    /**
     * Delete all documents for a hotel
     * @param {String} hotelId - Hotel ID
     */
    async deleteHotelIndex(hotelId) {
        const hotelVectorPath = path.join(this.baseVectorPath, hotelId);
        
        try {
            await fs.rm(hotelVectorPath, { recursive: true, force: true });
            this.indexes.delete(hotelId);
            console.log(`Deleted vector DB for hotel ${hotelId}`);
        } catch (error) {
            console.error(`Error deleting vector DB for hotel ${hotelId}:`, error.message);
        }
    }

    /**
     * Update a specific document in hotel's vector database
     * @param {String} hotelId - Hotel ID
     * @param {String} itemId - Document ID to update
     * @param {Object} item - Updated item data
     */
    async updateDocument(hotelId, itemId, item) {
        const index = await this.getHotelIndex(hotelId);

        await index.deleteItem(itemId);
        await index.insertItem({
            id: itemId,
            metadata: {
                text: item.text,
                ...item.metadata
            },
            vector: item.vector
        });

        console.log(`Updated document ${itemId} in vector DB for hotel ${hotelId}`);
    }

    /**
     * Get statistics about hotel's vector database
     * @param {String} hotelId - Hotel ID
     * @returns {Object} Statistics
     */
    async getStats(hotelId) {
        const index = await this.getHotelIndex(hotelId);
        const hotelVectorPath = path.join(this.baseVectorPath, hotelId);

        try {
            const stats = await fs.stat(hotelVectorPath);
            // Get all items to count
            const allItems = await index.listItems();
            
            return {
                hotelId,
                totalDocuments: allItems.length,
                path: hotelVectorPath,
                created: stats.birthtime,
                modified: stats.mtime,
                indexExists: await index.isIndexCreated()
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
     * Clear cache and free memory
     */
    clearCache() {
        this.indexes.clear();
        console.log('Vector DB cache cleared');
    }
}

export default new VectorDBService();
