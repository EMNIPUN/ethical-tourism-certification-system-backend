import multer from "multer";

// Multer Configuration (Memory Storage + 15MB limit)
const storage = multer.memoryStorage();
export const upload = multer({
    storage: storage,
    limits: { fileSize: 15 * 1024 * 1024 }, // 15MB
    fileFilter: (req, file, cb) => {
        // Optional: Add mime type checks here if needed
        cb(null, true);
    }
});

// Define expected file fields
export const cpUpload = upload.fields([
    { name: 'legalDocuments', maxCount: 10 },
    { name: 'salarySlips', maxCount: 1 },
    { name: 'staffHandbook', maxCount: 1 },
    { name: 'hrPolicy', maxCount: 1 }
]);
