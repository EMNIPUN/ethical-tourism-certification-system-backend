# Search Module

Handles external search functionality to find hotels and retrieve Google ratings.

> **📚 Important**: Read [Common Guidelines](../../common/GUIDELINES.md) first for shared utilities and patterns.

## 🌊 Flow & Structure

1.  **Search Request**: Clients request `/api/v1/hotels-search?q=Query` (`searchController`).
2.  **External Fetch**: `ratingService` calls SerpApi (Google Hotels).
3.  **Response**: Returns standardized hotel list with names, addresses, and ratings.

## 📂 Internal Structure

```
search/
├── controllers/
│   └── searchController.js   # HTTP request handlers
├── services/
│   └── ratingService.js      # SerpApi integration
├── routes/
│   ├── index.js              # Route aggregator
│   └── searchRoutes.js       # API endpoint definitions
└── validations/
    └── searchValidation.js   # Query validation schemas
```

---

## 🔐 Authentication & Authorization

Search endpoints require authentication (Admin or Hotel Owner).

### Route Protection Example

```javascript
import { protect, authorize } from '../../../common/middleware/authMiddleware.js';

// Protected search - Admin or Hotel Owner only
router.get('/', protect, authorize('Admin', 'Hotel Owner'), searchHotels);
router.get('/details/:token', protect, authorize('Admin', 'Hotel Owner'), getHotelDetails);
```

---

## ✅ Validation

### Query Parameter Validation

```javascript
// validations/searchValidation.js
import Joi from 'joi';

export const searchQuerySchema = Joi.object({
    q: Joi.string().min(2).required().messages({
        'string.min': 'Search query must be at least 2 characters',
        'any.required': 'Search query is required'
    }),
    limit: Joi.number().integer().min(1).max(50).default(10)
});
```

### Applying to Routes

```javascript
import { validate } from '../../../common/middleware/validate.js';
import { searchQuerySchema } from '../validations/searchValidation.js';

router.get('/', protect, validate(searchQuerySchema), searchHotels);
```

---

## ⚠️ Error Handling

### Handling External API Errors

```javascript
import asyncHandler from '../../../common/utils/asyncHandler.js';

export const searchHotels = asyncHandler(async (req, res) => {
    const { q, limit } = req.query;
    
    const results = await ratingService.searchHotels(q, limit);
    
    if (!results || results.length === 0) {
        return res.status(200).json({ 
            success: true, 
            data: [],
            message: 'No hotels found matching your search'
        });
    }
    
    res.json({ success: true, count: results.length, data: results });
});
```

### Service Layer Error Handling

```javascript
// services/ratingService.js
export const searchHotels = async (query, limit = 10) => {
    try {
        const response = await serpApi.search({ q: query });
        return response.local_results || [];
    } catch (err) {
        // Log but don't expose external API errors
        console.error('SerpApi error:', err.message);
        const error = new Error('Hotel search service temporarily unavailable');
        error.statusCode = 503;
        throw error;
    }
};
```

---

## 📖 Swagger Documentation

### Search Endpoint

```javascript
/**
 * @swagger
 * /hotels-search:
 *   get:
 *     summary: Search for hotels via Google
 *     tags: [Search]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: q
 *         required: true
 *         schema:
 *           type: string
 *         description: Search query (hotel name, location)
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 10
 *         description: Maximum results to return
 *     responses:
 *       200:
 *         description: Search results
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 count:
 *                   type: integer
 *                 data:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/SearchResult'
 *       401:
 *         description: Not authenticated
 *       503:
 *         description: Search service unavailable
 */
router.get('/', protect, authorize('Admin', 'Hotel Owner'), searchHotels);
```

---

## 🛡️ Development Rules

1. **Use `asyncHandler`** for all async controllers
2. **Use `protect`** for all search endpoints
3. **Use `authorize('Admin', 'Hotel Owner')`** to restrict access
4. **Handle external API failures gracefully** - don't expose internal errors
5. **Add Swagger annotations** to all endpoints
6. **Cache results when possible** to reduce API calls
