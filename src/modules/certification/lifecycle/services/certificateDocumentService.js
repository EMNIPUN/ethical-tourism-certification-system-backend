import crypto from "crypto";
import fs from "fs/promises";
import path from "path";
import { fileURLToPath } from "url";
import PDFDocument from "pdfkit";

const MODULE_DIR = path.dirname(fileURLToPath(import.meta.url));
const BACKEND_ROOT = path.resolve(MODULE_DIR, "../../../../..");

const CERTIFICATE_THEME = {
   ACTIVE: {
      accent: "#0f766e",
      ribbonStart: "#0f766e",
      ribbonEnd: "#1d4ed8",
      summary: "This certificate is currently valid and in good standing.",
      watermark: "#d1fae5",
   },
   EXPIRED: {
      accent: "#b45309",
      ribbonStart: "#b45309",
      ribbonEnd: "#b91c1c",
      summary: "This certificate has reached the end of its validity period.",
      watermark: "#fef3c7",
   },
   REVOKED: {
      accent: "#be123c",
      ribbonStart: "#9f1239",
      ribbonEnd: "#be123c",
      summary: "This certificate has been revoked and should not be treated as valid.",
      watermark: "#ffe4e6",
   },
   INACTIVE: {
      accent: "#475569",
      ribbonStart: "#475569",
      ribbonEnd: "#334155",
      summary: "This certificate is inactive and retained for compliance history.",
      watermark: "#e2e8f0",
   },
   DEFAULT: {
      accent: "#155e75",
      ribbonStart: "#155e75",
      ribbonEnd: "#0f172a",
      summary: "Certificate validity is currently under review.",
      watermark: "#e0f2fe",
   },
};

const LEVEL_BADGE_THEME = {
   GOLD: {
      ribbonTop: "#78350f",
      ribbonBottom: "#b45309",
      outerLight: "#fff4ca",
      outerMid: "#f5b336",
      outerDark: "#8b5e14",
      innerLight: "#fffbe6",
      innerMid: "#ffe18f",
      innerDark: "#d89e2c",
      labelColor: "#78350f",
      levelColor: "#422006",
      codeColor: "#7c2d12",
   },
   SILVER: {
      ribbonTop: "#334155",
      ribbonBottom: "#64748b",
      outerLight: "#f8fafc",
      outerMid: "#d1d5db",
      outerDark: "#6b7280",
      innerLight: "#ffffff",
      innerMid: "#e5e7eb",
      innerDark: "#9ca3af",
      labelColor: "#475569",
      levelColor: "#1f2937",
      codeColor: "#334155",
   },
   PLATINUM: {
      ribbonTop: "#2a1f3d",
      ribbonBottom: "#4c3b6e",
      outerLight: "#fbfaff",
      outerMid: "#e6e1f2",
      outerDark: "#a8a0c2",
      innerLight: "#ffffff",
      innerMid: "#f0ecf8",
      innerDark: "#c5bddb",
      labelColor: "#3b2f57",
      levelColor: "#1f1433",
      codeColor: "#4c3b6e",
   },
   DEFAULT: {
      ribbonTop: "#78350f",
      ribbonBottom: "#b45309",
      outerLight: "#fff4ca",
      outerMid: "#f5b336",
      outerDark: "#8b5e14",
      innerLight: "#fffbe6",
      innerMid: "#ffe18f",
      innerDark: "#d89e2c",
      labelColor: "#78350f",
      levelColor: "#422006",
      codeColor: "#7c2d12",
   },
};

const SIGNATURE_IMAGE_PATHS = [
   path.resolve(BACKEND_ROOT, "../frontend/src/assets/signature.png"),
   path.resolve(process.cwd(), "../frontend/src/assets/signature.png"),
   path.resolve(process.cwd(), "frontend/src/assets/signature.png"),
   path.resolve(process.cwd(), "src/assets/signature.png"),
];

const DISPLAY_DATE_FORMATTER = new Intl.DateTimeFormat("en-US", {
   year: "numeric",
   month: "long",
   day: "numeric",
});

