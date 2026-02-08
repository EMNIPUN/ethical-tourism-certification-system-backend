# Application Module (Certification)

Handles the core hotel application process, including CRUD operations and verification.

> **📚 Important**: Read [Common Guidelines](../../../common/GUIDELINES.md) first for shared utilities and patterns.

## 🌊 Flow & Structure

1.  **Application**: A `Hotel` creates an entry via `POST /api/v1/hotels` (`hotelController.createHotel`).
2.  **Scoring**: The system (`scoringService`) calculates internal scores based on data completeness (facilities, policies).
3.  **Verification**: The system (`ratingService`) searches for matching Google listings.
4.  **Confirmation**: The user confirms the match (`POST /api/v1/hotels/:id/confirm`), triggering score finalization.

## 📂 Internal Structure

```
application/
├── controllers/
│   └── hotelController.js    # HTTP request handlers
├── services/
│   ├── hotelService.js       # CRUD operations
│   ├── scoringService.js     # Score calculations
│   ├── ratingService.js      # Google search integration
│   └── verificationService.js # Match confirmation
├── routes/
│   ├── index.js              # Route aggregator
│   └── hotelRoutes.js        # API endpoint definitions
├── validations/
│   └── hotelValidation.js    # Joi schemas
└── models/
    └── MatchLog.js           # Match history
```

---

## 🔐 Authentication & Authorization

This module requires authentication for most endpoints.

### Route Protection Example

```javascript
import { protect, authorize } from '../../../../common/middleware/authMiddleware.js';

// Public - no auth
router.get('/', getHotels);

// Authenticated - any logged-in user
router.get('/:id', protect, getHotel);

// Role-specific - Hotel Owner or Admin only
router.post('/', protect, authorize('Hotel Owner', 'Admin'), createHotel);
router.put('/:id', protect, authorize('Hotel Owner', 'Admin'), updateHotel);
router.delete('/:id', protect, authorize('Admin'), deleteHotel);
router.post('/:id/confirm', protect, authorize('Hotel Owner', 'Admin'), confirmMatch);
```

---

## ✅ Validation

### Using Joi Schemas

```javascript
// validations/hotelValidation.js
import Joi from 'joi';

export const createHotelSchema = Joi.object({
    businessInfo: Joi.object({
        name: Joi.string().required(),
        registrationNumber: Joi.string().required(),
        licenseNumber: Joi.string().required(),
        businessType: Joi.string().valid('Hotel', 'Resort', 'Lodge', 'Guesthouse').required(),
        contact: Joi.object({
            ownerName: Joi.string().required(),
            phone: Joi.string().required(),
            email: Joi.string().email().required(),
            address: Joi.string().required()
        }).required()
    }).required(),
    guestServices: Joi.object({
        facilities: Joi.object({
            numberOfRooms: Joi.number().required()
        }).required()
    }).required()
});
```

### Applying to Routes

```javascript
import { validate } from '../../../../common/middleware/validate.js';
import { createHotelSchema } from '../validations/hotelValidation.js';

router.post('/', protect, validate(createHotelSchema), createHotel);
```

---

## ⚠️ Error Handling

### Using asyncHandler

```javascript
import asyncHandler from '../../../../common/utils/asyncHandler.js';

export const createHotel = asyncHandler(async (req, res) => {
    const hotel = await hotelService.createHotel(req.body);
    
    if (!hotel) {
        res.status(400);
        throw new Error('Failed to create hotel');
    }
    
    res.status(202).json({ success: true, data: hotel });
});
```

### Custom Error Codes

```javascript
// In service layer - throw with statusCode
const error = new Error('Hotel already registered');
error.statusCode = 409;
throw error;
```

---

## 📖 Swagger Documentation

### Endpoint Documentation

```javascript
/**
 * @swagger
 * /hotels:
 *   post:
 *     summary: Create a new hotel application
 *     tags: [Hotels]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/CreateHotelInput'
 *     responses:
 *       202:
 *         description: Hotel created, awaiting match confirmation
 *       400:
 *         description: Validation error
 *       401:
 *         description: Not authenticated
 *       403:
 *         description: Not authorized (wrong role)
 */
router.post('/', protect, authorize('Hotel Owner'), validate(createHotelSchema), createHotel);
```

---

## 🛡️ Development Rules

1. **Use `asyncHandler`** for all async controllers
2. **Use `protect`** for authenticated routes
3. **Use `authorize()`** for role restrictions
4. **Use Joi** schemas in `validations/`
5. **Add Swagger annotations** to all endpoints
6. **Use shared `Hotel` model** from `common/models`
