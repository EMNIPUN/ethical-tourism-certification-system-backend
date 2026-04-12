# Search Module

Handles external search functionality to find hotels and retrieve Google ratings.

Important: Read the Common Guidelines first for shared utilities and patterns:
`src/common/GUIDELINES.md`.

## Flow

1. Search Request: Clients request `GET /api/v1/hotels-search?q=Query` (`searchController`).
2. External Fetch: `ratingService` calls SerpApi (Google Hotels).
3. Response: Returns a standardized hotel list with names, addresses, and ratings.

## Internal Structure

```
search/
  controllers/
    searchController.js   # HTTP request handlers
  services/
    ratingService.js      # SerpApi integration
  routes/
    index.js              # Route aggregator
    searchRoutes.js       # API endpoint definitions
  validations/
    searchValidation.js   # Query validation schemas
```

## Authentication & Authorization

Search endpoints require authentication (Admin or Hotel Owner).

Example route protection:

```js
import { protect, authorize } from '../../../common/middleware/authMiddleware.js';

router.get('/', protect, authorize('Admin', 'Hotel Owner'), searchHotels);
router.get('/details/:token', protect, authorize('Admin', 'Hotel Owner'), getHotelDetails);
```

## Validation

Use the shared validation middleware and Joi schemas for query validation.

Example schema:

```js
import Joi from 'joi';

export const searchQuerySchema = Joi.object({
    q: Joi.string().min(2).required().messages({
        'string.min': 'Search query must be at least 2 characters',
        'any.required': 'Search query is required'
    }),
    limit: Joi.number().integer().min(1).max(50).default(10)
});
```

## Error Handling

Handle external API errors gracefully and avoid leaking upstream errors.

```js
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

## Swagger Documentation

Add Swagger annotations for all endpoints.

## Development Rules

1. Use `asyncHandler` for async controllers
2. Use `protect` for all search endpoints
3. Use `authorize('Admin', 'Hotel Owner')` to restrict access
4. Handle external API failures gracefully
5. Add Swagger annotations to endpoints