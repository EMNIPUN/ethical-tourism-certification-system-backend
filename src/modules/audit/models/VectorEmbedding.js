import mongoose from 'mongoose';

/**
 * Vector Embedding Model
 * Stores document embeddings for RAG system using MongoDB
 */
const VectorEmbeddingSchema = new mongoose.Schema({
    hotelId: {
        type: mongoose.Schema.Types.ObjectId,
        required: true,
        ref: 'Hotel',
        index: true
    },
    embedding: {
        type: [Number],
        required: true
    },
    text: {
        type: String,
        required: true
    },
    metadata: {
        source: {
            type: String,
            required: true
        },
        type: {
            type: String,
            enum: ['structured_data', 'legal_document', 'evidence_document', 'uploaded_document'],
            required: true
        },
        documentId: String,
        chunkIndex: Number
    },
    createdAt: {
        type: Date,
        default: Date.now
    }
});

// Index for efficient querying by hotelId
VectorEmbeddingSchema.index({ hotelId: 1, 'metadata.type': 1 });

// Create a vector search index (this needs to be created in MongoDB Atlas)
// Run this command in MongoDB Atlas or via mongosh:
/*
db.vectorembeddings.createSearchIndex({
  name: "vector_index",
  type: "vectorSearch",
  definition: {
    "fields": [{
      "type": "vector",
      "numDimensions": 1536,
      "path": "embedding",
      "similarity": "cosine"
    }]
  }
});
*/

const VectorEmbedding = mongoose.model('VectorEmbedding', VectorEmbeddingSchema);

export default VectorEmbedding;