const toDisplayDate = (value) => {
   if (!value) return "N/A";
   const date = value instanceof Date ? value : new Date(value);
   if (Number.isNaN(date.getTime())) return "N/A";
   return DISPLAY_DATE_FORMATTER.format(date);
};

const sanitizeSegment = (value, fallback = "certificate") => {
   const normalized = String(value || "")
      .toLowerCase()
      .replace(/[^a-z0-9_-]+/g, "-")
      .replace(/^-+|-+$/g, "");
   return normalized || fallback;
};

const resolveStatus = (status) => String(status || "").toUpperCase();
const resolveLevel = (level) => String(level || "").toUpperCase();

const getCertificateTheme = (status) =>
   CERTIFICATE_THEME[resolveStatus(status)] || CERTIFICATE_THEME.DEFAULT;

const getLevelBadgeTheme = (level) =>
   LEVEL_BADGE_THEME[resolveLevel(level)] || LEVEL_BADGE_THEME.DEFAULT;

const getValidityStatement = (certificate) => {
   const status = resolveStatus(certificate?.status);
   const expiryText = toDisplayDate(certificate?.expiryDate);

   if (status === "EXPIRED") {
      return `Validity ended on ${expiryText}.`;
   }

   if (status === "REVOKED" || status === "INACTIVE") {
      return `Current status: ${status}. Refer to timeline records for lifecycle details.`;
   }

   if (expiryText !== "N/A") {
      return `Valid through ${expiryText}, subject to compliance and trust-score review.`;
   }

   return "Validity period is unavailable.";
};

const resolveHotelName = (certificate, hotel) =>
   hotel?.businessInfo?.name ||
   certificate?.hotelId?.businessInfo?.name ||
   "Certified Hospitality Property";

const resolveHotelAddress = (certificate, hotel) =>
   hotel?.businessInfo?.contact?.address ||
   certificate?.hotelId?.businessInfo?.contact?.address ||
   "Address unavailable";

const resolveHotelRecordId = (certificate) => {
   const hotelId = certificate?.hotelId;
   if (!hotelId) return "N/A";
   if (typeof hotelId === "string") return hotelId;
   return hotelId?._id?.toString?.() || "N/A";
};

const resolveCertificateCode = (certificateNumber) =>
   String(certificateNumber || "").slice(-8).toUpperCase() || "NO-ID";

const readSignatureImage = async () => {
   for (const filePath of SIGNATURE_IMAGE_PATHS) {
      try {
         const image = await fs.readFile(filePath);
         if (image?.length) {
            return image;
         }
      } catch {
         // Continue checking fallback paths.
      }
   }
   return null;
};

const drawMetricCard = ({
   doc,
   x,
   y,
   width,
   height,
   label,
   value,
}) => {
   doc.save();
   doc
      .roundedRect(x, y, width, height, 9)
      .lineWidth(1)
      .strokeColor("#c7d2e5")
      .fillAndStroke("#f8fafc", "#c7d2e5");

   doc
      .font("Helvetica-Bold")
      .fontSize(7.4)
      .fillColor("#64748b")
      .text(String(label || "").toUpperCase(), x + 10, y + 8, {
         width: width - 20,
         align: "left",
      });

   doc
      .font("Helvetica-Bold")
      .fontSize(10.6)
      .fillColor("#0f172a")
      .text(String(value ?? "N/A"), x + 10, y + 22, {
         width: width - 20,
         align: "left",
      });
   doc.restore();
};

const fitFontSizeToWidth = ({
   doc,
   text,
   font,
   maxFontSize,
   minFontSize,
   maxWidth,
}) => {
   const safeText = String(text || "N/A");
   let fontSize = maxFontSize;

   while (fontSize > minFontSize) {
      doc.font(font).fontSize(fontSize);
      if (doc.widthOfString(safeText) <= maxWidth) {
         break;
      }
      fontSize -= 0.5;
   }

   return Math.max(minFontSize, Number(fontSize.toFixed(1)));
};

