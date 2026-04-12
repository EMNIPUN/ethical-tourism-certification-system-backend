import mongoose from 'mongoose';

const HotelSchema = new mongoose.Schema({
    // Owner reference (used for access control and owner dashboards)
    ownerUserId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: false,
        index: true,
    },
    // 1. Basic Business Information
    businessInfo: {
        name: { type: String, required: true },
        registrationNumber: { type: String, required: true },
        licenseNumber: { type: String, required: true },
        yearEstablished: { type: Number },
        businessType: {
            type: String,
            enum: ['Hotel', 'Resort', 'Lodge', 'Guesthouse'],
            required: true
        },
        contact: {
            ownerName: { type: String, required: true },
            phone: { type: String, required: true },
            email: { type: String, required: true },
            website: { type: String },
            address: { type: String, required: true },
            gps: {
                latitude: { type: Number },
                longitude: { type: Number }
            }
        },
        serpApiPropertyToken: { type: String }
    },

    // Google Maps specific metadata saved upon user confirmation
    googleMapsData: {
        placeId: { type: String },
        thumbnail: { type: String },
        address: { type: String },
        gps: {
            latitude: { type: Number },
            longitude: { type: Number }
        }
    },

    // 2. Legal & Compliance Documents
    legalDocuments: [{
        documentName: { type: String, required: true },
        type: { type: String }, // e.g., 'Business Registration', 'Fire Safety'
        issueDate: { type: Date },
        expiryDate: { type: Date },
        issuingAuthority: { type: String },
        file: {
            data: Buffer,
            contentType: String
        }
    }],

    // 3. Employee & Labor Practices
    employeePractices: {
        workforce: {
            totalEmployees: { type: Number },
            permanentStaff: { type: Number },
            temporaryStaff: { type: Number },
            femaleEmployeesPercentage: { type: Number },
            localEmployeesPercentage: { type: Number }
        },
        workerRights: {
            minimumWageCompliance: { type: Boolean, default: false },
            overtimePolicy: { type: String },
            workingHoursPolicy: { type: String },
            leavePolicy: { type: String },
            healthInsuranceProvided: { type: Boolean, default: false },
            unionWorkerCommittee: { type: Boolean, default: false }
        },
        evidence: {
            salarySlips: { data: Buffer, contentType: String },
            staffHandbook: { data: Buffer, contentType: String },
            hrPolicy: { data: Buffer, contentType: String }
        }
    },

    // 4. Environmental & Sustainability Practices
    sustainability: {
        resourceUsage: {
            monthlyWaterUsage: { type: Number }, // Unit? Assuming liters or m3
            monthlyElectricityUsage: { type: Number }, // Unit? Assuming kWh
            fuelUsage: { type: Number },
            renewableEnergyPercentage: { type: Number }
        },
        wasteManagement: {
            wasteSegregation: { type: Boolean, default: false },
            recyclingProgram: { type: Boolean, default: false },
            composting: { type: Boolean, default: false },
            plasticReductionPolicy: { type: String }
        },
        conservation: {
            waterSavingDevices: { type: Boolean, default: false },
            energyEfficientLighting: { type: Boolean, default: false },
            rainwaterHarvesting: { type: Boolean, default: false },
            greenLandscaping: { type: Boolean, default: false }
        },
        certifications: [{
            name: { type: String }, // ISO 14001, Green Globe, etc.
            dateReceived: { type: Date },
            expiryDate: { type: Date }
        }]
    },

    // 5. Community & Social Responsibility
    community: {
        localSupport: {
            localSupplierPercentage: { type: Number },
            localFoodUsagePercentage: { type: Number },
            handicraftPromotion: { type: Boolean, default: false },
            localTourGuides: { type: Boolean, default: false }
        },
        projects: {
            csrProjects: { type: String },
            trainingPrograms: { type: String },
            scholarshipPrograms: { type: String },
            donations: { type: String }
        },
        culturalProtection: {
            culturalAwarenessTraining: { type: Boolean, default: false },
            heritageProtectionPolicy: { type: String }
        }
    },

    // 6. Guest & Service Quality Data
    guestServices: {
        facilities: {
            numberOfRooms: { type: Number, required: true },
            roomTypes: [{ type: String }],
            maxCapacity: { type: Number },
            accessibilityFeatures: { type: Boolean, default: false }
        },
        experience: {
            averageRating: { type: Number, min: 0, max: 5 },
            complaintHandlingPolicy: { type: String },
            feedbackSystem: { type: String }
        },
        safety: {
            cctv: { type: Boolean, default: false },
            emergencyExits: { type: Boolean, default: false },
            firstAidKits: { type: Boolean, default: false },
            disasterPlan: { type: Boolean, default: false }
        }
    },
    scoring: {
        dataCompletionScore: {
            type: Number,
            default: 0
        },
        googleRating: {
            type: Number,
            default: 0,
            min: 0,
            max: 5
        },
        googleReviewScore: {
            type: Number,
            default: 0
        },
        aiReviewJustification: {
            type: String,
            default: ''
        },
        auditorScore: {
            type: Number,
            default: 0
        },
        totalScore: {
            type: Number,
            default: 0
        },
        certificationLevel: {
            type: String,
            enum: ['None', 'Bronze', 'Silver', 'Gold'],
            default: 'None'
        }
    }
}, {
    timestamps: true
});

const Hotel = mongoose.model('Hotel', HotelSchema);

export default Hotel;
