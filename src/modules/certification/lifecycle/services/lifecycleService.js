import mongoose from "mongoose";
import Certificate, {
   CERTIFICATE_STATUS,
   CERTIFICATE_LEVEL,
   TRUST_SCORE,
} from "../../../../common/models/certificate.model.js";
import Hotel from "../../application/models/Hotel.js";
import HotelRequest from "../../../../common/models/HotelRequest.js";
import {
   sendCertificateIssuedEmail,
   sendCertificateExpiredEmail,
   sendCertificateRenewedEmail,
   sendCertificateRevokedEmail,
} from "../../../../common/utils/emailService.js";
import CertificateActivity, {
   CERTIFICATE_ACTIVITY_ACTOR,
   CERTIFICATE_ACTIVITY_EVENT,
   CERTIFICATE_ACTIVITY_SOURCE,
} from "../models/CertificateActivity.js";
/**
 * lifecycleService.js
 *
 * Contains all business logic for Certificate Lifecycle Management.
 */

// --- Helper: Calculate level from trust score ---
export const calculateLevel = (score) => {
   if (score >= TRUST_SCORE.PLATINUM_MIN) return CERTIFICATE_LEVEL.PLATINUM;
   if (score >= TRUST_SCORE.GOLD_MIN) return CERTIFICATE_LEVEL.GOLD;
   if (score >= TRUST_SCORE.SILVER_MIN) return CERTIFICATE_LEVEL.SILVER;
   return null; // Below threshold — should be revoked
};

// --- Helper: Calculate trust score from multiple weighted factors ---
export const calculateTrustScore = ({
   averageRating,
   reviewCount,
   renewalCount,
   issuedDate,
   baselineScore = TRUST_SCORE.DEFAULT,
}) => {
   // Factor 1: Average Rating (60%) — normalize 0–5 scale to 0–100
   const ratingScore = (averageRating / 5) * 100;

   // Factor 2: Review Count (20%) — capped at 50 reviews for full contribution
   const reviewScore = Math.min(reviewCount / 50, 1) * 100;

   // Factor 3: Renewal Count (10%) — capped at 5 renewals for full contribution
   const renewalScore = Math.min(renewalCount / 5, 1) * 100;

   // Factor 4: Certificate Age (10%) — capped at 24 months for full contribution
   const ageInMonths =
      (Date.now() - new Date(issuedDate).getTime()) /
      (1000 * 60 * 60 * 24 * 30.44);
   const ageScore = Math.min(ageInMonths / 24, 1) * 100;

   const weighted =
      ratingScore * 0.6 +
      reviewScore * 0.2 +
      renewalScore * 0.1 +
      ageScore * 0.1;

   const safeReviewCount = Math.max(0, Number(reviewCount) || 0);
   const confidence =
      safeReviewCount /
      (safeReviewCount + TRUST_SCORE.REVIEW_CONFIDENCE_K);
   const blended = baselineScore * (1 - confidence) + weighted * confidence;

   return Math.round(clampScore(blended));
};

// --- Helper: Generate unique certificate number ---
const generateCertificateNumber = () => {
   const timestamp = Date.now().toString(36).toUpperCase();
   const random = Math.random().toString(36).substring(2, 8).toUpperCase();
   return `CERT-${timestamp}-${random}`;
};

// --- Helper: Clamp trust score to valid range ---
const clampScore = (score) => {
   return Math.min(TRUST_SCORE.MAX, Math.max(TRUST_SCORE.MIN, score));
};

const buildActorContext = (actor = null, fallbackSource = CERTIFICATE_ACTIVITY_SOURCE.API) => {
   if (!actor) {
      return {
         actorType: CERTIFICATE_ACTIVITY_ACTOR.SYSTEM,
         actorId: null,
         source: fallbackSource,
      };
   }

   return {
      actorType: actor.actorType || CERTIFICATE_ACTIVITY_ACTOR.USER,
      actorId: actor.actorId || null,
      source: actor.source || fallbackSource,
   };
};

