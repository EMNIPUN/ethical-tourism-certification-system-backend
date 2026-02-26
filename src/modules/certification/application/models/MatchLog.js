import mongoose from 'mongoose';

const matchLogSchema = new mongoose.Schema({
    hotelId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Hotel',
        required: true
    },
    hotelName: String,
    searchQuery: String,
    matchFound: Boolean,
    autoMatched: Boolean, // True if score > threshold
    matchScore: Number,
    candidatesCount: Number,
    candidates: [{
        name: String,
        address: String,
        score: Number,
        token: String
    }],
    createdAt: {
        type: Date,
        default: Date.now
    }
});

export default mongoose.model('MatchLog', matchLogSchema);
