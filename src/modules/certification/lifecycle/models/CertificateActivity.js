import mongoose from "mongoose";

export const CERTIFICATE_ACTIVITY_EVENT = {
   CERTIFICATE_ISSUED: "CERTIFICATE_ISSUED",
   TRUST_SCORE_UPDATED: "TRUST_SCORE_UPDATED",
   LEVEL_CHANGED: "LEVEL_CHANGED",
   STATUS_CHANGED: "STATUS_CHANGED",
   CERTIFICATE_RENEWED: "CERTIFICATE_RENEWED",
   CERTIFICATE_REVOKED: "CERTIFICATE_REVOKED",
   CERTIFICATE_EXPIRED: "CERTIFICATE_EXPIRED",
   CERTIFICATE_INACTIVATED: "CERTIFICATE_INACTIVATED",
   AUTO_REVOCATION_TRIGGERED: "AUTO_REVOCATION_TRIGGERED",
   FEEDBACK_SYNC_APPLIED: "FEEDBACK_SYNC_APPLIED",
};

export const CERTIFICATE_ACTIVITY_SOURCE = {
   API: "API",
   SYSTEM: "SYSTEM",
   FEEDBACK_SYNC: "FEEDBACK_SYNC",
};

export const CERTIFICATE_ACTIVITY_ACTOR = {
   SYSTEM: "SYSTEM",
   USER: "USER",
};

const CertificateActivitySchema = new mongoose.Schema(
   {
      certificateId: {
         type: mongoose.Schema.Types.ObjectId,
         ref: "Certificate",
         required: true,
      },
      hotelId: {
         type: mongoose.Schema.Types.ObjectId,
         ref: "Hotel",
         required: true,
      },
      eventType: {
         type: String,
         enum: Object.values(CERTIFICATE_ACTIVITY_EVENT),
         required: true,
      },
      source: {
         type: String,
         enum: Object.values(CERTIFICATE_ACTIVITY_SOURCE),
         default: CERTIFICATE_ACTIVITY_SOURCE.API,
      },
      actorType: {
         type: String,
         enum: Object.values(CERTIFICATE_ACTIVITY_ACTOR),
         default: CERTIFICATE_ACTIVITY_ACTOR.SYSTEM,
      },
      actorId: {
         type: String,
      },
      summary: {
         type: String,
         required: true,
         trim: true,
      },
      changes: {
         type: mongoose.Schema.Types.Mixed,
      },
      metadata: {
         type: mongoose.Schema.Types.Mixed,
      },
      eventTime: {
         type: Date,
         default: Date.now,
      },
   },
   {
      timestamps: true,
   },
);

CertificateActivitySchema.index({ certificateId: 1, eventTime: -1 });
CertificateActivitySchema.index({ certificateId: 1, eventType: 1, eventTime: -1 });

const CertificateActivity = mongoose.model(
   "CertificateActivity",
   CertificateActivitySchema,
);

export default CertificateActivity;