const recordCertificateActivity = async ({
   certificate,
   eventType,
   summary,
   changes,
   metadata,
   actor,
   source,
}) => {
   const actorContext = buildActorContext(actor, source || CERTIFICATE_ACTIVITY_SOURCE.API);

   await CertificateActivity.create({
      certificateId: certificate._id,
      hotelId: certificate.hotelId,
      eventType,
      summary,
      changes,
      metadata,
      actorType: actorContext.actorType,
      actorId: actorContext.actorId,
      source: actorContext.source,
      eventTime: new Date(),
   });
};

// --- Helper: Check and mark expiry ---
const checkAndMarkExpiry = async (certificate, actor = null) => {
   if (
      certificate.status === CERTIFICATE_STATUS.ACTIVE &&
      new Date() > certificate.expiryDate
   ) {
      const previousStatus = certificate.status;
      certificate.status = CERTIFICATE_STATUS.EXPIRED;
      await certificate.save();

      await recordCertificateActivity({
         certificate,
         eventType: CERTIFICATE_ACTIVITY_EVENT.CERTIFICATE_EXPIRED,
         summary: "Certificate status changed to EXPIRED",
         changes: {
            status: {
               before: previousStatus,
               after: certificate.status,
            },
         },
         metadata: {
            expiredAt: new Date().toISOString(),
         },
         actor,
         source: CERTIFICATE_ACTIVITY_SOURCE.SYSTEM,
      });

      // Notify hotel about expiry
      const hotel = await Hotel.findById(certificate.hotelId);
      if (hotel) await sendCertificateExpiredEmail(hotel, certificate);
   }
   return certificate;
};

/**
 * Issue a new certificate for a hotel.
 *
 * @param {string} hotelId - The hotel's ObjectId.
 * @param {number} validityPeriodInMonths - How many months the certificate is valid.
 * @returns {Promise<Object>} The created certificate document.
 */
export const issueCertificate = async (hotelId, validityPeriodInMonths, actor = null) => {
   // Validate hotelId format
   if (!mongoose.Types.ObjectId.isValid(hotelId)) {
      const error = new Error("Invalid hotel ID format");
      error.statusCode = 400;
      throw error;
   }

   // Check hotel exists
   const hotel = await Hotel.findById(hotelId);
   if (!hotel) {
      const error = new Error("Hotel not found");
      error.statusCode = 404;
      throw error;
   }

   // Check for existing ACTIVE certificate for this hotel
   const existing = await Certificate.findOne({
      hotelId,
      status: CERTIFICATE_STATUS.ACTIVE,
   });
   if (existing) {
      const error = new Error(
         "An active certificate already exists for this hotel",
      );
      error.statusCode = 400;
      throw error;
   }

   // Check hotel eligibility — both hotelScore and auditScore must be 'passed'
   const hotelRequest = await HotelRequest.findOne({ hotelId });
   if (!hotelRequest) {
      const error = new Error(
         "No hotel request found for this hotel. The hotel must complete the evaluation process before a certificate can be issued.",
      );
      error.statusCode = 400;
      throw error;
   }

   if (
      hotelRequest.hotelScore?.status !== "passed" ||
      hotelRequest.auditScore?.status !== "passed"
   ) {
      const failedScores = [];
      if (hotelRequest.hotelScore?.status !== "passed")
         failedScores.push("Hotel Score");
      if (hotelRequest.auditScore?.status !== "passed")
         failedScores.push("Audit Score");

      const error = new Error(
         `Hotel is not eligible for certification. The following scores have not passed: ${failedScores.join(", ")}.`,
      );
      error.statusCode = 400;
      throw error;
   }

   const issuedDate = new Date();
   const expiryDate = new Date(issuedDate);
   expiryDate.setMonth(expiryDate.getMonth() + validityPeriodInMonths);

   const trustScore = TRUST_SCORE.DEFAULT;
   const level = calculateLevel(trustScore);

   const certificate = await Certificate.create({
      certificateNumber: generateCertificateNumber(),
      hotelId,
      issuedDate,
      expiryDate,
      status: CERTIFICATE_STATUS.ACTIVE,
      trustScore,
      level,
   });

    await recordCertificateActivity({
      certificate,
      eventType: CERTIFICATE_ACTIVITY_EVENT.CERTIFICATE_ISSUED,
      summary: "Certificate issued",
      changes: {
         status: {
            before: null,
            after: certificate.status,
         },
         trustScore: {
            before: null,
            after: certificate.trustScore,
         },
         level: {
            before: null,
            after: certificate.level,
         },
      },
      metadata: {
         certificateNumber: certificate.certificateNumber,
         issuedDate: certificate.issuedDate,
         expiryDate: certificate.expiryDate,
      },
      actor,
      source: CERTIFICATE_ACTIVITY_SOURCE.API,
   });

   // Notify hotel about new certificate
   await sendCertificateIssuedEmail(hotel, certificate);

   return certificate;
};

