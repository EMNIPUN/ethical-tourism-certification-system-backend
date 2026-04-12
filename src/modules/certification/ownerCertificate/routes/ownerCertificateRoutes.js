import express from "express";
import {
    protect,
    authorize,
} from "../../../../common/middleware/authMiddleware.js";
import {
    getOwnerCertificateDownloadLink,
} from "../controllers/ownerCertificateController.js";

const router = express.Router();

router.get(
    "/certificates/owner/:certificateNumber/download-link",
    protect,
    authorize("Hotel Owner"),
    getOwnerCertificateDownloadLink,
);

export default router;
