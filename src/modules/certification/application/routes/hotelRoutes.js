import express from "express";
import {
   createHotel,
   getHotels,
   getHotel,
   updateHotel,
   deleteHotel,
   confirmMatch,
} from "../controllers/hotelController.js";
import {
   protect,
   authorize,
} from "../../../../common/middleware/authMiddleware.js";
import { cpUpload } from "../middleware/fileUploadMiddleware.js";

const router = express.Router();

/**
 * @swagger
 * tags:
 *   name: Certification Application Management
 *   description: API endpoints for managing hotel certificates, including creation, updates, and interactive search/confirmation process.
 */

/**
 * @swagger
 * /hotels:
 *   get:
 *     summary: Retrieve a list of hotels
 *     tags: [Certification Application Management]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: A list of hotels
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/HotelListResponse'
 *   post:
 *     summary: (Step 1) Create a new hotel and search candidates
 *     tags: [Certification Application Management]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             properties:
 *               hotelData:
 *                 type: object
 *                 description: JSON object containing all hotel data matching the HotelRequest schema.
 *                 example:
 *                   businessInfo:
 *                     name: "AYANA Resort Bali"
 *                     registrationNumber: "REG-12345"
 *                     licenseNumber: "LIC-67890"
 *                     yearEstablished: 1996
 *                     businessType: "Hotel"
 *                     contact:
 *                       ownerName: "John Doe"
 *                       phone: "+1234567890"
 *                       email: "hotel@example.com"
 *                       website: "https://ayana.com"
 *                       address: "Jimbaran, Bali, Indonesia"
 *                       gps:
 *                         latitude: -8.7915
 *                         longitude: 115.1381
 *                     serpApiPropertyToken: "string"
 *                   employeePractices:
 *                     workforce:
 *                       totalEmployees: 100
 *                       permanentStaff: 80
 *                       temporaryStaff: 20
 *                       femaleEmployeesPercentage: 45
 *                       localEmployeesPercentage: 90
 *                     workerRights:
 *                       minimumWageCompliance: true
 *                       overtimePolicy: "Paid at 1.5x regular rate"
 *                       workingHoursPolicy: "40 hours per week"
 *                       leavePolicy: "20 days annual leave"
 *                       healthInsuranceProvided: true
 *                       unionWorkerCommittee: true
 *                   sustainability:
 *                     resourceUsage:
 *                       monthlyWaterUsage: 50000
 *                       monthlyElectricityUsage: 12000
 *                       fuelUsage: 500
 *                       renewableEnergyPercentage: 30
 *                     wasteManagement:
 *                       wasteSegregation: true
 *                       recyclingProgram: true
 *                       composting: true
 *                       plasticReductionPolicy: "Zero single-use plastics"
 *                     conservation:
 *                       waterSavingDevices: true
 *                       energyEfficientLighting: true
 *                       rainwaterHarvesting: true
 *                       greenLandscaping: true
 *                     certifications:
 *                       - name: "EarthCheck Gold"
 *                         dateReceived: "2023-01-15T00:00:00.000Z"
 *                         expiryDate: "2025-01-15T00:00:00.000Z"
 *                   community:
 *                     localSupport:
 *                       localSupplierPercentage: 70
 *                       localFoodUsagePercentage: 80
 *                       handicraftPromotion: true
 *                       localTourGuides: true
 *                     projects:
 *                       csrProjects: "Beach cleaning initiative every month"
 *                       trainingPrograms: "Hospitality training for local youth"
 *                       scholarshipPrograms: "Annual scholarship for 5 local students"
 *                       donations: "$5000 annually to local orphanage"
 *                     culturalProtection:
 *                       culturalAwarenessTraining: true
 *                       heritageProtectionPolicy: "Protection of local temple on premises"
 *                   guestServices:
 *                     facilities:
 *                       numberOfRooms: 200
 *                       roomTypes: ["Standard", "Deluxe", "Suite"]
 *                       maxCapacity: 450
 *                       accessibilityFeatures: true
 *                     experience:
 *                       averageRating: 4.8
 *                       complaintHandlingPolicy: "Resolution within 24 hours"
 *                       feedbackSystem: "Post-stay digital survey"
 *                     safety:
 *                       cctv: true
 *                       emergencyExits: true
 *                       firstAidKits: true
 *                       disasterPlan: true
 *               legalDocuments:
 *                 type: array
 *                 items:
 *                   type: string
 *                   format: binary
 *                 description: Upload legal compliance documents (Max 15MB each).
 *               salarySlips:
 *                 type: string
 *                 format: binary
 *                 description: Upload salary slips evidence (Max 15MB).
 *               staffHandbook:
 *                 type: string
 *                 format: binary
 *                 description: Upload staff handbook evidence (Max 15MB).
 *               hrPolicy:
 *                 type: string
 *                 format: binary
 *                 description: Upload HR policy evidence (Max 15MB).
 *     responses:
 *       201:
 *         description: Hotel created. Please confirm the matching Google Business profile.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 message:
 *                   type: string
 *                   example: "Hotel created successfully. Next, call /hotels/{id}/confirm-match with the selected place_id to complete registration."
 *                 data:
 *                   type: object
 *                   properties:
 *                     hotelId:
 *                       type: string
 *                     candidates:
 *                       type: array
 *                       items:
 *                         type: object
 *                         properties:
 *                           place_id:
 *                             type: string
 *                           title:
 *                             type: string
 *                           address:
 *                             type: string
 *                           confidence:
 *                             type: number
 *       400:
 *         description: Validation error or file too large (Max 15MB)
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       409:
 *         description: Hotel already registered
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 */
router
   .route("/")
   .get(protect, getHotels)
   .post(
      protect,
      authorize("Hotel Owner", "Admin"),
      cpUpload,
      createHotel,
   );