/**
 * Get all hotels with their certificate details.
 * Supports optional filtering by certificate status.
 *
 * @param {string|null} status - Optional CERTIFICATE_STATUS filter.
 * @returns {Promise<Array>} Array of certificate documents with populated hotel data.
 */
export const getAllHotelsWithCertificates = async (status = null) => {
   const filter = {};
   if (status) {
      const validStatuses = Object.values(CERTIFICATE_STATUS);
      if (!validStatuses.includes(status.toUpperCase())) {
         const error = new Error(
            `Invalid status. Must be one of: ${validStatuses.join(", ")}`,
         );
         error.statusCode = 400;
         throw error;
      }
      filter.status = status.toUpperCase();
   }

   const certificates = await Certificate.find(filter)
      .populate(
         "hotelId",
         "businessInfo.name businessInfo.contact.address businessInfo.contact.email businessInfo.contact.phone businessInfo.businessType businessInfo.contact.website",
      )
      .sort({ createdAt: -1 });

   return certificates;
};

/**
 * Get a certificate by its certificate number (public).
 * Auto-marks as EXPIRED if the expiry date has passed.
 *
 * @param {string} certificateNumber - The unique certificate number.
 * @returns {Promise<Object>} The certificate document.
 */
export const getCertificateByNumber = async (certificateNumber) => {
   const certificate = await Certificate.findOne({
      certificateNumber,
   }).populate(
      "hotelId",
      [
         "businessInfo.name",
         "businessInfo.businessType",
         "businessInfo.yearEstablished",
         "businessInfo.contact.ownerName",
         "businessInfo.contact.email",
         "businessInfo.contact.phone",
         "businessInfo.contact.website",
         "businessInfo.contact.address",
         "businessInfo.contact.gps.latitude",
         "businessInfo.contact.gps.longitude",
      ].join(" "),
   );

   if (!certificate) {
      const error = new Error("Certificate not found");
      error.statusCode = 404;
      throw error;
   }

   // Auto-mark expired
   await checkAndMarkExpiry(certificate);

   return certificate;
};

/**
 * Update the trust score of a certificate.
 *
 * @param {string} certificateId - The certificate's ObjectId.
 * @param {number} scoreChange - Positive or negative score adjustment.
 * @param {string} reason - Reason for the change.
 * @returns {Promise<Object>} The updated certificate document.
 */
