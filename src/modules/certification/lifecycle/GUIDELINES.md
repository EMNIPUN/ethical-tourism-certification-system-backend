# Lifecycle Module

Handles hotel certification status, expiry tracking, and renewal processes.

> **📚 Important**: Read [Common Guidelines](../../../common/GUIDELINES.md) first for shared utilities and patterns.

## 🌊 Flow & Structure

1.  **Certification Issuance**: After successful audit, hotel receives certification.
2.  **Status Tracking**: System tracks certification status and expiry dates.
3.  **Expiry Notifications**: Automated alerts before certification expires.
4.  **Renewal Process**: Hotel Owner initiates renewal via `POST /api/v1/certification/:id/renew`.

## 📂 Internal Structure

```
lifecycle/
├── controllers/
│   └── lifecycleController.js   # HTTP request handlers
├── services/
│   └── lifecycleService.js      # Status & renewal logic
├── routes/
│   ├── index.js                 # Route aggregator
│   └── lifecycleRoutes.js       # API endpoint definitions
├── validations/
│   └── lifecycleValidation.js   # Joi schemas
└── utils/
    └── notificationHelper.js    # Expiry notification helpers
```

---

## 🔐 Authentication & Authorization

Lifecycle endpoints are restricted by role.

### Route Protection Example

```javascript
import { protect, authorize } from '../../../../common/middleware/authMiddleware.js';

// Public - view certification status
router.get('/:id/status', getCertificationStatus);

// Hotel Owner - request renewal
router.post('/:id/renew', protect, authorize('Hotel Owner'), requestRenewal);

// Admin only - approve/reject renewals, revoke certifications
router.post('/:id/approve', protect, authorize('Admin'), approveRenewal);
router.post('/:id/revoke', protect, authorize('Admin'), revokeCertification);

// Admin - view all expiring certifications
router.get('/expiring', protect, authorize('Admin'), getExpiringCertifications);
```

---

## ✅ Validation

### Renewal Request Schema

```javascript
// validations/lifecycleValidation.js
import Joi from 'joi';

export const renewalRequestSchema = Joi.object({
    reason: Joi.string().max(500),
    updatedDocuments: Joi.array().items(
        Joi.object({
            documentType: Joi.string().required(),
            fileUrl: Joi.string().uri().required(),
            expiryDate: Joi.date().iso()
        })
    )
});

export const revocationSchema = Joi.object({
    reason: Joi.string().required().min(10).max(1000),
    effectiveDate: Joi.date().iso().default(() => new Date())
});
```

### Applying to Routes

```javascript
import { validate } from '../../../../common/middleware/validate.js';
import { renewalRequestSchema, revocationSchema } from '../validations/lifecycleValidation.js';

router.post('/:id/renew', protect, authorize('Hotel Owner'), validate(renewalRequestSchema), requestRenewal);
router.post('/:id/revoke', protect, authorize('Admin'), validate(revocationSchema), revokeCertification);
```

---

## ⚠️ Error Handling

### Controller Example

```javascript
import asyncHandler from '../../../../common/utils/asyncHandler.js';

export const requestRenewal = asyncHandler(async (req, res) => {
    const { id } = req.params;
    const userId = req.user.id;
    
    // Verify ownership
    const hotel = await Hotel.findById(id);
    if (!hotel) {
        res.status(404);
        throw new Error('Hotel not found');
    }
    
    // Check if already pending
    const existingRequest = await lifecycleService.getPendingRenewal(id);
    if (existingRequest) {
        res.status(400);
        throw new Error('Renewal request already pending');
    }
    
    const renewal = await lifecycleService.createRenewalRequest(id, req.body);
    res.status(201).json({ success: true, data: renewal });
});
```

---

## 📖 Swagger Documentation

### Get Certification Status (Public)

```javascript
/**
 * @swagger
 * /certification/{id}/status:
 *   get:
 *     summary: Get hotel certification status (public)
 *     tags: [Certification Lifecycle]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Hotel ID
 *     responses:
 *       200:
 *         description: Certification status
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   type: object
 *                   properties:
 *                     level:
 *                       type: string
 *                       enum: [None, Bronze, Silver, Gold]
 *                     issuedDate:
 *                       type: string
 *                       format: date
 *                     expiryDate:
 *                       type: string
 *                       format: date
 *                     status:
 *                       type: string
 *                       enum: [Active, Expired, Revoked, Pending]
 *       404:
 *         description: Hotel not found
 */
router.get('/:id/status', getCertificationStatus);
```

### Request Renewal (Hotel Owner)

```javascript
/**
 * @swagger
 * /certification/{id}/renew:
 *   post:
 *     summary: Request certification renewal
 *     tags: [Certification Lifecycle]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/RenewalRequest'
 *     responses:
 *       201:
 *         description: Renewal request submitted
 *       400:
 *         description: Renewal already pending
 *       401:
 *         description: Not authenticated
 *       403:
 *         description: Not the hotel owner
 */
router.post('/:id/renew', protect, authorize('Hotel Owner'), validate(renewalRequestSchema), requestRenewal);
```

---

## 🛡️ Development Rules

1. **Use `asyncHandler`** for all async controllers
2. **Use `protect`** for authenticated endpoints
3. **Use `authorize('Hotel Owner')`** for renewal requests
4. **Use `authorize('Admin')`** for approval/revocation
5. **Keep certification status endpoint public** for transparency
6. **Add Swagger annotations** to all endpoints
7. **Use shared `Hotel` model** from `common/models`
