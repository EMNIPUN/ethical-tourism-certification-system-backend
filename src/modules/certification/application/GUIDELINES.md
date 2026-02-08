# Application Module (Certification)

Handles the core hotel application process, including CRUD operations and verification.

## 🌊 Flow & Structure

1.  **Application**: A `Hotel` creates an entry via `POST /api/hotels` (`hotelController.createHotel`).
2.  **Scoring**: The system (`scoringService`) calculates internal scores based on data completeness (facilities, policies).
3.  **Verification**: The system (`verificationService`) attempts to verify the hotel using external data (Google).
4.  **Confirmation**: The user confirms the match (`POST /api/hotels/:id/confirm`), triggering score finalization.

## 📂 Internal Structure

- **`controllers/`**: `hotelController.js` (Handles API requests).
- **`services/`**: logic for `hotelService`, `scroringService`, `verificationService`.
- **`routes/`**: `hotelRoutes.js` (API endpoints).
- **`validations/`**: `hotelValidation.js` (Joi schemas).

---

## 🛡️ Development Guidelines

**Adhere to these rules strictly:**

1.  **Follow Clean Architecture**: Keep logic separated in `controllers`, `services`, `routes`, etc.
2.  **Validation**: Use **Joi** schemas in `validations/`. Validate requests using `validate()` middleware.
3.  **Documentation**: Add **Swagger** annotations to `routes/`. Use definitions from `common/swagger/`.
4.  **Configuration**: Import config from `common/config`.
5.  **Middleware**: Use `common/middleware` (error & validate).
6.  **Models**: Use the shared `Hotel` model in `common/models`. **Do not duplicate models**.
7.  **Async**: Wrap controllers with `asyncHandler` from `common/utils`.
8.  **Common Functions**: If logic is reusable, move it to `src/common` and document it there.