export const updateTrustScore = async (certificateId, scoreChange, reason, actor = null) => {
   if (!mongoose.Types.ObjectId.isValid(certificateId)) {
      const error = new Error("Invalid certificate ID format");
      error.statusCode = 400;
      throw error;
   }

   const certificate = await Certificate.findById(certificateId);
   if (!certificate) {
      const error = new Error("Certificate not found");
      error.statusCode = 404;
      throw error;
   }

   if (certificate.status === CERTIFICATE_STATUS.REVOKED) {
      const error = new Error(
         "Cannot update trust score of a revoked certificate",
      );
      error.statusCode = 400;
      throw error;
   }

   // Auto-check expiry first
   await checkAndMarkExpiry(certificate, actor);

   const previousTrustScore = certificate.trustScore;
   const previousStatus = certificate.status;
   const previousLevel = certificate.level;
   const newScore = clampScore(certificate.trustScore + scoreChange);
   certificate.trustScore = newScore;

   // Auto-revoke if below threshold
   const wasAutoRevoked = newScore < TRUST_SCORE.REVOKE_THRESHOLD;
   if (wasAutoRevoked) {
      certificate.status = CERTIFICATE_STATUS.REVOKED;
      certificate.trustScore = TRUST_SCORE.MIN;
      certificate.revokedReason =
         reason || "Trust score dropped below minimum threshold";
   } else {
      certificate.level = calculateLevel(newScore);
   }

   await certificate.save();

   await recordCertificateActivity({
      certificate,
      eventType: CERTIFICATE_ACTIVITY_EVENT.TRUST_SCORE_UPDATED,
      summary: "Trust score updated manually",
      changes: {
         trustScore: {
            before: previousTrustScore,
            after: certificate.trustScore,
         },
      },
      metadata: {
         scoreChange,
         reason,
      },
      actor,
      source: CERTIFICATE_ACTIVITY_SOURCE.API,
   });

   if (previousLevel !== certificate.level) {
      await recordCertificateActivity({
         certificate,
         eventType: CERTIFICATE_ACTIVITY_EVENT.LEVEL_CHANGED,
         summary: "Certificate level updated after trust score change",
         changes: {
            level: {
               before: previousLevel,
               after: certificate.level,
            },
         },
         metadata: {
            reason: reason || "Manual trust score update",
         },
         actor,
         source: CERTIFICATE_ACTIVITY_SOURCE.API,
      });
   }

   if (previousStatus !== certificate.status) {
      await recordCertificateActivity({
         certificate,
         eventType: CERTIFICATE_ACTIVITY_EVENT.STATUS_CHANGED,
         summary: `Certificate status changed to ${certificate.status}`,
         changes: {
            status: {
               before: previousStatus,
               after: certificate.status,
            },
         },
         metadata: {
            reason: certificate.revokedReason || reason,
         },
         actor,
         source: CERTIFICATE_ACTIVITY_SOURCE.API,
      });
   }

   if (wasAutoRevoked) {
      await recordCertificateActivity({
         certificate,
         eventType: CERTIFICATE_ACTIVITY_EVENT.AUTO_REVOCATION_TRIGGERED,
         summary: "Certificate auto-revoked due to low trust score",
         changes: {
            trustScore: {
               before: newScore,
               after: certificate.trustScore,
            },
         },
         metadata: {
            threshold: TRUST_SCORE.REVOKE_THRESHOLD,
            reason: certificate.revokedReason,
         },
         actor,
         source: CERTIFICATE_ACTIVITY_SOURCE.API,
      });
   }

   // Notify hotel if auto-revoked due to low trust score
   if (wasAutoRevoked) {
      const hotel = await Hotel.findById(certificate.hotelId);
      if (hotel) await sendCertificateRevokedEmail(hotel, certificate);
   }

   return certificate;
};

/**
 * Renew a certificate.
 *
 * @param {string} certificateId - The certificate's ObjectId.
 * @param {number} validityPeriodInMonths - Extension period in months.
 * @returns {Promise<Object>} The renewed certificate document.
 */
