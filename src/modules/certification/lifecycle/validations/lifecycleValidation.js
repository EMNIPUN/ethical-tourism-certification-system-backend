import Joi from "joi";

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
