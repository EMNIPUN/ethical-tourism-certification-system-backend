import sgMail from "@sendgrid/mail";

/**
 * emailService.js
 *
 * SendGrid email notifications for Certificate Lifecycle events:
 *   - Certificate Issued
 *   - Certificate Expired
 *   - Certificate Renewed
 *   - Certificate Revoked
 */

const FROM_EMAIL = () =>
   process.env.SENDGRID_FROM_EMAIL || "noreply@ethicaltourism.com";
const FROM_NAME = "Ethical Tourism Certification";

// ─── Shared layout wrapper ────────────────────────────────────────────────────
const wrap = (accentColor, iconEmoji, title, body) => `
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
          <!-- Header -->
          <tr>
            <td style="background:${accentColor};padding:32px 40px;text-align:center;">
              <div style="font-size:48px;line-height:1;">${iconEmoji}</div>
              <h1 style="color:#ffffff;margin:12px 0 0;font-size:24px;font-weight:700;letter-spacing:-0.3px;">${title}</h1>
            </td>
          </tr>
          <!-- Body -->
          <tr>
            <td style="padding:36px 40px;color:#374151;font-size:15px;line-height:1.7;">
              ${body}
            </td>
          </tr>
          <!-- Footer -->
          <tr>
            <td style="background:#f9fafb;border-top:1px solid #e5e7eb;padding:24px 40px;text-align:center;color:#9ca3af;font-size:13px;">
              <p style="margin:0 0 4px;">Ethical Tourism Certification System</p>
              <p style="margin:0;">This is an automated message — please do not reply to this email.</p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;

// ─── Info row helper ──────────────────────────────────────────────────────────
const infoRow = (label, value) => `
  <tr>
    <td style="padding:6px 0;color:#6b7280;font-size:14px;width:160px;vertical-align:top;">${label}</td>
    <td style="padding:6px 0;color:#111827;font-size:14px;font-weight:600;">${value}</td>
  </tr>`;

const infoTable = (rows) => `
  <table cellpadding="0" cellspacing="0" style="width:100%;margin:20px 0;border-top:1px solid #e5e7eb;border-bottom:1px solid #e5e7eb;padding:4px 0;">
    ${rows}
  </table>`;

// ─── Template: ISSUED ─────────────────────────────────────────────────────────
const issuedTemplate = ({
   hotelName,
   certificateNumber,
   level,
   issuedDate,
   expiryDate,
   trustScore,
}) =>
   wrap(
      "#10b981",
      "🏅",
      "Certificate Successfully Issued",
      `<p style="margin:0 0 16px;">Dear <strong>${hotelName}</strong>,</p>
     <p style="margin:0 0 16px;">Congratulations! Your <strong>Ethical Tourism Certificate</strong> has been officially issued. Your establishment has met all required standards for ethical and sustainable tourism.</p>
     ${infoTable(
        infoRow("Certificate No.", certificateNumber) +
           infoRow("Level", level) +
           infoRow("Trust Score", `${trustScore} / 100`) +
           infoRow("Issued On", issuedDate) +
           infoRow("Valid Until", expiryDate),
     )}
     <p style="margin:16px 0 0;color:#6b7280;font-size:14px;">Please keep this information safe. You may display your certification proudly to your guests.</p>`,
   );

// ─── Template: EXPIRED ───────────────────────────────────────────────────────
const expiredTemplate = ({ hotelName, certificateNumber, expiryDate }) =>
   wrap(
      "#f59e0b",
      "⚠️",
      "Your Certificate Has Expired",
      `<p style="margin:0 0 16px;">Dear <strong>${hotelName}</strong>,</p>
     <p style="margin:0 0 16px;">This is to notify you that your Ethical Tourism Certificate has <strong>expired</strong>. Please contact the certification authority to initiate a renewal as soon as possible.</p>
     ${infoTable(
        infoRow("Certificate No.", certificateNumber) +
           infoRow("Expired On", expiryDate),
     )}
     <p style="margin:16px 0 0;color:#6b7280;font-size:14px;">Until renewed, your certification status will not be visible to the public portal. Reach out to our team to begin the renewal process.</p>`,
   );

// ─── Template: RENEWED ───────────────────────────────────────────────────────
const renewedTemplate = ({
   hotelName,
   certificateNumber,
   level,
   newExpiryDate,
   renewalCount,
   trustScore,
}) =>
   wrap(
      "#3b82f6",
      "🔄",
      "Certificate Successfully Renewed",
      `<p style="margin:0 0 16px;">Dear <strong>${hotelName}</strong>,</p>
     <p style="margin:0 0 16px;">Great news! Your Ethical Tourism Certificate has been <strong>renewed</strong>. Your continued commitment to ethical tourism practices is valued and recognised.</p>
     ${infoTable(
        infoRow("Certificate No.", certificateNumber) +
           infoRow("Level", level) +
           infoRow("Trust Score", `${trustScore} / 100`) +
           infoRow("New Expiry Date", newExpiryDate) +
           infoRow("Total Renewals", renewalCount),
     )}
     <p style="margin:16px 0 0;color:#6b7280;font-size:14px;">A loyalty bonus has been applied to your trust score for renewing your certification.</p>`,
   );

// ─── Template: REVOKED ───────────────────────────────────────────────────────
const revokedTemplate = ({ hotelName, certificateNumber, reason }) =>
   wrap(
      "#ef4444",
      "🚫",
      "Certificate Revoked",
      `<p style="margin:0 0 16px;">Dear <strong>${hotelName}</strong>,</p>
     <p style="margin:0 0 16px;">We regret to inform you that your Ethical Tourism Certificate has been <strong>revoked</strong> by the certification authority.</p>
     ${infoTable(
        infoRow("Certificate No.", certificateNumber) +
           infoRow("Reason", reason),
     )}
     <p style="margin:16px 0 0;color:#6b7280;font-size:14px;">If you believe this decision was made in error, please contact our team at your earliest convenience to discuss the matter and explore remediation options.</p>`,
   );

// ─── Send helper ─────────────────────────────────────────────────────────────
const send = async ({ to, subject, html }) => {
   const payload = {
      to,
      from: { email: FROM_EMAIL(), name: FROM_NAME },
      subject,
      htmlLength: html?.length ?? 0,
   };

   // Log outgoing email data (avoid logging full HTML to keep logs concise)
   console.info(`[EmailService] Sending email to ${to}:`, payload);

   try {
      sgMail.setApiKey(process.env.SENDGRID_API_KEY);
      const res = await sgMail.send({
         to,
         from: { email: FROM_EMAIL(), name: FROM_NAME },
         subject,
         html,
      });

      // SendGrid may return an array for batch responses; normalise for logging
      const primary = Array.isArray(res) ? res[0] : res;
      console.info(
         `[EmailService] Sent "${subject}" to ${to} — status: ${primary?.statusCode ?? "unknown"}`,
         { headers: primary?.headers ?? null },
      );
      return res;
   } catch (err) {
      // Log but never crash the main flow — email is non-critical
      console.error(
         `[EmailService] Failed to send "${subject}" to ${to}:`,
         err?.response?.body ?? err?.message ?? err,
      );
      return null;
   }
};

// ─── Public API ───────────────────────────────────────────────────────────────

/**
 * Notify hotel that a new certificate has been issued.
 */
export const sendCertificateIssuedEmail = async (hotel, certificate) => {
   const email = hotel.businessInfo?.contact?.email;
   if (!email) return;

   await send({
      to: email,
      subject: `🏅 Your Ethical Tourism Certificate Has Been Issued — ${certificate.certificateNumber}`,
      html: issuedTemplate({
         hotelName: hotel.businessInfo.name,
         certificateNumber: certificate.certificateNumber,
         level: certificate.level,
         trustScore: certificate.trustScore,
         issuedDate: new Date(certificate.issuedDate).toDateString(),
         expiryDate: new Date(certificate.expiryDate).toDateString(),
      }),
   });
};

/**
 * Notify hotel that their certificate has expired.
 */
export const sendCertificateExpiredEmail = async (hotel, certificate) => {
   const email = hotel.businessInfo?.contact?.email;
   if (!email) return;

   await send({
      to: email,
      subject: `⚠️ Your Ethical Tourism Certificate Has Expired — ${certificate.certificateNumber}`,
      html: expiredTemplate({
         hotelName: hotel.businessInfo.name,
         certificateNumber: certificate.certificateNumber,
         expiryDate: new Date(certificate.expiryDate).toDateString(),
      }),
   });
};

/**
 * Notify hotel that their certificate has been renewed.
 */
export const sendCertificateRenewedEmail = async (hotel, certificate) => {
   const email = hotel.businessInfo?.contact?.email;
   if (!email) return;

   await send({
      to: email,
      subject: `🔄 Your Ethical Tourism Certificate Has Been Renewed — ${certificate.certificateNumber}`,
      html: renewedTemplate({
         hotelName: hotel.businessInfo.name,
         certificateNumber: certificate.certificateNumber,
         level: certificate.level,
         trustScore: certificate.trustScore,
         newExpiryDate: new Date(certificate.expiryDate).toDateString(),
         renewalCount: certificate.renewalCount,
      }),
   });
};

/**
 * Notify hotel that their certificate has been revoked.
 */
export const sendCertificateRevokedEmail = async (hotel, certificate) => {
   const email = hotel.businessInfo?.contact?.email;
   if (!email) return;

   await send({
      to: email,
      subject: `🚫 Your Ethical Tourism Certificate Has Been Revoked — ${certificate.certificateNumber}`,
      html: revokedTemplate({
         hotelName: hotel.businessInfo.name,
         certificateNumber: certificate.certificateNumber,
         reason: certificate.revokedReason || "Not specified",
      }),
   });
};