export const renewCertificate = async (
   certificateId,
   validityPeriodInMonths,
   actor = null,
) => {
   if (!mongoose.Types.ObjectId.isValid(certificateId)) {
      const error = new Error("Invalid certificate ID format");
      error.statusCode = 400;
      throw error;
   }

   const certificate = await Certificate.findById(certificateId);
   if (!certificate) {
      const error = new Error("Certificate not found");
      error.statusCode = 404;
      throw error;
   }

   if (certificate.status === CERTIFICATE_STATUS.REVOKED) {
      const error = new Error("Revoked certificates cannot be renewed");
      error.statusCode = 400;
      throw error;
   }

   const previousExpiryDate = certificate.expiryDate;
   const previousTrustScore = certificate.trustScore;
   const previousLevel = certificate.level;
   const previousRenewalCount = certificate.renewalCount;
   const previousStatus = certificate.status;

   // Extend expiry from now (or from current expiry if still in the future)
   const baseDate =
      certificate.expiryDate > new Date() ? certificate.expiryDate : new Date();
   const newExpiry = new Date(baseDate);
   newExpiry.setMonth(newExpiry.getMonth() + validityPeriodInMonths);

   certificate.expiryDate = newExpiry;
   certificate.status = CERTIFICATE_STATUS.ACTIVE;
   certificate.renewalCount += 1;

   // Renewal bonus (+5, capped at 100)
   certificate.trustScore = clampScore(
      certificate.trustScore + TRUST_SCORE.RENEWAL_BONUS,
   );
   certificate.level = calculateLevel(certificate.trustScore);

   await certificate.save();

   await recordCertificateActivity({
      certificate,
      eventType: CERTIFICATE_ACTIVITY_EVENT.CERTIFICATE_RENEWED,
      summary: "Certificate renewed",
      changes: {
         expiryDate: {
            before: previousExpiryDate,
            after: certificate.expiryDate,
         },
         renewalCount: {
            before: previousRenewalCount,
            after: certificate.renewalCount,
         },
         status: {
            before: previousStatus,
            after: certificate.status,
         },
      },
      metadata: {
         validityPeriodInMonths,
      },
      actor,
      source: CERTIFICATE_ACTIVITY_SOURCE.API,
   });

   await recordCertificateActivity({
      certificate,
      eventType: CERTIFICATE_ACTIVITY_EVENT.TRUST_SCORE_UPDATED,
      summary: "Trust score updated due to certificate renewal",
      changes: {
         trustScore: {
            before: previousTrustScore,
            after: certificate.trustScore,
         },
      },
      metadata: {
         scoreChange: certificate.trustScore - previousTrustScore,
         reason: "Renewal bonus applied",
      },
      actor,
      source: CERTIFICATE_ACTIVITY_SOURCE.API,
   });

   if (previousLevel !== certificate.level) {
      await recordCertificateActivity({
         certificate,
         eventType: CERTIFICATE_ACTIVITY_EVENT.LEVEL_CHANGED,
         summary: "Certificate level updated after renewal",
         changes: {
            level: {
               before: previousLevel,
               after: certificate.level,
            },
         },
         metadata: {
            reason: "Renewal trust score bonus",
         },
         actor,
         source: CERTIFICATE_ACTIVITY_SOURCE.API,
      });
   }

   // Notify hotel about renewal
   const hotelForRenewal = await Hotel.findById(certificate.hotelId);
   if (hotelForRenewal)
      await sendCertificateRenewedEmail(hotelForRenewal, certificate);

   return certificate;
};

/**
 * Inactivate (soft-delete) a certificate.
 *
 * @param {string} certificateId - The certificate's ObjectId.
 * @param {string} reason - Reason for inactivation.
 * @returns {Promise<Object>} The inactivated certificate document.
 */
export const inactivateCertificate = async (certificateId, reason, actor = null) => {
   if (!mongoose.Types.ObjectId.isValid(certificateId)) {
      const error = new Error("Invalid certificate ID format");
      error.statusCode = 400;
      throw error;
   }

   const certificate = await Certificate.findById(certificateId);
   if (!certificate) {
      const error = new Error("Certificate not found");
      error.statusCode = 404;
      throw error;
   }

   if (certificate.status === CERTIFICATE_STATUS.INACTIVE) {
      const error = new Error("Certificate is already inactive");
      error.statusCode = 400;
      throw error;
   }

   const previousStatus = certificate.status;
   certificate.status = CERTIFICATE_STATUS.INACTIVE;
   certificate.revokedReason = reason;

   await certificate.save();

   await recordCertificateActivity({
      certificate,
      eventType: CERTIFICATE_ACTIVITY_EVENT.CERTIFICATE_INACTIVATED,
      summary: "Certificate inactivated",
      changes: {
         status: {
            before: previousStatus,
            after: certificate.status,
         },
      },
      metadata: {
         reason,
      },
      actor,
      source: CERTIFICATE_ACTIVITY_SOURCE.API,
   });

   await recordCertificateActivity({
      certificate,
      eventType: CERTIFICATE_ACTIVITY_EVENT.STATUS_CHANGED,
      summary: `Certificate status changed to ${certificate.status}`,
      changes: {
         status: {
            before: previousStatus,
            after: certificate.status,
         },
      },
      metadata: {
         reason,
      },
      actor,
      source: CERTIFICATE_ACTIVITY_SOURCE.API,
   });

   return certificate;
};