const fitFontSizeToBlock = ({
   doc,
   text,
   font,
   maxFontSize,
   minFontSize,
   width,
   maxHeight,
   align = "center",
   lineGap = 0,
}) => {
   const safeText = String(text || "N/A");
   let fontSize = maxFontSize;

   while (fontSize > minFontSize) {
      doc.font(font).fontSize(fontSize);
      const height = doc.heightOfString(safeText, {
         width,
         align,
         lineGap,
      });

      if (height <= maxHeight) {
         return {
            fontSize: Number(fontSize.toFixed(1)),
            height,
         };
      }
      fontSize -= 0.5;
   }

   doc.font(font).fontSize(minFontSize);
   return {
      fontSize: minFontSize,
      height: doc.heightOfString(safeText, {
         width,
         align,
         lineGap,
      }),
   };
};

const buildCertificateSnapshot = ({ certificate, hotel }) => {
   const theme = getCertificateTheme(certificate?.status);
   const status = resolveStatus(certificate?.status) || "UNKNOWN";
   const level = resolveLevel(certificate?.level) || "N/A";
   const trustScoreValue = certificate?.trustScore;

   return {
      certificateNumber: certificate?.certificateNumber || "N/A",
      issuedOn: toDisplayDate(certificate?.issuedDate),
      validUntil: toDisplayDate(certificate?.expiryDate),
      trustScore: trustScoreValue === null || trustScoreValue === undefined
         ? "N/A"
         : `${trustScoreValue} %`,
      renewalCount: certificate?.renewalCount ?? 0,
      hotelName: resolveHotelName(certificate, hotel),
      hotelAddress: resolveHotelAddress(certificate, hotel),
      hotelRecordId: resolveHotelRecordId(certificate),
      status,
      level,
      summary: theme.summary,
      validityStatement: getValidityStatement(certificate),
      revokedReason: certificate?.revokedReason || "",
   };
};

