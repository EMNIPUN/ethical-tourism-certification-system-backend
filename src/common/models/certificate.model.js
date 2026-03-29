import mongoose from "mongoose";

// --- Constants ---
export const CERTIFICATE_STATUS = {
   ACTIVE: "ACTIVE",
   EXPIRED: "EXPIRED",
   REVOKED: "REVOKED",
   INACTIVE: "INACTIVE",
};

export const CERTIFICATE_LEVEL = {
   PLATINUM: "PLATINUM",
   GOLD: "GOLD",
   SILVER: "SILVER",
};

export const TRUST_SCORE = {
   MIN: 0,
   MAX: 100,
   DEFAULT: 70,
   RENEWAL_BONUS: 5,
   REVIEW_CONFIDENCE_K: 20,
   MIN_REVIEWS_FOR_REVOCATION: 10,
   REVOKE_THRESHOLD: 50,
   PLATINUM_MIN: 90,
   GOLD_MIN: 75,
   SILVER_MIN: 50,
};

const CertificateSchema = new mongoose.Schema(
   {
      certificateNumber: {
         type: String,
         unique: true,
         immutable: true,
         required: [true, "Certificate number is required"],
      },
      hotelId: {
         type: mongoose.Schema.Types.ObjectId,
         ref: "Hotel",
         required: [true, "Hotel ID is required"],
      },
      issuedDate: {
         type: Date,
         default: Date.now,
      },
      expiryDate: {
         type: Date,
         required: [true, "Expiry date is required"],
      },
      status: {
         type: String,
         enum: Object.values(CERTIFICATE_STATUS),
         default: CERTIFICATE_STATUS.ACTIVE,
      },
      trustScore: {
         type: Number,
         min: [
            TRUST_SCORE.MIN,
            `Trust score cannot be below ${TRUST_SCORE.MIN}`,
         ],
         max: [TRUST_SCORE.MAX, `Trust score cannot exceed ${TRUST_SCORE.MAX}`],
         default: TRUST_SCORE.DEFAULT,
      },
      level: {
         type: String,
         enum: Object.values(CERTIFICATE_LEVEL),
         required: true,
      },
      renewalCount: {
         type: Number,
         default: 0,
      },
      revokedReason: {
         type: String,
      },
   },
   {
      timestamps: true,
   },
);

const Certificate = mongoose.model("Certificate", CertificateSchema);

export default Certificate;