/**
 * Revoke a certificate.
 *
 * @param {string} certificateId - The certificate's ObjectId.
 * @param {string} reason - Reason for revocation.
 * @returns {Promise<Object>} The revoked certificate document.
 */
export const revokeCertificate = async (certificateId, reason, actor = null) => {
   if (!mongoose.Types.ObjectId.isValid(certificateId)) {
      const error = new Error("Invalid certificate ID format");
      error.statusCode = 400;
      throw error;
   }

   const certificate = await Certificate.findById(certificateId);
   if (!certificate) {
      const error = new Error("Certificate not found");
      error.statusCode = 404;
      throw error;
   }

   if (certificate.status === CERTIFICATE_STATUS.REVOKED) {
      const error = new Error("Certificate is already revoked");
      error.statusCode = 400;
      throw error;
   }

   const previousStatus = certificate.status;
   const previousTrustScore = certificate.trustScore;
   certificate.status = CERTIFICATE_STATUS.REVOKED;
   certificate.trustScore = TRUST_SCORE.MIN;
   certificate.revokedReason = reason;

   await certificate.save();

   await recordCertificateActivity({
      certificate,
      eventType: CERTIFICATE_ACTIVITY_EVENT.CERTIFICATE_REVOKED,
      summary: "Certificate revoked",
      changes: {
         status: {
            before: previousStatus,
            after: certificate.status,
         },
         trustScore: {
            before: previousTrustScore,
            after: certificate.trustScore,
         },
      },
      metadata: {
         reason,
      },
      actor,
      source: CERTIFICATE_ACTIVITY_SOURCE.API,
   });

   await recordCertificateActivity({
      certificate,
      eventType: CERTIFICATE_ACTIVITY_EVENT.STATUS_CHANGED,
      summary: `Certificate status changed to ${certificate.status}`,
      changes: {
         status: {
            before: previousStatus,
            after: certificate.status,
         },
      },
      metadata: {
         reason,
      },
      actor,
      source: CERTIFICATE_ACTIVITY_SOURCE.API,
   });

   // Notify hotel about revocation
   const hotelForRevoke = await Hotel.findById(certificate.hotelId);
   if (hotelForRevoke)
      await sendCertificateRevokedEmail(hotelForRevoke, certificate);

   return certificate;
};

/**
 * Update the trust score of a hotel's active certificate using weighted feedback factors.
 *
 * Factors and weights:
 *   - Average Rating  60% (0–5 scale normalized to 0–100)
 *   - Review Count    20% (capped at 50 reviews)
 *   - Renewal Count   10% (capped at 5 renewals, sourced from certificate)
 *   - Certificate Age 10% (capped at 24 months, sourced from certificate)
 *
 * If the resulting score falls below REVOKE_THRESHOLD (50), the certificate is
 * automatically revoked and the hotel is notified by email.
 *
 * @param {string} hotelId - The hotel's ObjectId.
 * @param {number} averageRating - The hotel's current average guest rating (0–5 scale).
 * @param {number} reviewCount - Total number of guest reviews.
 * @returns {Promise<Object>} The updated certificate document.
 */