const drawCertificatePdf = async ({ certificate, hotel }) => {
   const signatureImage = await readSignatureImage();
   const snapshot = buildCertificateSnapshot({ certificate, hotel });
   const theme = getCertificateTheme(snapshot.status);
   const levelTheme = getLevelBadgeTheme(snapshot.level);

   const doc = new PDFDocument({
      size: "A4",
      layout: "landscape",
      margin: 0,
      info: {
         Title: `Certificate ${snapshot.certificateNumber}`,
         Author: "Ethical Tourism Certification Authority",
         Subject: "Ethical Tourism Assurance Certificate",
      },
   });

   const chunks = [];
   const bufferPromise = new Promise((resolve, reject) => {
      doc.on("data", (chunk) => chunks.push(chunk));
      doc.on("end", () => resolve(Buffer.concat(chunks)));
      doc.on("error", reject);
   });

   const pageWidth = doc.page.width;
   const pageHeight = doc.page.height;

   const stage = {
      x: 12,
      y: 12,
      width: pageWidth - 24,
      height: pageHeight - 24,
      radius: 17,
   };

   doc
      .roundedRect(stage.x, stage.y, stage.width, stage.height, stage.radius)
      .lineWidth(1)
      .strokeColor("#b8c3d8")
      .fillAndStroke("#f8fafc", "#b8c3d8");

   const ribbon = {
      x: stage.x + 1,
      y: stage.y + 1,
      width: stage.width - 2,
      height: 34,
      radius: 11,
   };
   const ribbonGradient = doc.linearGradient(
      ribbon.x,
      ribbon.y,
      ribbon.x + ribbon.width,
      ribbon.y + ribbon.height,
   );
   ribbonGradient.stop(0, theme.ribbonStart).stop(1, theme.ribbonEnd);
   doc
      .roundedRect(ribbon.x, ribbon.y, ribbon.width, ribbon.height, ribbon.radius)
      .fill(ribbonGradient);

   doc
      .font("Helvetica-Bold")
      .fontSize(7.8)
      .fillColor("#f8fafc")
      .text("ETHICAL TOURISM CERTIFICATION REGISTER", ribbon.x + 14, ribbon.y + 13, {
         width: ribbon.width / 2,
         align: "left",
      });

   doc
      .font("Helvetica-Bold")
      .fontSize(7.8)
      .fillColor("#f8fafc")
      .text(`RECORD: ${snapshot.certificateNumber}`, ribbon.x + ribbon.width / 2, ribbon.y + 13, {
         width: ribbon.width / 2 - 14,
         align: "right",
      });

   const sheet = {
      x: stage.x + 13,
      y: stage.y + 42,
      width: stage.width - 26,
      height: stage.height - 54,
      radius: 15,
   };
   doc
      .roundedRect(sheet.x, sheet.y, sheet.width, sheet.height, sheet.radius)
      .lineWidth(1.3)
      .strokeColor("#b79a5b")
      .fillAndStroke("#ffffff", "#b79a5b");

   doc
      .roundedRect(sheet.x + 9, sheet.y + 9, sheet.width - 18, sheet.height - 18, 10)
      .lineWidth(0.9)
      .strokeColor("#ccb37e")
      .stroke();

   doc.save();
   doc.fillOpacity(0.25);
   doc.rotate(-20, { origin: [sheet.x + sheet.width / 2, sheet.y + sheet.height / 2] });
   doc
      .font("Helvetica-Bold")
      .fontSize(94)
      .fillColor(theme.watermark)
      .text("CERTIFIED", sheet.x, sheet.y + sheet.height / 2 - 40, {
         width: sheet.width,
         align: "center",
      });
   doc.restore();

   const badge = {
      centerX: sheet.x + sheet.width - 72,
      centerY: sheet.y + 62,
   };

   doc
      .roundedRect(badge.centerX - 34, badge.centerY + 26, 12, 28, 2)
      .fill(levelTheme.ribbonBottom);
   doc
      .roundedRect(badge.centerX + 22, badge.centerY + 26, 12, 28, 2)
      .fill(levelTheme.ribbonBottom);

   const badgeOuterGradient = doc.radialGradient(
      badge.centerX - 16,
      badge.centerY - 16,
      2,
      badge.centerX,
      badge.centerY,
      45,
   );
   badgeOuterGradient
      .stop(0, levelTheme.outerLight)
      .stop(0.45, levelTheme.outerMid)
      .stop(1, levelTheme.outerDark);
   doc.circle(badge.centerX, badge.centerY, 45).fill(badgeOuterGradient);

   const badgeInnerGradient = doc.radialGradient(
      badge.centerX - 12,
      badge.centerY - 12,
      2,
      badge.centerX,
      badge.centerY,
      35,
   );
   badgeInnerGradient
      .stop(0, levelTheme.innerLight)
      .stop(0.45, levelTheme.innerMid)
      .stop(1, levelTheme.innerDark);
   doc.circle(badge.centerX, badge.centerY, 36).fill(badgeInnerGradient);

   doc
      .circle(badge.centerX, badge.centerY, 36)
      .lineWidth(0.8)
      .strokeColor("#334155")
      .stroke();

   doc
      .font("Helvetica-Bold")
      .fontSize(6.8)
      .fillColor(levelTheme.labelColor)
      .text("CERTIFICATION", badge.centerX - 26, badge.centerY - 17, {
         width: 52,
         align: "center",
      });

   doc
      .font("Helvetica-Bold")
      .fontSize(6.8)
      .fillColor(levelTheme.labelColor)
      .text("LEVEL", badge.centerX - 26, badge.centerY - 9, {
         width: 52,
         align: "center",
      });

   doc
      .font("Helvetica-Bold")
      .fontSize(14.8)
      .fillColor(levelTheme.levelColor)
      .text(snapshot.level, badge.centerX - 26, badge.centerY + 2, {
         width: 52,
         align: "center",
      });

   doc
      .font("Helvetica-Bold")
      .fontSize(6.2)
      .fillColor(levelTheme.codeColor)
      .text(resolveCertificateCode(snapshot.certificateNumber), badge.centerX - 26, badge.centerY + 18, {
         width: 52,
         align: "center",
      });

   let cursorY = sheet.y + 16;
   const textX = sheet.x + 24;
   const textRightEdge = badge.centerX - 60;
   const textWidth = Math.max(420, textRightEdge - textX);

   doc
      .font("Helvetica-Bold")
      .fontSize(10)
      .fillColor("#475569")
      .text("CERTIFICATE OF COMPLIANCE", textX, cursorY, {
         width: textWidth,
         align: "center",
         characterSpacing: 1.1,
      });
   cursorY += doc.heightOfString("CERTIFICATE OF COMPLIANCE", {
      width: textWidth,
      align: "center",
      characterSpacing: 1.1,
   }) + 12;

   const certificateTitle = "Ethical Tourism Assurance Certificate";
   const titleFontSize = fitFontSizeToWidth({
      doc,
      text: certificateTitle,
      font: "Times-Bold",
      maxFontSize: 28,
      minFontSize: 19,
      maxWidth: textWidth,
   });
   doc
      .font("Times-Bold")
      .fontSize(titleFontSize)
      .fillColor("#0f172a")
      .text(certificateTitle, textX, cursorY, {
         width: textWidth,
         align: "center",
         lineGap: 2,
      });
   cursorY += doc.heightOfString(certificateTitle, {
      width: textWidth,
      align: "center",
      lineGap: 2,
   }) + 12;

   const introText =
      "Awarded by the Ethical Tourism Certification Authority to recognize verified sustainability, service quality, and governance standards.";
   const introWidth = textWidth - 36;
   doc
      .font("Helvetica")
      .fontSize(11.2)
      .fillColor("#334155")
      .text(introText, textX + 18, cursorY, {
         width: introWidth,
         align: "center",
         lineGap: 2,
      });
   cursorY += doc.heightOfString(introText, {
      width: introWidth,
      align: "center",
      lineGap: 2,
   }) + 18;

   doc
      .font("Helvetica-Bold")
      .fontSize(9)
      .fillColor("#475569")
      .text("THIS CERTIFIES THAT", textX, cursorY, {
         width: textWidth,
         align: "center",
         characterSpacing: 1.2,
      });
   cursorY += doc.heightOfString("THIS CERTIFIES THAT", {
      width: textWidth,
      align: "center",
      characterSpacing: 1.2,
   }) + 10;

   const hotelNameWidth = textWidth - 24;
   const fittedHotelName = fitFontSizeToBlock({
      doc,
      text: snapshot.hotelName,
      font: "Times-Bold",
      maxFontSize: 29,
      minFontSize: 19,
      width: hotelNameWidth,
      maxHeight: 68,
      align: "center",
      lineGap: 2,
   });
   doc
      .font("Times-Bold")
      .fontSize(fittedHotelName.fontSize)
      .fillColor("#0f172a")
      .text(snapshot.hotelName, textX + 12, cursorY, {
         width: hotelNameWidth,
         align: "center",
         lineGap: 2,
      });
   cursorY += fittedHotelName.height + 10;

   const addressWidth = textWidth - 42;
   doc
      .font("Helvetica")
      .fontSize(10.8)
      .fillColor("#64748b")
      .text(snapshot.hotelAddress, textX + 21, cursorY, {
         width: addressWidth,
         align: "center",
         lineGap: 1.5,
      });
   cursorY += doc.heightOfString(snapshot.hotelAddress, {
      width: addressWidth,
      align: "center",
      lineGap: 1.5,
   }) + 14;

   const achievementText =
      "has successfully met the current evaluation criteria and is recognized as a certified tourism establishment under the Ethical Tourism Certification Program.";
   const achievementWidth = textWidth - 30;
   doc
      .font("Helvetica")
      .fontSize(11)
      .fillColor("#334155")
      .text(achievementText, textX + 15, cursorY, {
         width: achievementWidth,
         align: "center",
         lineGap: 2,
      });
   cursorY += doc.heightOfString(achievementText, {
      width: achievementWidth,
      align: "center",
      lineGap: 2,
   });

   const metricCardHeight = 54;
   const metricGap = 9;
   const metricX = sheet.x + 20;
   const metricY = Math.max(cursorY + 36, sheet.y + 292);
   const metricWidth = (sheet.width - 40 - metricGap * 2) / 3;

   const metrics = [
      { label: "Certificate Number", value: snapshot.certificateNumber },
      { label: "Issued On", value: snapshot.issuedOn },
      { label: "Valid Until", value: snapshot.validUntil },
      { label: "Trust Score", value: snapshot.trustScore },
      { label: "Hotel Record ID", value: snapshot.hotelRecordId },
      { label: "Renewal Count", value: snapshot.renewalCount },
   ];

   metrics.forEach((metric, index) => {
      const row = Math.floor(index / 3);
      const col = index % 3;
      const cardX = metricX + col * (metricWidth + metricGap);
      const cardY = metricY + row * (metricCardHeight + metricGap);

      drawMetricCard({
         doc,
         x: cardX,
         y: cardY,
         width: metricWidth,
         height: metricCardHeight,
         label: metric.label,
         value: metric.value,
      });
   });

   const noteY = metricY + metricCardHeight * 2 + metricGap + 12;
   const noteX = sheet.x + 20;
   const noteWidth = sheet.width - 40;
   const noteText = `${snapshot.summary} ${snapshot.validityStatement}`;
   const noteTextHeight = doc.heightOfString(noteText, {
      width: noteWidth - 24,
      align: "left",
   });
   const noteHeight = Math.max(40, noteTextHeight + 18);

   doc
      .roundedRect(noteX, noteY, noteWidth, noteHeight, 7)
      .fill("#f1f5f9");
   doc
      .roundedRect(noteX, noteY, 4, noteHeight, 3)
      .fill(theme.accent);
   doc
      .font("Helvetica")
      .fontSize(9.4)
      .fillColor("#1e293b")
      .text(noteText, noteX + 12, noteY + 9, {
         width: noteWidth - 24,
         align: "left",
      });

   let noteBottom = noteY + noteHeight;

   if (snapshot.revokedReason) {
      const reasonText = `Status Note: ${snapshot.revokedReason}`;
      const reasonHeight = Math.max(
         32,
         doc.heightOfString(reasonText, { width: noteWidth - 24 }) + 14,
      );
      const reasonY = noteBottom + 8;
      doc
         .roundedRect(noteX, reasonY, noteWidth, reasonHeight, 7)
         .fill("#fff1f2");
      doc
         .roundedRect(noteX, reasonY, 4, reasonHeight, 3)
         .fill("#be123c");
      doc
         .font("Helvetica")
         .fontSize(9.2)
         .fillColor("#881337")
         .text(reasonText, noteX + 12, reasonY + 8, {
            width: noteWidth - 24,
         });
      noteBottom = reasonY + reasonHeight;
   }

   const signatureBlock = {
      width: 185,
      height: 62,
      x: sheet.x + sheet.width - 205,
      y: Math.min(sheet.y + sheet.height - 74, noteBottom + 10),
   };

   if (signatureImage) {
      doc.image(signatureImage, signatureBlock.x + 55, signatureBlock.y - 2, {
         width: 74,
         height: 26,
      });
   } else {
      doc
         .font("Helvetica-Oblique")
         .fontSize(16)
         .fillColor("#64748b")
         .text("/s/", signatureBlock.x + 84, signatureBlock.y + 1, {
            width: 20,
            align: "center",
         });
   }

   doc
      .font("Times-Bold")
      .fontSize(8.8)
      .fillColor("#0f172a")
      .text("Director, Certification Council", signatureBlock.x + 15, signatureBlock.y + 29, {
         width: signatureBlock.width - 20,
         align: "center",
      });
   doc
      .font("Helvetica-Bold")
      .fontSize(7.8)
      .fillColor("#475569")
      .text("ISSUING AUTHORITY", signatureBlock.x + 15, signatureBlock.y + 43, {
         width: signatureBlock.width - 20,
         align: "center",
         characterSpacing: 0.9,
      });

   doc.end();
   return bufferPromise;
};

