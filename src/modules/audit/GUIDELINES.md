# Audit Module

Handles audit reviews, compliance checks, and auditor score assignments.

> **📚 Important**: Read [Common Guidelines](../../common/GUIDELINES.md) first for shared utilities and patterns.

## 🌊 Flow & Structure

1.  **Audit Assignment**: Admin assigns an auditor to a certified hotel.
2.  **On-site Review**: Auditor visits and evaluates the hotel.
3.  **Score Submission**: Auditor submits scores via `POST /api/v1/audits/:hotelId/score`.
4.  **Score Integration**: System updates hotel's `auditorScore` and recalculates total.

## 📂 Internal Structure

```
audit/
├── controllers/
│   └── auditController.js    # HTTP request handlers
├── services/
│   └── auditService.js       # Audit business logic
├── routes/
│   ├── index.js              # Route aggregator
│   └── auditRoutes.js        # API endpoint definitions
├── validations/
│   └── auditValidation.js    # Joi schemas
└── models/
    └── Audit.js              # Audit record model (optional)
```

---

## 🔐 Authentication & Authorization

Audit endpoints are role-restricted to **Admin** and **Auditor**.

### Route Protection Example

```javascript
import { protect, authorize } from '../../../common/middleware/authMiddleware.js';

// Admin only - assign auditors
router.post('/assign', protect, authorize('Admin'), assignAuditor);

// Auditor only - submit scores
router.post('/:hotelId/score', protect, authorize('Auditor'), submitAuditScore);

// Admin and Auditor - view audits
router.get('/', protect, authorize('Admin', 'Auditor'), getAudits);
router.get('/:id', protect, authorize('Admin', 'Auditor'), getAudit);
```

---

## ✅ Validation

### Audit Score Schema

```javascript
// validations/auditValidation.js
import Joi from 'joi';

export const submitScoreSchema = Joi.object({
    overallScore: Joi.number().min(0).max(100).required(),
    categories: Joi.object({
        cleanliness: Joi.number().min(0).max(20),
        sustainability: Joi.number().min(0).max(20),
        employeePractices: Joi.number().min(0).max(20),
        community: Joi.number().min(0).max(20),
        documentation: Joi.number().min(0).max(20)
    }),
    comments: Joi.string().max(2000),
    recommendCertification: Joi.boolean().required()
});

export const assignAuditorSchema = Joi.object({
    hotelId: Joi.string().required(),
    auditorId: Joi.string().required(),
    scheduledDate: Joi.date().iso().min('now').required()
});
```

### Applying to Routes

```javascript
import { validate } from '../../../common/middleware/validate.js';
import { submitScoreSchema, assignAuditorSchema } from '../validations/auditValidation.js';

router.post('/assign', protect, authorize('Admin'), validate(assignAuditorSchema), assignAuditor);
router.post('/:hotelId/score', protect, authorize('Auditor'), validate(submitScoreSchema), submitAuditScore);
```

---

## ⚠️ Error Handling

### Controller Example

```javascript
import asyncHandler from '../../../common/utils/asyncHandler.js';

export const submitAuditScore = asyncHandler(async (req, res) => {
    const { hotelId } = req.params;
    const auditorId = req.user.id;  // From protect middleware
    
    // Verify auditor is assigned to this hotel
    const assignment = await auditService.getAssignment(hotelId, auditorId);
    if (!assignment) {
        res.status(403);
        throw new Error('You are not assigned to audit this hotel');
    }
    
    const result = await auditService.submitScore(hotelId, req.body);
    res.json({ success: true, data: result });
});
```

---

## 📖 Swagger Documentation

### Submit Audit Score

```javascript
/**
 * @swagger
 * /audits/{hotelId}/score:
 *   post:
 *     summary: Submit audit score for a hotel
 *     tags: [Audits]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: hotelId
 *         required: true
 *         schema:
 *           type: string
 *         description: Hotel ID to audit
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/AuditScore'
 *     responses:
 *       200:
 *         description: Score submitted successfully
 *       401:
 *         description: Not authenticated
 *       403:
 *         description: Not authorized (not assigned auditor)
 *       404:
 *         description: Hotel not found
 */
router.post('/:hotelId/score', protect, authorize('Auditor'), validate(submitScoreSchema), submitAuditScore);
```

---

## 🛡️ Development Rules

1. **Use `asyncHandler`** for all async controllers
2. **Use `protect`** for all audit endpoints
3. **Use `authorize('Admin')`** for assignment operations
4. **Use `authorize('Auditor')`** for score submission
5. **Verify auditor assignment** before accepting scores
6. **Add Swagger annotations** to all endpoints
7. **Use shared `Hotel` model** from `common/models`
