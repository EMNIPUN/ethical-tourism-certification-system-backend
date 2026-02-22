import * as lifecycleService from "../services/lifecycleService.js";
import asyncHandler from "../../../../common/utils/asyncHandler.js";

/**
 * lifecycleController.js
 *
 * Thin controller layer — delegates all business logic to lifecycleService.js.
 */

/**
 * Issue a new certificate.
 * POST /certification/certificates
 */
export const issueCertificate = asyncHandler(async (req, res) => {
   const { hotelId, validityPeriodInMonths } = req.body;

   const certificate = await lifecycleService.issueCertificate(
      hotelId,
      validityPeriodInMonths,
   );

   res.status(201).json({ success: true, data: certificate });
});

/**
 * Get a certificate by certificate number (public).
 * GET /certification/certificates/:certificateNumber
 */
export const getCertificate = asyncHandler(async (req, res) => {
   const certificate = await lifecycleService.getCertificateByNumber(
      req.params.certificateNumber,
   );

   res.status(200).json({ success: true, data: certificate });
});

/**
 * Update trust score.
 * PUT /certification/certificates/:id/trustscore
 */
export const updateTrustScore = asyncHandler(async (req, res) => {
   const { scoreChange, reason } = req.body;

   const certificate = await lifecycleService.updateTrustScore(
      req.params.id,
      scoreChange,
      reason,
   );

   res.status(200).json({ success: true, data: certificate });
});

/**
 * Renew a certificate.
 * PUT /certification/certificates/:id/renew
 */
export const renewCertificate = asyncHandler(async (req, res) => {
   const { validityPeriodInMonths } = req.body;

   const period = validityPeriodInMonths || 12; // default 12 months

   const certificate = await lifecycleService.renewCertificate(
      req.params.id,
      period,
   );

   res.status(200).json({ success: true, data: certificate });
});

/**
 * Inactivate (soft-delete) a certificate.
 * DELETE /certification/certificates/:id
 */
export const inactivateCertificate = asyncHandler(async (req, res) => {
   const { reason } = req.body;

   const certificate = await lifecycleService.inactivateCertificate(
      req.params.id,
      reason,
   );

   res.status(200).json({ success: true, data: certificate });
});

/**
 * Revoke a certificate.
 * PUT /certification/certificates/:id/revoke
 */
export const revokeCertificate = asyncHandler(async (req, res) => {
   const { reason } = req.body;

   const certificate = await lifecycleService.revokeCertificate(
      req.params.id,
      reason,
   );

   res.status(200).json({ success: true, data: certificate });
});