const getCloudinaryConfig = () => {
   const cloudNameRaw = process.env.CLOUDINARY_CLOUD_NAME;
   const apiKey = process.env.CLOUDINARY_API_KEY;
   const apiSecret = process.env.CLOUDINARY_API_SECRET;
   const folder =
      process.env.CLOUDINARY_CERTIFICATE_FOLDER ||
      "ethical-tourism/certificates";

   if (!cloudNameRaw || !apiKey || !apiSecret) {
      return null;
   }

   const cloudName = String(cloudNameRaw).trim().toLowerCase();
   if (!/^[a-z0-9-]+$/.test(cloudName)) {
      const error = new Error(
         `Invalid CLOUDINARY_CLOUD_NAME "${cloudNameRaw}". Use the exact Cloudinary cloud name from the dashboard settings.`,
      );
      error.statusCode = 500;
      throw error;
   }

   return { cloudName, apiKey, apiSecret, folder };
};

const buildUploadSignature = (params, apiSecret) => {
   const serialised = Object.entries(params)
      .filter(([, value]) => value !== undefined && value !== null && value !== "")
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([key, value]) => `${key}=${value}`)
      .join("&");

   return crypto
      .createHash("sha1")
      .update(`${serialised}${apiSecret}`)
      .digest("hex");
};

