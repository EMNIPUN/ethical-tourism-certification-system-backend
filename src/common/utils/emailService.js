import sgMail from "@sendgrid/mail";

/**
 * SendGrid email notifications for Certificate Lifecycle events:
 * - Certificate Issued
 * - Certificate Expired
 * - Certificate Renewed
 * - Certificate Revoked
 */

const FROM_EMAIL = () =>
   process.env.SENDGRID_FROM_EMAIL || "noreply@ethicaltourism.com";
const FROM_NAME = "Ethical Tourism Certification";

const wrap = (accentColor, iconLabel, title, body) => `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0"/>
  <title>${title}</title>
</head>
<body style="margin:0;padding:0;background:#f4f6f8;font-family:'Segoe UI',Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f4f6f8;padding:40px 0;">
    <tr>
      <td align="center">
        <table width="600" cellpadding="0" cellspacing="0" style="background:#ffffff;border-radius:12px;overflow:hidden;box-shadow:0 4px 20px rgba(0,0,0,0.08);">
          <tr>
            <td style="background:${accentColor};padding:28px 40px;text-align:center;">
              <p style="margin:0;color:#e2e8f0;font-size:12px;letter-spacing:0.12em;text-transform:uppercase;font-weight:700;">${iconLabel}</p>
              <h1 style="color:#ffffff;margin:10px 0 0;font-size:24px;font-weight:700;letter-spacing:-0.2px;">${title}</h1>
            </td>
          </tr>
          <tr>
            <td style="padding:36px 40px;color:#374151;font-size:15px;line-height:1.7;">
              ${body}
            </td>
          </tr>
          <tr>
            <td style="background:#f9fafb;border-top:1px solid #e5e7eb;padding:24px 40px;text-align:center;color:#9ca3af;font-size:13px;">
              <p style="margin:0 0 4px;">Ethical Tourism Certification System</p>
              <p style="margin:0;">This is an automated message. Please do not reply to this email.</p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;

const infoRow = (label, value) => `
  <tr>
    <td style="padding:6px 0;color:#6b7280;font-size:14px;width:160px;vertical-align:top;">${label}</td>
    <td style="padding:6px 0;color:#111827;font-size:14px;font-weight:600;">${value}</td>
  </tr>`;

const infoTable = (rows) => `
  <table cellpadding="0" cellspacing="0" style="width:100%;margin:20px 0;border-top:1px solid #e5e7eb;border-bottom:1px solid #e5e7eb;padding:4px 0;">
    ${rows}
  </table>`;

const formatDate = (value) => {
   if (!value) return "N/A";
   const date = value instanceof Date ? value : new Date(value);
   if (Number.isNaN(date.getTime())) return "N/A";
   return date.toDateString();
};

const resolveCertificateDownloadUrl = (certificateAsset) =>
   certificateAsset?.downloadUrl ||
   certificateAsset?.secureUrl ||
   certificateAsset?.url ||
   "";

const buildCertificateLinkSection = (certificateAsset) => {
   const downloadUrl = resolveCertificateDownloadUrl(certificateAsset);
   if (!downloadUrl) return "";

   return `
    <div style="margin:18px 0 0;padding:14px 16px;border:1px solid #cbd5e1;border-radius:10px;background:#f8fafc;">
      <p style="margin:0 0 10px;font-size:14px;color:#334155;">
        Your backend-generated certificate PDF is ready in Cloudinary.
      </p>
      <a href="${downloadUrl}" style="display:inline-block;padding:10px 14px;background:#0f766e;color:#ffffff;text-decoration:none;border-radius:8px;font-weight:700;font-size:13px;">
        Download Certificate PDF
      </a>
    </div>`;
};

const issuedTemplate = ({
   hotelName,
   certificateNumber,
   level,
   issuedDate,
   expiryDate,
   trustScore,
   certificateAsset,
}) =>
   wrap(
      "#10b981",
      "Lifecycle Event: Issued",
      "Certificate Successfully Issued",
      `<p style="margin:0 0 16px;">Dear <strong>${hotelName}</strong>,</p>
     <p style="margin:0 0 16px;">Congratulations. Your <strong>Ethical Tourism Certificate</strong> has been officially issued. Your establishment has met all required standards for ethical and sustainable tourism.</p>
     ${infoTable(
        infoRow("Certificate No.", certificateNumber) +
           infoRow("Level", level) +
           infoRow("Trust Score", `${trustScore} / 100`) +
           infoRow("Issued On", issuedDate) +
           infoRow("Valid Until", expiryDate),
     )}
     ${buildCertificateLinkSection(certificateAsset)}
     <p style="margin:16px 0 0;color:#6b7280;font-size:14px;">Please keep this information safe. You may display your certification proudly to your guests.</p>`,
   );

const expiredTemplate = ({
   hotelName,
   certificateNumber,
   expiryDate,
   certificateAsset,
}) =>
   wrap(
      "#f59e0b",
      "Lifecycle Event: Expired",
      "Your Certificate Has Expired",
      `<p style="margin:0 0 16px;">Dear <strong>${hotelName}</strong>,</p>
     <p style="margin:0 0 16px;">This is to notify you that your Ethical Tourism Certificate has <strong>expired</strong>. Please contact the certification authority to initiate a renewal as soon as possible.</p>
     ${infoTable(
        infoRow("Certificate No.", certificateNumber) +
           infoRow("Expired On", expiryDate),
     )}
     ${buildCertificateLinkSection(certificateAsset)}
     <p style="margin:16px 0 0;color:#6b7280;font-size:14px;">Until renewed, your certification status will not be visible to the public portal. Reach out to our team to begin the renewal process.</p>`,
   );

const renewedTemplate = ({
   hotelName,
   certificateNumber,
   level,
   newExpiryDate,
   renewalCount,
   trustScore,
   certificateAsset,
}) =>
   wrap(
      "#3b82f6",
      "Lifecycle Event: Renewed",
      "Certificate Successfully Renewed",
      `<p style="margin:0 0 16px;">Dear <strong>${hotelName}</strong>,</p>
     <p style="margin:0 0 16px;">Great news. Your Ethical Tourism Certificate has been <strong>renewed</strong>. Your continued commitment to ethical tourism practices is valued and recognized.</p>
     ${infoTable(
        infoRow("Certificate No.", certificateNumber) +
           infoRow("Level", level) +
           infoRow("Trust Score", `${trustScore} / 100`) +
           infoRow("New Expiry Date", newExpiryDate) +
           infoRow("Total Renewals", renewalCount),
     )}
     ${buildCertificateLinkSection(certificateAsset)}
     <p style="margin:16px 0 0;color:#6b7280;font-size:14px;">A renewal bonus has been applied to your trust score.</p>`,
   );

const revokedTemplate = ({
   hotelName,
   certificateNumber,
   reason,
   certificateAsset,
}) =>
   wrap(
      "#ef4444",
      "Lifecycle Event: Revoked",
      "Certificate Revoked",
      `<p style="margin:0 0 16px;">Dear <strong>${hotelName}</strong>,</p>
     <p style="margin:0 0 16px;">We regret to inform you that your Ethical Tourism Certificate has been <strong>revoked</strong> by the certification authority.</p>
     ${infoTable(
        infoRow("Certificate No.", certificateNumber) +
           infoRow("Reason", reason),
     )}
     ${buildCertificateLinkSection(certificateAsset)}
     <p style="margin:16px 0 0;color:#6b7280;font-size:14px;">If you believe this decision was made in error, please contact our team at your earliest convenience to discuss remediation options.</p>`,
   );

const send = async ({ to, subject, html }) => {
   const payload = {
      to,
      from: { email: FROM_EMAIL(), name: FROM_NAME },
      subject,
      htmlLength: html?.length ?? 0,
   };

   console.info(`[EmailService] Sending email to ${to}:`, payload);

   try {
      sgMail.setApiKey(process.env.SENDGRID_API_KEY);
      const response = await sgMail.send({
         to,
         from: { email: FROM_EMAIL(), name: FROM_NAME },
         subject,
         html,
      });

      const primary = Array.isArray(response) ? response[0] : response;
      console.info(
         `[EmailService] Sent "${subject}" to ${to} - status: ${primary?.statusCode ?? "unknown"}`,
         { headers: primary?.headers ?? null },
      );
      return response;
   } catch (error) {
      console.error(
         `[EmailService] Failed to send "${subject}" to ${to}:`,
         error?.response?.body ?? error?.message ?? error,
      );
      return null;
   }
};

export const sendCertificateIssuedEmail = async (
   hotel,
   certificate,
   certificateAsset = null,
) => {
   const email = hotel?.businessInfo?.contact?.email;
   if (!email) return;

   await send({
      to: email,
      subject: `[Issued] Ethical Tourism Certificate - ${certificate.certificateNumber}`,
      html: issuedTemplate({
         hotelName: hotel.businessInfo?.name || "Hotel",
         certificateNumber: certificate.certificateNumber,
         level: certificate.level,
         trustScore: certificate.trustScore,
         issuedDate: formatDate(certificate.issuedDate),
         expiryDate: formatDate(certificate.expiryDate),
         certificateAsset,
      }),
   });
};

export const sendCertificateExpiredEmail = async (
   hotel,
   certificate,
   certificateAsset = null,
) => {
   const email = hotel?.businessInfo?.contact?.email;
   if (!email) return;

   await send({
      to: email,
      subject: `[Expired] Ethical Tourism Certificate - ${certificate.certificateNumber}`,
      html: expiredTemplate({
         hotelName: hotel.businessInfo?.name || "Hotel",
         certificateNumber: certificate.certificateNumber,
         expiryDate: formatDate(certificate.expiryDate),
         certificateAsset,
      }),
   });
};

export const sendCertificateRenewedEmail = async (
   hotel,
   certificate,
   certificateAsset = null,
) => {
   const email = hotel?.businessInfo?.contact?.email;
   if (!email) return;

   await send({
      to: email,
      subject: `[Renewed] Ethical Tourism Certificate - ${certificate.certificateNumber}`,
      html: renewedTemplate({
         hotelName: hotel.businessInfo?.name || "Hotel",
         certificateNumber: certificate.certificateNumber,
         level: certificate.level,
         trustScore: certificate.trustScore,
         newExpiryDate: formatDate(certificate.expiryDate),
         renewalCount: certificate.renewalCount,
         certificateAsset,
      }),
   });
};

export const sendCertificateRevokedEmail = async (
   hotel,
   certificate,
   certificateAsset = null,
) => {
   const email = hotel?.businessInfo?.contact?.email;
   if (!email) return;

   await send({
      to: email,
      subject: `[Revoked] Ethical Tourism Certificate - ${certificate.certificateNumber}`,
      html: revokedTemplate({
         hotelName: hotel.businessInfo?.name || "Hotel",
         certificateNumber: certificate.certificateNumber,
         reason: certificate.revokedReason || "Not specified",
         certificateAsset,
      }),
   });
};
