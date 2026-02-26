# Common Modules & Guidelines

This directory contains shared resources that must be used across all feature modules to ensure consistency and maintainability.

## 📚 Available Common Resources

### 1. Utilities (`src/common/utils/`)
*   **`asyncHandler(fn)`**: Wraps async controller functions to automatically catch errors and pass them to the global error handler.

### 2. Middleware (`src/common/middleware/`)
*   **`errorMiddleware`**: Global error handler. Returns standardized JSON response.
*   **`validate(schema)`**: Generic validation middleware for Joi schemas.
*   **`protect`**: JWT authentication middleware.
*   **`authorize(...roles)`**: Role-based access control middleware.

### 3. Configuration (`src/common/config/`)
*   **`db.js`**: Database connection logic.
*   **`swagger.js`**: Swagger/OpenAPI configuration.

### 4. Models (`src/common/models/`)
*   **`Hotel.js`**: Central Mongoose model for Hotel data.
*   **`User.js`**: User authentication model.

### 5. Auth (`src/common/controllers/` & `src/common/routes/`)
*   **`authController.js`**: Register, Login, GetMe endpoints.
*   **`authRoutes.js`**: Auth route definitions.

---

## 🔐 Authentication Middleware

### `protect` - JWT Verification

Verifies the JWT token from the `Authorization` header and adds `req.user`.

```javascript
import { protect } from '../../../common/middleware/authMiddleware.js';

// Single protected route
router.get('/profile', protect, profileController);

// Protect entire router
router.use(protect);  // All routes below this are protected
```

### `authorize(...roles)` - Role-Based Access Control

Restricts access to specific user roles. **Must be used after `protect`**.

**Available Roles**: `Admin`, `Hotel Owner`, `Auditor`, `Tourist`

```javascript
import { protect, authorize } from '../../../common/middleware/authMiddleware.js';

// Only Admin can access
router.delete('/:id', protect, authorize('Admin'), deleteController);

// Multiple roles allowed
router.get('/', protect, authorize('Admin', 'Hotel Owner'), listController);
```

### Example: Complete Route Protection

```javascript
import { protect, authorize } from '../../../common/middleware/authMiddleware.js';

// Public routes (no auth)
router.get('/', getPublicData);

// Authenticated routes (any logged-in user)
router.get('/me', protect, getMyData);

// Role-specific routes
router.post('/', protect, authorize('Hotel Owner'), createHotel);
router.put('/:id', protect, authorize('Hotel Owner', 'Admin'), updateHotel);
router.delete('/:id', protect, authorize('Admin'), deleteHotel);
```

---

## ✅ Validation with Joi

### Creating Validation Schemas

Place schemas in your module's `validations/` folder:

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
    }).required()
});

export const updateHotelSchema = Joi.object({
    businessInfo: Joi.object({
        name: Joi.string()
        // ... partial fields allowed
    })
}).min(1);  // At least one field required
```

### Using Validation Middleware

```javascript
import { validate } from '../../../common/middleware/validate.js';
import { createHotelSchema, updateHotelSchema } from '../validations/hotelValidation.js';

router.post('/', protect, validate(createHotelSchema), createHotel);
router.put('/:id', protect, validate(updateHotelSchema), updateHotel);
```

### Inline Validation in Controllers

For simple validations or custom error messages:

```javascript
import { createHotelSchema } from '../validations/hotelValidation.js';

export const createHotel = asyncHandler(async (req, res) => {
    const { error } = createHotelSchema.validate(req.body);
    if (error) {
        return res.status(400).json({ 
            success: false, 
            error: error.details[0].message 
        });
    }
    // Continue with business logic...
});
```

---

## ⚠️ Error Handling

### Using `asyncHandler`

Wrap all async controllers with `asyncHandler` to automatically catch errors:

```javascript
import asyncHandler from '../../../common/utils/asyncHandler.js';

// ✅ Correct - errors auto-forwarded to error middleware
export const getHotel = asyncHandler(async (req, res) => {
    const hotel = await Hotel.findById(req.params.id);
    if (!hotel) {
        res.status(404);
        throw new Error('Hotel not found');
    }
    res.json({ success: true, data: hotel });
});

// ❌ Wrong - manual try-catch not needed
export const getHotel = async (req, res, next) => {
    try {
        // ...
    } catch (err) {
        next(err);  // Don't do this, use asyncHandler
    }
};
```

### Throwing Errors with Status Codes

```javascript
// Set status before throwing
res.status(404);
throw new Error('Hotel not found');

// Or create error with statusCode property
const error = new Error('Duplicate entry');
error.statusCode = 409;
throw error;
```

### Error Response Format

All errors return this format:

```json
{
    "success": false,
    "error": "Error message here"
}
```

In development mode, a `stack` trace is also included.

---

## 📖 Swagger Documentation

### Adding Swagger to Routes

Add JSDoc comments above your route definitions:

```javascript
/**
 * @swagger
 * /hotels:
 *   get:
 *     summary: Get all hotels
 *     tags: [Hotels]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *         description: Max results to return
 *     responses:
 *       200:
 *         description: List of hotels
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/Hotel'
 *       401:
 *         description: Not authorized
 */
router.get('/', protect, getHotels);
```

### Defining Reusable Schemas

Place in `src/common/swagger/` or at the top of route files:

```javascript
/**
 * @swagger
 * components:
 *   schemas:
 *     Hotel:
 *       type: object
 *       required:
 *         - businessInfo
 *       properties:
 *         _id:
 *           type: string
 *         businessInfo:
 *           type: object
 *           properties:
 *             name:
 *               type: string
 *             businessType:
 *               type: string
 *               enum: [Hotel, Resort, Lodge, Guesthouse]
 *   securitySchemes:
 *     bearerAuth:
 *       type: http
 *       scheme: bearer
 *       bearerFormat: JWT
 */
```

### Common Swagger Patterns

**POST with Request Body:**
```javascript
/**
 * @swagger
 * /hotels:
 *   post:
 *     summary: Create a hotel
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
 *       201:
 *         description: Hotel created
 *       400:
 *         description: Validation error
 */
```

**GET with Path Parameter:**
```javascript
/**
 * @swagger
 * /hotels/{id}:
 *   get:
 *     summary: Get hotel by ID
 *     tags: [Hotels]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Hotel ID
 *     responses:
 *       200:
 *         description: Hotel found
 *       404:
 *         description: Hotel not found
 */
```

### Accessing Swagger UI

Start the server and visit: **http://localhost:5000/api/v1/api-docs**

---

## 🛡️ Development Rules Summary

1. **Use `asyncHandler`** for all async controllers
2. **Use `protect`** for authenticated routes
3. **Use `authorize()`** after `protect` for role restrictions
4. **Use Joi** for all request validation
5. **Use Swagger annotations** for all API endpoints
6. **Models in `common/models/`** - no duplicate models
7. **No hardcoded values** - use config files
