/**
 * @swagger
 * components:
 *   schemas:
 *     HotelBase:
 *       type: object
 *       required:
 *         - businessInfo
 *         - guestServices
 *       properties:
 *         businessInfo:
 *           type: object
 *           properties:
 *             name:
 *               type: string
 *               description: The name of the hotel
 *             registrationNumber:
 *               type: string
 *             licenseNumber:
 *               type: string
 *             brand:
 *               type: string
 *             businessType:
 *               type: string
 *               enum: [Hotel, Resort, Lodge, Guesthouse]
 *             contact:
 *               type: object
 *               properties:
 *                 ownerName:
 *                   type: string
 *                 phone:
 *                   type: string
 *                 email:
 *                   type: string
 *                 address:
 *                   type: string
 *         guestServices:
 *           type: object
 *           properties:
 *             facilities:
 *               type: object
 *               properties:
 *                 numberOfRooms:
 *                   type: number
 *                 roomTypes:
 *                   type: array
 *                   items:
 *                     type: string
 *                 maxCapacity:
 *                   type: number
 *                 accessibilityFeatures:
 *                   type: boolean
 *             experience:
 *               type: object
 *               properties:
 *                 averageRating:
 *                   type: number
 *                 complaintHandlingPolicy:
 *                   type: string
 *                 feedbackSystem:
 *                   type: string
 *             safety:
 *               type: object
 *               properties:
 *                 cctv:
 *                   type: boolean
 *                 emergencyExits:
 *                   type: boolean
 *                 firstAidKits:
 *                   type: boolean
 *                 disasterPlan:
 *                   type: boolean
 *         legalDocuments:
 *           type: array
 *           items:
 *             type: object
 *             properties:
 *               documentName:
 *                 type: string
 *               type:
 *                 type: string
 *               issueDate:
 *                 type: string
 *                 format: date
 *               expiryDate:
 *                 type: string
 *                 format: date
 *               issuingAuthority:
 *                 type: string
 *               fileUrl:
 *                 type: string
 *         employeePractices:
 *           type: object
 *           properties:
 *             workforce:
 *               type: object
 *               properties:
 *                 totalEmployees:
 *                   type: number
 *                 permanentStaff:
 *                   type: number
 *                 temporaryStaff:
 *                   type: number
 *                 femaleEmployeesPercentage:
 *                   type: number
 *                 localEmployeesPercentage:
 *                   type: number
 *             workerRights:
 *               type: object
 *               properties:
 *                 minimumWageCompliance:
 *                   type: boolean
 *                 overtimePolicy:
 *                   type: string
 *                 workingHoursPolicy:
 *                   type: string
 *                 leavePolicy:
 *                   type: string
 *                 healthInsuranceProvided:
 *                   type: boolean
 *                 unionWorkerCommittee:
 *                   type: boolean
 *             evidence:
 *               type: object
 *               properties:
 *                 salarySlipsUrl:
 *                   type: string
 *                 staffHandbookUrl:
 *                   type: string
 *                 hrPolicyUrl:
 *                   type: string
 *         sustainability:
 *           type: object
 *           properties:
 *             resourceUsage:
 *               type: object
 *               properties:
 *                 monthlyWaterUsage:
 *                   type: number
 *                 monthlyElectricityUsage:
 *                   type: number
 *                 fuelUsage:
 *                   type: number
 *                 renewableEnergyPercentage:
 *                   type: number
 *             wasteManagement:
 *               type: object
 *               properties:
 *                 wasteSegregation:
 *                   type: boolean
 *                 recyclingProgram:
 *                   type: boolean
 *                 composting:
 *                   type: boolean
 *                 plasticReductionPolicy:
 *                   type: string
 *             conservation:
 *               type: object
 *               properties:
 *                 waterSavingDevices:
 *                   type: boolean
 *                 energyEfficientLighting:
 *                   type: boolean
 *                 rainwaterHarvesting:
 *                   type: boolean
 *                 greenLandscaping:
 *                   type: boolean
 *             certifications:
 *               type: array
 *               items:
 *                 type: object
 *                 properties:
 *                   name:
 *                     type: string
 *                   dateReceived:
 *                     type: string
 *                     format: date
 *                   expiryDate:
 *                     type: string
 *                     format: date
 *         community:
 *           type: object
 *           properties:
 *             localSupport:
 *               type: object
 *               properties:
 *                 localSupplierPercentage:
 *                   type: number
 *                 localFoodUsagePercentage:
 *                   type: number
 *                 handicraftPromotion:
 *                   type: boolean
 *                 localTourGuides:
 *                   type: boolean
 *             projects:
 *               type: object
 *               properties:
 *                 csrProjects:
 *                   type: string
 *                 trainingPrograms:
 *                   type: string
 *                 scholarshipPrograms:
 *                   type: string
 *                 donations:
 *                   type: string
 *             culturalProtection:
 *               type: object
 *               properties:
 *                 culturalAwarenessTraining:
 *                   type: boolean
 *                 heritageProtectionPolicy:
 *                   type: string
 *
 *     HotelRequest:
 *       allOf:
 *         - $ref: '#/components/schemas/HotelBase'
 *
 *     Hotel:
 *       allOf:
 *         - $ref: '#/components/schemas/HotelBase'
 *         - type: object
 *           properties:
 *             _id:
 *               type: string
 *             createdAt:
 *               type: string
 *               format: date-time
 *             updatedAt:
 *               type: string
 *               format: date-time
 *             scoring:
 *               type: object
 *               properties:
 *                 dataCompletionScore:
 *                   type: number
 *                 googleRating:
 *                   type: number
 *                 googleReviewScore:
 *                   type: number
 *                 auditorScore:
 *                   type: number
 *                 totalScore:
 *                   type: number
 *                 certificationLevel:
 *                   type: string
 *                   enum: [None, Bronze, Silver, Gold]
 *
 *     ApiResponse:
 *       type: object
 *       properties:
 *         success:
 *           type: boolean
 *         data:
 *           type: object
 *         error:
 *           type: string
 *
 *     ErrorResponse:
 *       type: object
 *       properties:
 *         success:
 *           type: boolean
 *           example: false
 *         error:
 *           type: string
 *           example: "Validation Error: \"scoring\" is not allowed"
 * 
 *     HotelListResponse:
 *       type: object
 *       properties:
 *         success:
 *           type: boolean
 *           example: true
 *         count:
 *           type: integer
 *           example: 10
 *         data:
 *           type: array
 *           items:
 *             $ref: '#/components/schemas/Hotel'
 * 
 *     HotelResponse:
 *       type: object
 *       properties:
 *         success:
 *           type: boolean
 *           example: true
 *         data:
 *           $ref: '#/components/schemas/Hotel'
 * 
 *     HotelCreateResponse:
 *       type: object
 *       properties:
 *         success:
 *           type: boolean
 *           example: true
 *         data:
 *           type: object
 *           properties:
 *             _id:
 *               type: string
 *             name:
 *               type: string
 *             address:
 *               type: string
 *             googleRating:
 *               type: number
 *             totalScore:
 *               type: number
 *         match:
 *           type: object
 *           properties:
 *             name:
 *               type: string
 *             address:
 *               type: string
 *             rating:
 *               type: number
 *             token:
 *               type: string
 *             thumbnail:
 *               type: string
 *             matchScore:
 *               type: number
 *         message:
 *           type: string
 * 
 *       example:
 *         businessInfo:
 *           name: "Grand Hotel"
 *           registrationNumber: "REG123456"
 *           licenseNumber: "LIC123456"
 *           yearEstablished: 1990
 *           businessType: "Hotel"
 *           serpApiPropertyToken: "A1B2C3D4"
 *           contact:
 *             ownerName: "John Doe"
 *             phone: "+1234567890"
 *             email: "info@grandhotel.com"
 *             website: "https://www.grandhotel.com"
 *             address: "123 Grand St"
 *             gps:
 *               latitude: 40.7128
 *               longitude: -74.0060
 *         guestServices:
 *           facilities:
 *             numberOfRooms: 100
 *             roomTypes: ["Standard", "Deluxe", "Suite"]
 *             maxCapacity: 250
 *             accessibilityFeatures: true
 *           experience:
 *             averageRating: 4.5
 *             complaintHandlingPolicy: "24-hour resolution guarantee"
 *             feedbackSystem: "Digital survey upon checkout"
 *           safety:
 *             cctv: true
 *             emergencyExits: true
 *             firstAidKits: true
 *             disasterPlan: true
 *         legalDocuments:
 *           - documentName: "Business Registration"
 *             type: "Registration"
 *             issueDate: "2020-01-01"
 *             expiryDate: "2025-01-01"
 *             issuingAuthority: "City Council"
 *             fileUrl: "https://example.com/docs/reg.pdf"
 *         employeePractices:
 *           workforce:
 *             totalEmployees: 50
 *             permanentStaff: 40
 *             temporaryStaff: 10
 *             femaleEmployeesPercentage: 50
 *             localEmployeesPercentage: 80
 *           workerRights:
 *             minimumWageCompliance: true
 *             overtimePolicy: "Paid at 1.5x rate"
 *             workingHoursPolicy: "40 hours per week"
 *             leavePolicy: "20 days annual leave"
 *             healthInsuranceProvided: true
 *             unionWorkerCommittee: true
 *           evidence:
 *             salarySlipsUrl: "https://example.com/docs/salary.pdf"
 *             staffHandbookUrl: "https://example.com/docs/handbook.pdf"
 *             hrPolicyUrl: "https://example.com/docs/hr.pdf"
 *         sustainability:
 *           resourceUsage:
 *             monthlyWaterUsage: 50000
 *             monthlyElectricityUsage: 15000
 *             fuelUsage: 500
 *             renewableEnergyPercentage: 20
 *           wasteManagement:
 *             wasteSegregation: true
 *             recyclingProgram: true
 *             composting: true
 *             plasticReductionPolicy: "No single-use plastics"
 *           conservation:
 *             waterSavingDevices: true
 *             energyEfficientLighting: true
 *             rainwaterHarvesting: true
 *             greenLandscaping: true
 *           certifications:
 *             - name: "Green Globe"
 *               dateReceived: "2022-06-15"
 *               expiryDate: "2025-06-15"
 *         community:
 *           localSupport:
 *             localSupplierPercentage: 75
 *             localFoodUsagePercentage: 60
 *             handicraftPromotion: true
 *             localTourGuides: true
 *           projects:
 *             csrProjects: "Local school support program"
 *             trainingPrograms: "Hospitality internship for locals"
 *             scholarshipPrograms: "Annual scholarship for 2 students"
 *             donations: "$5000 annually to local charity"
 *           culturalProtection:
 *             culturalAwarenessTraining: true
 *             heritageProtectionPolicy: "Strict adherence to local heritage laws"
 */
