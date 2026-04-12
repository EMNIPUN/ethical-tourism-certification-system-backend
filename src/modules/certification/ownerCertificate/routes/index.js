import express from "express";
import ownerCertificateRoutes from "./ownerCertificateRoutes.js";

const router = express.Router();

router.use("/", ownerCertificateRoutes);

export default router;
