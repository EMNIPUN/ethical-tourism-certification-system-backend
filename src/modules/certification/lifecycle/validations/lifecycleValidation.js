import Joi from "joi";
import {
   CERTIFICATE_LEVEL,
   CERTIFICATE_STATUS,
   TRUST_SCORE,
} from "../../../../common/models/certificate.model.js";

/**
 * validations/lifecycleValidation.js
 *
 * Joi schemas for validating certificate lifecycle requests.
 */

export const issueCertificateSchema = Joi.object({
   hotelId: Joi.string().required().messages({
      "string.empty": "hotelId is required",
      "any.required": "hotelId is required",
   }),
   validityPeriodInMonths: Joi.number()
      .integer()
      .min(1)
      .max(120)
      .required()
      .messages({
         "number.base": "validityPeriodInMonths must be a number",
         "number.min": "validityPeriodInMonths must be between 1 and 120",
         "number.max": "validityPeriodInMonths must be between 1 and 120",
         "any.required": "validityPeriodInMonths is required",
      }),
});

export const updateTrustScoreSchema = Joi.object({
   scoreChange: Joi.number().required().messages({
      "number.base": "scoreChange must be a number",
      "any.required": "scoreChange is required",
   }),
   reason: Joi.string().required().min(1).max(1000).messages({
      "string.empty": "reason is required",
      "string.min": "reason is required",
      "any.required": "reason is required and must be a string",
   }),
});

export const renewCertificateSchema = Joi.object({
   validityPeriodInMonths: Joi.number()
      .integer()
      .min(1)
      .max(120)
      .default(12)
      .messages({
         "number.base": "validityPeriodInMonths must be a number",
         "number.min": "validityPeriodInMonths must be between 1 and 120",
         "number.max": "validityPeriodInMonths must be between 1 and 120",
      }),
});

export const revokeCertificateSchema = Joi.object({
   reason: Joi.string().required().min(1).max(1000).messages({
      "string.empty": "reason is required",
      "string.min": "reason is required",
      "any.required": "reason is required and must be a string",
   }),
});

export const inactivateCertificateSchema = Joi.object({
   reason: Joi.string().required().min(1).max(1000).messages({
      "string.empty": "reason is required",
      "string.min": "reason is required",
      "any.required": "reason is required and must be a string",
   }),
});

export const updateCertificateTrustScoreSchema = Joi.object({
   averageRating: Joi.number().min(0).max(5).required().messages({
      "number.base": "averageRating must be a number",
      "number.min": "averageRating must be between 0 and 5",
      "number.max": "averageRating must be between 0 and 5",
      "any.required": "averageRating is required",
   }),
   reviewCount: Joi.number().integer().min(0).required().messages({
      "number.base": "reviewCount must be a number",
      "number.integer": "reviewCount must be an integer",
      "number.min": "reviewCount must be 0 or greater",
      "any.required": "reviewCount is required",
   }),
});

export const updateCertificateDetailsSchema = Joi.object({
   hotelId: Joi.string().optional().messages({
      "string.base": "hotelId must be a string",
   }),
   issuedDate: Joi.date().iso().optional().messages({
      "date.base": "issuedDate must be a valid ISO date",
      "date.format": "issuedDate must be a valid ISO date",
   }),
   expiryDate: Joi.date().iso().optional().messages({
      "date.base": "expiryDate must be a valid ISO date",
      "date.format": "expiryDate must be a valid ISO date",
   }),
   status: Joi.string()
      .valid(...Object.values(CERTIFICATE_STATUS))
      .optional()
      .messages({
         "any.only": `status must be one of: ${Object.values(CERTIFICATE_STATUS).join(", ")}`,
      }),
   trustScore: Joi.number().min(TRUST_SCORE.MIN).max(TRUST_SCORE.MAX).optional().messages({
      "number.base": "trustScore must be a number",
      "number.min": `trustScore must be between ${TRUST_SCORE.MIN} and ${TRUST_SCORE.MAX}`,
      "number.max": `trustScore must be between ${TRUST_SCORE.MIN} and ${TRUST_SCORE.MAX}`,
   }),
   level: Joi.string()
      .valid(...Object.values(CERTIFICATE_LEVEL))
      .optional()
      .allow(null)
      .messages({
         "any.only": `level must be one of: ${Object.values(CERTIFICATE_LEVEL).join(", ")}`,
      }),
   renewalCount: Joi.number().integer().min(0).optional().messages({
      "number.base": "renewalCount must be a number",
      "number.integer": "renewalCount must be an integer",
      "number.min": "renewalCount must be 0 or greater",
   }),
   revokedReason: Joi.string().allow("", null).max(1000).optional().messages({
      "string.base": "revokedReason must be a string",
      "string.max": "revokedReason must be 1000 characters or less",
   }),
})
   .min(1)
   .messages({
      "object.min": "At least one field is required for update",
   });