export const updateCertificateTrustScore = async (
   hotelId,
   averageRating,
   reviewCount,
   actor = null,
) => {
   if (!mongoose.Types.ObjectId.isValid(hotelId)) {
      const error = new Error("Invalid hotel ID format");
      error.statusCode = 400;
      throw error;
   }

   const certificate = await Certificate.findOne({
      hotelId,
      status: CERTIFICATE_STATUS.ACTIVE,
   });

   if (!certificate) {
      const error = new Error("No active certificate found for this hotel");
      error.statusCode = 404;
      throw error;
   }

   const previousTrustScore = certificate.trustScore;
   const previousLevel = certificate.level;
   const previousStatus = certificate.status;

   const newScore = calculateTrustScore({
      averageRating,
      reviewCount,
      renewalCount: certificate.renewalCount,
      issuedDate: certificate.issuedDate,
      baselineScore: certificate.trustScore,
   });

   certificate.trustScore = newScore;

   const canAutoRevoke =
      reviewCount >= TRUST_SCORE.MIN_REVIEWS_FOR_REVOCATION;
   const wasAutoRevoked =
      canAutoRevoke && newScore < TRUST_SCORE.REVOKE_THRESHOLD;
   if (wasAutoRevoked) {
      certificate.status = CERTIFICATE_STATUS.REVOKED;
      certificate.trustScore = TRUST_SCORE.MIN;
      certificate.revokedReason =
         "Trust score dropped below minimum threshold based on feedback analysis";
   } else {
      certificate.level = calculateLevel(newScore);
   }

   await certificate.save();

   await recordCertificateActivity({
      certificate,
      eventType: CERTIFICATE_ACTIVITY_EVENT.FEEDBACK_SYNC_APPLIED,
      summary: "Feedback sync applied to certificate trust metrics",
      changes: {
         trustScore: {
            before: previousTrustScore,
            after: certificate.trustScore,
         },
      },
      metadata: {
         averageRating,
         reviewCount,
      },
      actor,
      source: CERTIFICATE_ACTIVITY_SOURCE.FEEDBACK_SYNC,
   });

   await recordCertificateActivity({
      certificate,
      eventType: CERTIFICATE_ACTIVITY_EVENT.TRUST_SCORE_UPDATED,
      summary: "Trust score recalculated from feedback",
      changes: {
         trustScore: {
            before: previousTrustScore,
            after: certificate.trustScore,
         },
      },
      metadata: {
         averageRating,
         reviewCount,
      },
      actor,
      source: CERTIFICATE_ACTIVITY_SOURCE.FEEDBACK_SYNC,
   });

   if (previousLevel !== certificate.level) {
      await recordCertificateActivity({
         certificate,
         eventType: CERTIFICATE_ACTIVITY_EVENT.LEVEL_CHANGED,
         summary: "Certificate level updated after feedback sync",
         changes: {
            level: {
               before: previousLevel,
               after: certificate.level,
            },
         },
         metadata: {
            averageRating,
            reviewCount,
         },
         actor,
         source: CERTIFICATE_ACTIVITY_SOURCE.FEEDBACK_SYNC,
      });
   }

   if (previousStatus !== certificate.status) {
      await recordCertificateActivity({
         certificate,
         eventType: CERTIFICATE_ACTIVITY_EVENT.STATUS_CHANGED,
         summary: `Certificate status changed to ${certificate.status}`,
         changes: {
            status: {
               before: previousStatus,
               after: certificate.status,
            },
         },
         metadata: {
            reason: certificate.revokedReason,
            averageRating,
            reviewCount,
         },
         actor,
         source: CERTIFICATE_ACTIVITY_SOURCE.FEEDBACK_SYNC,
      });
   }

   if (wasAutoRevoked) {
      await recordCertificateActivity({
         certificate,
         eventType: CERTIFICATE_ACTIVITY_EVENT.AUTO_REVOCATION_TRIGGERED,
         summary: "Certificate auto-revoked from feedback trust score",
         changes: {
            trustScore: {
               before: newScore,
               after: certificate.trustScore,
            },
         },
         metadata: {
            threshold: TRUST_SCORE.REVOKE_THRESHOLD,
            reviewCount,
            minReviewsForRevocation: TRUST_SCORE.MIN_REVIEWS_FOR_REVOCATION,
         },
         actor,
         source: CERTIFICATE_ACTIVITY_SOURCE.FEEDBACK_SYNC,
      });
   }

   if (wasAutoRevoked) {
      const hotel = await Hotel.findById(certificate.hotelId);
      if (hotel) await sendCertificateRevokedEmail(hotel, certificate);
   }

   return certificate;
};

