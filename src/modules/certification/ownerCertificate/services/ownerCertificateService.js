import Certificate from "../../../../common/models/certificate.model.js";
import Hotel from "../../application/models/Hotel.js";
import {
    createCertificateDownloadLink,
} from "../../../../common/utils/certificateDownloadToken.js";
import {
    generateAndUploadCertificatePdf,
} from "../../lifecycle/services/certificateDocumentService.js";

const escapeRegex = (value) => String(value).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

const getOwnerHotelIds = async ({ ownerUserId, ownerEmail }) => {
    const conditions = [];

    if (ownerUserId) {
        conditions.push({ ownerUserId });
    }

    const normalizedEmail = String(ownerEmail || "").trim().toLowerCase();
    if (normalizedEmail) {
        conditions.push({
            "businessInfo.contact.email": {
                $regex: `^${escapeRegex(normalizedEmail)}$`,
                $options: "i",
            },
        });
    }

    if (!conditions.length) {
        return [];
    }

    const hotels = await Hotel.find({ $or: conditions }, "_id");
    return hotels.map((hotel) => hotel._id);
};

export const getOwnerCertificateDownloadLinkByNumber = async ({
    ownerEmail,
    ownerUserId,
    certificateNumber,
}) => {
    const normalizedNumber = String(certificateNumber || "").trim();
    if (!normalizedNumber) {
        const error = new Error("Certificate number is required");
        error.statusCode = 400;
        throw error;
    }

    const certificate = await Certificate.findOne({
        certificateNumber: normalizedNumber,
    });

    if (!certificate) {
        const error = new Error("Certificate not found");
        error.statusCode = 404;
        throw error;
    }

    const ownerHotelIds = await getOwnerHotelIds({ ownerUserId, ownerEmail });
    const ownerHotelIdSet = new Set(ownerHotelIds.map((id) => id.toString()));

    if (!ownerHotelIdSet.has(certificate.hotelId?.toString())) {
        const error = new Error("You do not have access to this certificate");
        error.statusCode = 403;
        throw error;
    }

    const hotel = await Hotel.findById(certificate.hotelId);
    if (!hotel) {
        const error = new Error("Hotel not found for this certificate");
        error.statusCode = 404;
        throw error;
    }

    const certificateAsset = await generateAndUploadCertificatePdf({
        certificate,
        hotel,
        lifecycleEvent: "owner-download",
    });

    if (!certificateAsset) {
        const error = new Error(
            "Certificate PDF could not be generated (Cloudinary may not be configured)",
        );
        error.statusCode = 500;
        throw error;
    }

    const url = createCertificateDownloadLink({
        certificateNumber: certificate.certificateNumber,
        certificateAsset,
    });

    if (!url) {
        const error = new Error(
            "Certificate download link is not configured (missing CERTIFICATE_DOWNLOAD_SECRET/JWT_SECRET)",
        );
        error.statusCode = 500;
        throw error;
    }

    return {
        certificateNumber: certificate.certificateNumber,
        url,
    };
};
