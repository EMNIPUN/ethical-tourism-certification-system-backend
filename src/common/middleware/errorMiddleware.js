import dotenv from 'dotenv';
dotenv.config();

/**
 * middleware/errorMiddleware.js
 * 
 * Global error handling middleware.
 */

const errorHandler = (err, req, res, next) => {
    const statusCode = res.statusCode === 200 ? 500 : res.statusCode;

    // Log error for server-side debugging
    console.error(`Error: ${err.message}`);
    if (process.env.NODE_ENV === 'development') {
        console.error(err.stack);
    }

    res.status(statusCode).json({
        success: false,
        error: err.message,
        stack: process.env.NODE_ENV === 'production' ? null : err.stack,
    });
};

export { errorHandler };