/**
 * Get all hotels eligible for certification.
 * Eligible = HotelRequest records where both hotelScore and auditScore are 'passed'.
 * Excludes hotels that already hold an ACTIVE certificate.
 *
 * @returns {Promise<Array>} Array of { hotelRequest, hotel, alreadyCertified } objects.
 */
export const getEligibleHotelsForCertification = async () => {
   // Find all hotel requests where both scores are passed
   const eligibleRequests = await HotelRequest.find({
      hotelScore: {status : "passed"},
      auditScore: {status : "passed"},
   }).populate("hotelId");

   if (!eligibleRequests.length) return [];

   // Check which hotels already have an active certificate
   const hotelIds = eligibleRequests.map((r) => r.hotelId?._id).filter(Boolean);
   const activeCerts = await Certificate.find({
      hotelId: { $in: hotelIds },
      status: CERTIFICATE_STATUS.ACTIVE,
   }).select("hotelId");

   const certifiedHotelIds = new Set(
      activeCerts.map((c) => c.hotelId.toString()),
   );

   return eligibleRequests.map((request) => ({
      hotelRequestId: request._id,
      hotelId: request.hotelId?._id,
      hotel: request.hotelId,
      hotelScore: request.hotelScore,
      auditScore: request.auditScore,
      alreadyCertified: certifiedHotelIds.has(request.hotelId?._id?.toString()),
      createdAt: request.createdAt,
      updatedAt: request.updatedAt,
   }));
};

export const getCertificateTimeline = async (certificateId, options = {}) => {
   if (!mongoose.Types.ObjectId.isValid(certificateId)) {
      const error = new Error("Invalid certificate ID format");
      error.statusCode = 400;
      throw error;
   }

   const certificate = await Certificate.findById(certificateId).select("_id");
   if (!certificate) {
      const error = new Error("Certificate not found");
      error.statusCode = 404;
      throw error;
   }

   const page = Math.max(1, Number(options.page) || 1);
   const limit = Math.min(100, Math.max(1, Number(options.limit) || 20));
   const normalizedOrder = String(options.order || "desc").toLowerCase();
   if (!["asc", "desc"].includes(normalizedOrder)) {
      const error = new Error("Invalid order value. Use 'asc' or 'desc'");
      error.statusCode = 400;
      throw error;
   }
   const order = normalizedOrder;

   const query = {
      certificateId,
   };

   if (options.eventType && options.eventType.length) {
      const invalidEventType = options.eventType.find(
         (item) => !Object.values(CERTIFICATE_ACTIVITY_EVENT).includes(item),
      );
      if (invalidEventType) {
         const error = new Error(`Invalid eventType: ${invalidEventType}`);
         error.statusCode = 400;
         throw error;
      }
      query.eventType = { $in: options.eventType };
   }

   if (options.from || options.to) {
      query.eventTime = {};
      if (options.from) {
         const fromDate = new Date(options.from);
         if (Number.isNaN(fromDate.getTime())) {
            const error = new Error("Invalid from date");
            error.statusCode = 400;
            throw error;
         }
         query.eventTime.$gte = fromDate;
      }
      if (options.to) {
         const toDate = new Date(options.to);
         if (Number.isNaN(toDate.getTime())) {
            const error = new Error("Invalid to date");
            error.statusCode = 400;
            throw error;
         }
         query.eventTime.$lte = toDate;
      }
   }

   const total = await CertificateActivity.countDocuments(query);
   const items = await CertificateActivity.find(query)
      .sort({ eventTime: order === "asc" ? 1 : -1 })
      .skip((page - 1) * limit)
      .limit(limit)
      .lean();

   return {
      certificateId,
      pagination: {
         page,
         limit,
         total,
         hasNext: page * limit < total,
      },
      items,
   };
};
