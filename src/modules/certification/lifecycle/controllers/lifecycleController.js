import * as lifecycleService from "../services/lifecycleService.js";
import asyncHandler from "../../../../common/utils/asyncHandler.js";

// Get all hotels eligible for certification
export const getEligibleHotels = asyncHandler(async (req, res) => {
   const hotels = await lifecycleService.getEligibleHotelsForCertification();

   res.status(200).json({
      success: true,
      count: hotels.length,
      data: hotels,
   });
});


// Issue a new certificate.
export const issueCertificate = asyncHandler(async (req, res) => {
   const { hotelId, validityPeriodInMonths } = req.body;

   const certificate = await lifecycleService.issueCertificate(
      hotelId,
      validityPeriodInMonths,
   );

   res.status(201).json({ success: true, data: certificate });
});

// Get all hotels with their certificate details
export const getHotelsWithCertificates = asyncHandler(async (req, res) => {
   const { status } = req.query;

   const certificates = await lifecycleService.getAllHotelsWithCertificates(
      status || null,
   );

   res.status(200).json({
      success: true,
      count: certificates.length,
      data: certificates,
   });
});

// Get a certificate by certificate number
export const getCertificate = asyncHandler(async (req, res) => {
   const certificate = await lifecycleService.getCertificateByNumber(
      req.params.certificateNumber,
   );

   res.status(200).json({ success: true, data: certificate });
});

// Update trust score
export const updateTrustScore = asyncHandler(async (req, res) => {
   const { scoreChange, reason } = req.body;

   const certificate = await lifecycleService.updateTrustScore(
      req.params.id,
      scoreChange,
      reason,
   );

   res.status(200).json({ success: true, data: certificate });
});

// Renew a certificate
export const renewCertificate = asyncHandler(async (req, res) => {
   const { validityPeriodInMonths } = req.body;

   const period = validityPeriodInMonths || 12; // default 12 months

   const certificate = await lifecycleService.renewCertificate(
      req.params.id,
      period,
   );

   res.status(200).json({ success: true, data: certificate });
});

// Inactivate (soft-delete) a certificate
export const inactivateCertificate = asyncHandler(async (req, res) => {
   const { reason } = req.body;

   const certificate = await lifecycleService.inactivateCertificate(
      req.params.id,
      reason,
   );

   res.status(200).json({ success: true, data: certificate });
});

// Revoke a certificate
export const revokeCertificate = asyncHandler(async (req, res) => {
   const { reason } = req.body;

   const certificate = await lifecycleService.revokeCertificate(
      req.params.id,
      reason,
   );

   res.status(200).json({ success: true, data: certificate });
});

// Update certificate trust score based on feedback factors
export const updateCertificateTrustScoreByHotel = asyncHandler(
   async (req, res) => {
      const { averageRating, reviewCount } = req.body;

      const certificate = await lifecycleService.updateCertificateTrustScore(
         req.params.hotelId,
         averageRating,
         reviewCount,
      );

      res.status(200).json({ success: true, data: certificate });
   },
);
