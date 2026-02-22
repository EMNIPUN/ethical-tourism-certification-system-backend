import mongoose from 'mongoose';

const HotelRequestSchema = new mongoose.Schema({
    hotelId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Hotel',
        required: true
    },
    hotelScore: {
        status: {
            type: String,
            enum: ['passed', 'failed'],
            required: true
        }
    },
    auditScore: {
        status: {
            type: String,
            enum: ['passed', 'failed'],
            required: true
        }
    }
}, {
    timestamps: true
});

const HotelRequest = mongoose.model('HotelRequest', HotelRequestSchema);

export default HotelRequest;
