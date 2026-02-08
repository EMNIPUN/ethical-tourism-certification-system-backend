# Audit Module

Handles audit reviews and compliance checks.

## 📂 Internal Structure

- `controllers/`
- `services/`
- `routes/`
- `validations/`

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
