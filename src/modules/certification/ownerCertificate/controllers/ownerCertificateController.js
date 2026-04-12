import asyncHandler from "../../../../common/utils/asyncHandler.js";
import * as ownerCertificateService from "../services/ownerCertificateService.js";

export const getOwnerCertificateDownloadLink = asyncHandler(async (req, res) => {
    const ownerEmail = req.user?.email;
    const ownerUserId = req.user?._id || null;
    const { certificateNumber } = req.params;

    const payload = await ownerCertificateService.getOwnerCertificateDownloadLinkByNumber(
        {
            ownerEmail,
            ownerUserId,
            certificateNumber,
        },
    );

    res.set("Cache-Control", "no-store");
    res.status(200).json({
        success: true,
        data: payload,
    });
});
