import jwt from "jsonwebtoken";

const DEFAULT_EXPIRY = "7d";

const getDownloadTokenSecret = () =>
   process.env.CERTIFICATE_DOWNLOAD_SECRET || process.env.JWT_SECRET || "";

const getDownloadBaseUrl = () => {
   const explicitBase =
      process.env.CERTIFICATE_DOWNLOAD_BASE_URL ||
      process.env.BACKEND_BASE_URL ||
      process.env.API_BASE_URL ||
      "";

   if (explicitBase) {
      return String(explicitBase).replace(/\/+$/, "");
   }

   const port = process.env.PORT || 5000;
   return `http://localhost:${port}`;
};

const getApiPrefix = () => {
   const configuredPrefix = process.env.CERTIFICATE_DOWNLOAD_API_PREFIX;
   const fallbackPrefix = process.env.API_PREFIX || "/api/v1";
   const value = configuredPrefix ?? fallbackPrefix;

   const trimmed = String(value || "").trim();
   if (!trimmed || trimmed === "/") {
      return "";
   }

   return `/${trimmed.replace(/^\/+|\/+$/g, "")}`;
};

export const createCertificateDownloadToken = ({
   certificateNumber,
   certificateAsset,
}) => {
   const secret = getDownloadTokenSecret();
   if (!secret) return "";

   if (!certificateAsset?.publicId || !certificateAsset?.version) {
      return "";
   }

   return jwt.sign(
      {
         type: "certificate-download",
         certificateNumber: certificateNumber || "",
         publicId: certificateAsset.publicId,
         version: certificateAsset.version,
         format: certificateAsset.format || "pdf",
      },
      secret,
      {
         expiresIn: process.env.CERTIFICATE_DOWNLOAD_EXPIRES_IN || DEFAULT_EXPIRY,
      },
   );
};

export const createCertificateDownloadLink = ({
   certificateNumber,
   certificateAsset,
}) => {
   const token = createCertificateDownloadToken({
      certificateNumber,
      certificateAsset,
   });
   if (!token) return "";

   const baseUrl = getDownloadBaseUrl();
   const apiPrefix = getApiPrefix();
   return `${baseUrl}${apiPrefix}/certification/certificates/download?token=${encodeURIComponent(token)}`;
};

export const verifyCertificateDownloadToken = (token) => {
   const secret = getDownloadTokenSecret();
   if (!secret) {
      const error = new Error(
         "Certificate download is not configured. Missing JWT/CERTIFICATE_DOWNLOAD secret.",
      );
      error.statusCode = 500;
      throw error;
   }

   try {
      const payload = jwt.verify(token, secret);

      if (payload?.type !== "certificate-download") {
         const error = new Error("Invalid certificate download token");
         error.statusCode = 401;
         throw error;
      }

      return payload;
   } catch (error) {
      const wrapped = new Error("Invalid or expired certificate download link");
      wrapped.statusCode = 401;
      throw wrapped;
   }
};