const withExtension = (publicId, format = "pdf") => {
   const safePublicId = String(publicId || "").trim().replace(/^\/+/, "");
   if (!safePublicId) return "";

   const safeFormat = sanitizeSegment(format, "pdf");
   const duplicateExtensionPattern = new RegExp(`(\\.${safeFormat})+$`, "i");
   const withoutTrailingExtensions = safePublicId.replace(duplicateExtensionPattern, "");

   if (!withoutTrailingExtensions) {
      return safePublicId.toLowerCase().endsWith(`.${safeFormat}`)
         ? safePublicId
         : `${safePublicId}.${safeFormat}`;
   }

   return `${withoutTrailingExtensions}.${safeFormat}`;
};

const sanitizeAttachmentFilename = (
   attachmentName,
   fallback = "certificate.pdf",
) => {
   const safeName = String(attachmentName || "")
      .trim()
      .replace(/[^a-zA-Z0-9._-]+/g, "-")
      .replace(/-+/g, "-")
      .replace(/^-+|-+$/g, "");

   return safeName || fallback;
};

const toCloudinaryAttachmentTransform = (attachmentName) => {
   const safeName = sanitizeAttachmentFilename(attachmentName, "");
   if (!safeName) return "fl_attachment";

   // Dots are interpreted as transformation separators in this segment.
   const transformSafeName = safeName.replace(/\./g, "-");
   return `fl_attachment:${encodeURIComponent(transformSafeName)}`;
};