/**
 * @swagger
 * /hotels/{id}:
 *   get:
 *     summary: Get a hotel by ID
 *     tags: [Certification Application Management]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: The hotel ID
 *     responses:
 *       200:
 *         description: Hotel data
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/HotelResponse'
 *       404:
 *         description: Hotel not found
 *   put:
 *     summary: Update a hotel
 *     tags: [Certification Application Management]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: The hotel ID
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             properties:
 *               hotelData:
 *                 type: object
 *                 description: JSON object containing all hotel data to update.
 *                 example:
 *                   businessInfo:
 *                     name: "AYANA Resort Bali (Updated)"
 *                     registrationNumber: "REG-12345"
 *                     licenseNumber: "LIC-67890"
 *                     yearEstablished: 1996
 *                     businessType: "Hotel"
 *                     contact:
 *                       ownerName: "John Doe"
 *                       phone: "+1234567890"
 *                       email: "updated.hotel@example.com"
 *                       website: "https://ayana.com"
 *                       address: "Jimbaran, Bali, Indonesia"
 *                       gps:
 *                         latitude: -8.7915
 *                         longitude: 115.1381
 *                     serpApiPropertyToken: "string"
 *                   employeePractices:
 *                     workforce:
 *                       totalEmployees: 100
 *                       permanentStaff: 80
 *                       temporaryStaff: 20
 *                       femaleEmployeesPercentage: 45
 *                       localEmployeesPercentage: 90
 *                     workerRights:
 *                       minimumWageCompliance: true
 *                       overtimePolicy: "Paid at 1.5x regular rate"
 *                       workingHoursPolicy: "40 hours per week"
 *                       leavePolicy: "20 days annual leave"
 *                       healthInsuranceProvided: true
 *                       unionWorkerCommittee: true
 *                   sustainability:
 *                     resourceUsage:
 *                       monthlyWaterUsage: 50000
 *                       monthlyElectricityUsage: 12000
 *                       fuelUsage: 500
 *                       renewableEnergyPercentage: 30
 *                     wasteManagement:
 *                       wasteSegregation: true
 *                       recyclingProgram: true
 *                       composting: true
 *                       plasticReductionPolicy: "Zero single-use plastics"
 *                     conservation:
 *                       waterSavingDevices: true
 *                       energyEfficientLighting: true
 *                       rainwaterHarvesting: true
 *                       greenLandscaping: true
 *                     certifications:
 *                       - name: "EarthCheck Gold"
 *                         dateReceived: "2023-01-15T00:00:00.000Z"
 *                         expiryDate: "2025-01-15T00:00:00.000Z"
 *                   community:
 *                     localSupport:
 *                       localSupplierPercentage: 70
 *                       localFoodUsagePercentage: 80
 *                       handicraftPromotion: true
 *                       localTourGuides: true
 *                     projects:
 *                       csrProjects: "Beach cleaning initiative every month"
 *                       trainingPrograms: "Hospitality training for local youth"
 *                       scholarshipPrograms: "Annual scholarship for 5 local students"
 *                       donations: "$5000 annually to local orphanage"
 *                     culturalProtection:
 *                       culturalAwarenessTraining: true
 *                       heritageProtectionPolicy: "Protection of local temple on premises"
 *                   guestServices:
 *                     facilities:
 *                       numberOfRooms: 200
 *                       roomTypes: ["Standard", "Deluxe", "Suite"]
 *                       maxCapacity: 450
 *                       accessibilityFeatures: true
 *                     experience:
 *                       averageRating: 4.8
 *                       complaintHandlingPolicy: "Resolution within 24 hours"
 *                       feedbackSystem: "Post-stay digital survey"
 *                     safety:
 *                       cctv: true
 *                       emergencyExits: true
 *                       firstAidKits: true
 *                       disasterPlan: true
 *               legalDocuments:
 *                 type: array
 *                 items:
 *                   type: string
 *                   format: binary
 *               salarySlips:
 *                 type: string
 *                 format: binary
 *               staffHandbook:
 *                 type: string
 *                 format: binary
 *               hrPolicy:
 *                 type: string
 *                 format: binary
 *     responses:
 *       200:
 *         description: Hotel updated successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/HotelResponse'
 *   delete:
 *     summary: Delete a hotel
 *     tags: [Certification Application Management]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: The hotel ID
 *     responses:
 *       200:
 *         description: Hotel deleted successfully
 */
router
   .route("/:id")
   .get(protect, getHotel)
   .put(
      protect,
      authorize("Hotel Owner", "Admin"),
      cpUpload,
      updateHotel,
   )
   .delete(protect, authorize("Admin", "Hotel Owner"), deleteHotel);

/**
 * @swagger
 * /hotels/{id}/confirm-match:
 *   post:
 *     summary: (Step 2) Confirm the Google Business profile match and score the hotel
 *     tags: [Certification Application Management]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: The hotel ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               placeId:
 *                 type: string
 *                 description: The Google place_id of the selected candidate, or null if none matched.
 *                 example: "0x2dd2430f68571fcd:0xda9914e4e153cf28"
 *     responses:
 *       200:
 *         description: Match confirmed and hotel evaluated.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 message:
 *                   type: string
 *                 evaluation:
 *                   type: object
 *                   properties:
 *                     status:
 *                       type: string
 *                     aiScore:
 *                       type: number
 *                     aiJustification:
 *                       type: string
 *                 data:
 *                   type: object
 *                   properties:
 *                     hotel:
 *                       $ref: '#/components/schemas/HotelResponse'
 *                     hotelRequest:
 *                       type: object
 *       404:
 *         description: Hotel not found
 */
router.post(
   "/:id/confirm-match",
   protect,
   authorize("Hotel Owner", "Admin"),
   confirmMatch
);

export default router;
