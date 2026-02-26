/**
 * middleware/validateMiddleware.js
 * 
 * Middleware to validate request body against a Joi schema.
 * Returns 400 Bad Request if validation fails.
 */
export const validate = (schema) => (req, res, next) => {
    const { error } = schema.validate(req.body, { abortEarly: false });

    if (error) {
        const errorMessage = error.details.map((detail) => detail.message).join(', ');
        console.error(`Validation Error: ${errorMessage}`);
        res.status(400); // Set status code first
        return res.json({
            success: false,
            error: errorMessage
        });
        // We throw an Error instance usually to pass to next(err), 
        // but for validation returning 400 directly is common.
        // Alternatively using next(new Error(errorMessage)) would hit our errorHandler which returns 500 unless we attach status code.
    }

    next();
};
