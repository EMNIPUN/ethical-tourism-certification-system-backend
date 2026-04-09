import * as lifecycleService from "../services/lifecycleService.js";
import asyncHandler from "../../../../common/utils/asyncHandler.js";

const getActor = (req, source = "API") => ({
   actorType: "USER",
   actorId: req.user?._id?.toString() || null,
   source,
});

// Get all hotels eligible for certification
export const getEligibleHotels = asyncHandler(async (req, res) => {
   const hotels = await lifecycleService.getEligibleHotelsForCertification();
   const summary = lifecycleService.buildEligibleHotelsSummary(hotels);

   res.status(200).json({
      success: true,
      count: hotels.length,
      summary,
      data: hotels,
   });
});


// Issue a new certificate.
export const issueCertificate = asyncHandler(async (req, res) => {
   const { hotelId, validityPeriodInMonths } = req.body;

   const certificate = await lifecycleService.issueCertificate(
      hotelId,
      validityPeriodInMonths,
      getActor(req),
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

export const getCertificateOverviewStats = asyncHandler(async (req, res) => {
   const stats = await lifecycleService.getCertificateOverviewStats();

   res.status(200).json({
      success: true,
      data: stats,
   });
});

export const getCertificateOverviewCharts = asyncHandler(async (req, res) => {
   const charts = await lifecycleService.getCertificateOverviewCharts();

   res.status(200).json({
      success: true,
      data: charts,
   });
});

// Get a certificate by certificate number
export const getCertificate = asyncHandler(async (req, res) => {
   const certificate = await lifecycleService.getCertificateByNumber(
      req.params.certificateNumber,
   );

   res.status(200).json({ success: true, data: certificate });
});

export const updateCertificateDetails = asyncHandler(async (req, res) => {
   const certificate = await lifecycleService.updateCertificateDetails(
      req.params.id,
      req.body,
      getActor(req),
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
      getActor(req),
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
      getActor(req),
   );

   res.status(200).json({ success: true, data: certificate });
});

// Inactivate (soft-delete) a certificate
export const inactivateCertificate = asyncHandler(async (req, res) => {
   const { reason } = req.body;

   const certificate = await lifecycleService.inactivateCertificate(
      req.params.id,
      reason,
      getActor(req),
   );

   res.status(200).json({ success: true, data: certificate });
});

// Permanently delete (hard-delete) a certificate
export const deleteCertificatePermanently = asyncHandler(async (req, res) => {
   const result = await lifecycleService.deleteCertificatePermanently(
      req.params.id,
      getActor(req),
   );

   res.status(200).json({ success: true, data: result });
});

// Revoke a certificate
export const revokeCertificate = asyncHandler(async (req, res) => {
   const { reason } = req.body;

   const certificate = await lifecycleService.revokeCertificate(
      req.params.id,
      reason,
      getActor(req),
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
         getActor(req),
      );

      res.status(200).json({ success: true, data: certificate });
   },
);

export const getCertificateTimeline = asyncHandler(async (req, res) => {
   const { page, limit, order, from, to, eventType } = req.query;

   const timeline = await lifecycleService.getCertificateTimeline(req.params.id, {
      page,
      limit,
      order,
      from,
      to,
      eventType:
         typeof eventType === "string" && eventType.trim()
            ? eventType
                 .split(",")
                 .map((item) => item.trim())
                 .filter(Boolean)
            : undefined,
   });

   res.status(200).json({ success: true, data: timeline });
});

export const downloadCertificateFromEmailLink = asyncHandler(async (req, res) => {
   const token = req.query?.token;
   if (!token || typeof token !== "string") {
      const error = new Error("Missing certificate download token");
      error.statusCode = 400;
      throw error;
   }

   const mode = String(req.query?.mode || "").toLowerCase();
   const resolvedAsset = lifecycleService.resolveCertificateDownloadAssetFromToken(token);

   if (mode !== "file") {
      const fileModeUrl = `${req.baseUrl}${req.path}?token=${encodeURIComponent(token)}&mode=file`;

      return res.status(200).type("html").send(`<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Preparing Certificate Download</title>
</head>
<body style="margin:0;padding:24px;font-family:'Segoe UI',Arial,sans-serif;background:#f8fafc;color:#0f172a;">
  <div style="max-width:560px;margin:0 auto;padding:20px 22px;border:1px solid #cbd5e1;border-radius:10px;background:#ffffff;">
    <p id="download-status" style="margin:0 0 10px;font-size:16px;font-weight:600;">Preparing your certificate download...</p>
    <p style="margin:0;font-size:14px;line-height:1.55;color:#475569;">
      The PDF should start downloading automatically. This tab will try to close itself.
    </p>
    <noscript>
      <p style="margin:14px 0 0;font-size:14px;">
        JavaScript is disabled. <a href="${fileModeUrl}">Click here to download your certificate</a>.
      </p>
    </noscript>
  </div>
  <script>
    (() => {
      const fileUrl = ${JSON.stringify(fileModeUrl)};
      const iframe = document.createElement("iframe");
      iframe.style.display = "none";
      iframe.src = fileUrl;
      document.body.appendChild(iframe);

      const statusEl = document.getElementById("download-status");
      setTimeout(() => {
        window.close();
      }, 1800);
      setTimeout(() => {
        if (statusEl) {
          statusEl.textContent = "Download started. You can close this tab if it remains open.";
        }
      }, 2300);
    })();
  </script>
</body>
</html>`);
   }

   const upstream = await fetch(resolvedAsset.downloadUrl);
   if (!upstream.ok) {
      if (
         resolvedAsset.fallbackUrl &&
         resolvedAsset.fallbackUrl !== resolvedAsset.downloadUrl
      ) {
         return res.redirect(resolvedAsset.fallbackUrl);
      }

      const error = new Error("Certificate file could not be downloaded");
      error.statusCode = 502;
      throw error;
   }

   const fileBuffer = Buffer.from(await upstream.arrayBuffer());
   const contentType =
      upstream.headers.get("content-type") || resolvedAsset.contentType || "application/pdf";

   res.setHeader("Content-Type", contentType);
   res.setHeader(
      "Content-Disposition",
      `attachment; filename="${resolvedAsset.fileName || "certificate.pdf"}"`,
   );
   res.setHeader("Cache-Control", "no-store, max-age=0");
   res.setHeader("Content-Length", String(fileBuffer.length));

   return res.status(200).send(fileBuffer);
});