export const buildCloudinaryDownloadUrl = ({
   secureUrl,
   cloudName,
   publicId,
   version,
   format = "pdf",
   attachmentName,
}) => {
   const safeCloudName = String(cloudName || "").trim().toLowerCase();
   const safePublicId = withExtension(publicId, format);
   const safeVersion = String(version || "").trim().replace(/^v/i, "");
   const attachmentTransform = toCloudinaryAttachmentTransform(attachmentName);

   if (safeCloudName && safePublicId && safeVersion) {
      return `https://res.cloudinary.com/${safeCloudName}/raw/upload/${attachmentTransform}/v${safeVersion}/${safePublicId}`;
   }

   if (secureUrl?.includes("/raw/upload/")) {
      return secureUrl.replace("/raw/upload/", `/raw/upload/${attachmentTransform}/`);
   }

   if (secureUrl?.includes("/image/upload/")) {
      return secureUrl.replace("/image/upload/", `/image/upload/${attachmentTransform}/`);
   }

   return secureUrl || "";
};

export const buildCloudinarySignedRawDownloadUrl = ({
   cloudName,
   apiKey,
   apiSecret,
   publicId,
   format = "pdf",
   attachmentName,
   deliveryType = "upload",
}) => {
   const safeCloudName = String(cloudName || "").trim().toLowerCase();
   const safeApiKey = String(apiKey || "").trim();
   const safeApiSecret = String(apiSecret || "").trim();
   const safePublicId = withExtension(publicId, format);

   if (!safeCloudName || !safeApiKey || !safeApiSecret || !safePublicId) {
      return "";
   }

   const safeDeliveryType = sanitizeSegment(deliveryType, "upload");
   const safeAttachmentName = sanitizeAttachmentFilename(
      attachmentName,
      `certificate.${sanitizeSegment(format, "pdf")}`,
   );
   const timestamp = Math.floor(Date.now() / 1000);
   const signature = buildUploadSignature(
      {
         attachment: safeAttachmentName,
         public_id: safePublicId,
         timestamp,
         type: safeDeliveryType,
      },
      safeApiSecret,
   );

   const query = new URLSearchParams({
      public_id: safePublicId,
      timestamp: String(timestamp),
      type: safeDeliveryType,
      attachment: safeAttachmentName,
      api_key: safeApiKey,
      signature,
   });

   return `https://api.cloudinary.com/v1_1/${safeCloudName}/raw/download?${query.toString()}`;
};

