import express from "express";
import lifecycleRoutes from "./lifecycleRoutes.js";

const router = express.Router();

// Mount certificate lifecycle routes
router.use("/", lifecycleRoutes);

export default router;
