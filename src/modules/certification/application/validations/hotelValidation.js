import Joi from 'joi';

/**
 * validations/hotelValidation.js
 * 
 * Joi schemas for validating hotel-related requests.
 */

const contactSchema = Joi.object({
    ownerName: Joi.string().required(),
    phone: Joi.string().required(),
    email: Joi.string().email().required(),
    address: Joi.string().required(),
    gps: Joi.object({
        latitude: Joi.number(),
        longitude: Joi.number()
    })
});

const facilitiesSchema = Joi.object({
    numberOfRooms: Joi.number().required(),
    roomTypes: Joi.array().items(Joi.string()),
    maxCapacity: Joi.number(),
    accessibilityFeatures: Joi.boolean()
});

const guestServicesSchema = Joi.object({
    facilities: facilitiesSchema.required(),
    wifi: Joi.boolean(),
    reception24Hour: Joi.boolean(),
    roomService: Joi.boolean(),
    laundry: Joi.boolean(),
    parking: Joi.boolean(),
    experience: Joi.object().unknown(true),
    safety: Joi.object().unknown(true)
});

// Create Hotel Schema
export const createHotelSchema = Joi.object({
    businessInfo: Joi.object({
        name: Joi.string().required(),
        registrationNumber: Joi.string().required(),
        licenseNumber: Joi.string(),
        brand: Joi.string(),
        businessType: Joi.string().valid('Hotel', 'Resort', 'Lodge', 'Guesthouse').required(),
        contact: contactSchema.required()
    }).required(),
    guestServices: guestServicesSchema.required(),
    employeePractices: Joi.object().unknown(true),
    sustainability: Joi.object({
        resourceUsage: Joi.object().unknown(true),
        wasteManagement: Joi.object().unknown(true),
        conservation: Joi.object().unknown(true),
        certifications: Joi.array().items(
            Joi.object({
                name: Joi.string().required(),
                dateReceived: Joi.string().isoDate(),
                expiryDate: Joi.string().isoDate()
            }).unknown(true)
        )
    }).unknown(true),
    community: Joi.object({
        localSupport: Joi.object().unknown(true),
        projects: Joi.object().unknown(true),
        culturalProtection: Joi.object().unknown(true)
    }).unknown(true),
    legalDocuments: Joi.array().items(Joi.object().unknown(true))
});

// Update Hotel Schema (partial updates allowed)
export const updateHotelSchema = Joi.object({
    businessInfo: Joi.object({
        name: Joi.string(),
        registrationNumber: Joi.string(),
        licenseNumber: Joi.string(),
        businessType: Joi.string().valid('Hotel', 'Resort', 'Lodge', 'Guesthouse'),
        contact: contactSchema
    }),
    guestServices: guestServicesSchema,
    employeePractices: Joi.object().unknown(true),
    sustainability: Joi.object().unknown(true),
    community: Joi.object().unknown(true),
    legalDocuments: Joi.array().items(Joi.object().unknown(true)),
    scoring: Joi.object().unknown(true) // Allow manual score updates if needed (e.g. auditor)
}).min(1);

// Confirm Match Schema
export const confirmMatchSchema = Joi.object({
    property_token: Joi.string().allow(null).required()
});