const uploadCertificatePdfBuffer = async ({
   pdfBuffer,
   certificateNumber,
   lifecycleEvent,
}) => {
   const config = getCloudinaryConfig();
   if (!config) {
      console.warn(
         "[CertificateDocument] Cloudinary is not configured. Skipping certificate upload.",
      );
      return null;
   }

   const timestamp = Math.floor(Date.now() / 1000);
   const safeCertificate = sanitizeSegment(certificateNumber, "cert");
   const safeEvent = sanitizeSegment(lifecycleEvent, "snapshot");
   const eventTimestamp = new Date().toISOString().replace(/\D/g, "").slice(0, 14);
   const publicId = `${safeCertificate}/${safeEvent}-${eventTimestamp}`;

   const signable = {
      folder: config.folder,
      public_id: publicId,
      timestamp,
      overwrite: false,
   };
   const signature = buildUploadSignature(signable, config.apiSecret);

   const form = new FormData();
   form.append(
      "file",
      new Blob([pdfBuffer], { type: "application/pdf" }),
      `${safeCertificate}-${safeEvent}.pdf`,
   );
   form.append("folder", config.folder);
   form.append("public_id", publicId);
   form.append("timestamp", String(timestamp));
   form.append("overwrite", "false");
   form.append("api_key", config.apiKey);
   form.append("signature", signature);

   const endpoint = `https://api.cloudinary.com/v1_1/${config.cloudName}/raw/upload`;
   const response = await fetch(endpoint, { method: "POST", body: form });
   const payload = await response.json().catch(() => null);

   if (!response.ok) {
      const message =
         payload?.error?.message ||
         payload?.message ||
         `Cloudinary upload failed with status ${response.status}`;
      const detail =
         String(message).toLowerCase().includes("invalid cloud_name")
            ? `${message}. Verify CLOUDINARY_CLOUD_NAME matches your Cloudinary account cloud name exactly.`
            : message;
      const error = new Error(detail);
      error.statusCode = response.status;
      throw error;
   }

   return {
      publicId: payload.public_id,
      secureUrl: payload.secure_url,
      downloadUrl: buildCloudinaryDownloadUrl({
         secureUrl: payload.secure_url,
         cloudName: config.cloudName,
         publicId: payload.public_id,
         version: payload.version,
         format: payload.format || "pdf",
         attachmentName: `${safeCertificate}.pdf`,
      }),
      bytes: payload.bytes,
      format: payload.format || "pdf",
      resourceType: payload.resource_type,
      version: payload.version,
   };
};

export const generateCertificatePdfBuffer = async ({
   certificate,
   hotel,
}) => {
   if (!certificate) {
      throw new Error("Certificate data is required to generate a document");
   }
   return drawCertificatePdf({ certificate, hotel });
};

export const generateAndUploadCertificatePdf = async ({
   certificate,
   hotel,
   lifecycleEvent = "snapshot",
}) => {
   const pdfBuffer = await generateCertificatePdfBuffer({ certificate, hotel });
   const uploadResult = await uploadCertificatePdfBuffer({
      pdfBuffer,
      certificateNumber: certificate?.certificateNumber,
      lifecycleEvent,
   });

   if (!uploadResult) {
      return null;
   }

   return {
      ...uploadResult,
      lifecycleEvent,
      generatedAt: new Date().toISOString(),
   };
};
