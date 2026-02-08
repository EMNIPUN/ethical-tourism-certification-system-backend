# Common Modules & Guidelines

This directory contains shared resources that must be used across all feature modules to ensure consistency and maintainability.

## 📚 Available Common Resources

### 1. Utilities (`src/common/utils/`)
*   **`asyncHandler(fn)`**: Wraps async controller functions to automatically catch errors and pass them to the global error handler.
    *   **Usage**: `export const myController = asyncHandler(async (req, res) => { ... });`

### 2. Middleware (`src/common/middleware/`)
*   **`errorMiddleware`**: Global error handler. Catches all errors and returns a standardized JSON response `{ success: false, error: "Message" }`.
*   **`validate(schema)`**: Generic validation middleware. Put this in your routes before the controller.
    *   **Usage**: `router.post('/', validate(createSchema), createController);`
*   **`protect`**: Middleware to protect routes Authentication. Verifies JWT token from `Authorization` header.
    *   **Usage**: `router.get('/protected', protect, controller);`
*   **`authorize(...roles)`**: Middleware to restrict access to specific roles.
    *   **Usage**: `router.get('/admin', protect, authorize('Admin'), adminController);`

### 3. Configuration (`src/common/config/`)
*   **`db.js`**: Database connection logic.
*   **`swagger.js`**: Swagger configuration.

### 4. Models (`src/common/models/`)
*   **`Hotel.js`**: The central Mongoose model for Hotel data. **All feature modules must use this model**—do not create separate models for the same collection.

### 5. Swagger Definitions (`src/common/swagger/`)
*   **`hotelSchema.js`**: Reusable Swagger component definitions (e.g., `Hotel`, `Address`).

---

## 🛡️ Development Guidelines

**Every developer must follow these rules when working on a module:**

1.  **Follow Clean Architecture**: Organize code into `controllers`, `services`, `routes`, `validations`, `middleware`, and `utils`.
2.  **Validation & Error Handling**:
    *   Use **Joi** for all request validation.
    *   Place validation schemas in `validations/`.
    *   Use `validate()` middleware in routes.
3.  **API Documentation**:
    *   Use **Swagger** annotations in your route files.
    *   Define reusable Swagger schemas in `common/swagger/`.
4.  **Configuration**:
    *   Use configuration from `common/config/`. Do not hardcode values.
5.  **Middleware usage**:
    *   Use the standard `errorMiddleware` and `validateMiddleware` from `common/middleware`.
6.  **Database Models**:
    *   **Every model should be in `common/models`**. This facilitates data sharing between modules.
7.  **Async Handling**:
    *   **Use common `asyncHandler`** for all controllers. Do not use `try-catch` blocks for standard API errors.

## ➕ How to Create Common Functions

If you need a function that will be used by **more than one module**:
1.  Create it in `src/common/utils/` (or strictly relevant folder).
2.  Export it clearly.
3.  Add it to this `README.md`.
4.  **Do not** duplicate logic across modules.
