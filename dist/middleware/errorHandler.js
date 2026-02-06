"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.requestLogger = exports.asyncHandler = exports.errorHandler = void 0;
// Global error handler middleware
const errorHandler = (err, req, res, next) => {
    console.error('Error:', err);
    // Handle specific error types
    if (err.name === 'ValidationError') {
        res.status(400).json({
            success: false,
            error: 'Validation Error',
            details: err.message
        });
        return;
    }
    if (err.code === 'P2002') { // Prisma unique constraint violation
        res.status(409).json({
            success: false,
            error: 'Duplicate entry',
            details: 'A record with this information already exists'
        });
        return;
    }
    if (err.code === 'P2025') { // Prisma record not found
        res.status(404).json({
            success: false,
            error: 'Record not found'
        });
        return;
    }
    // Default error response
    res.status(err.status || 500).json({
        success: false,
        error: err.message || 'Internal Server Error'
    });
};
exports.errorHandler = errorHandler;
// Async error wrapper to catch async errors in route handlers
const asyncHandler = (fn) => {
    return (req, res, next) => {
        Promise.resolve(fn(req, res, next)).catch(next);
    };
};
exports.asyncHandler = asyncHandler;
// Request logger middleware
const requestLogger = (req, res, next) => {
    const start = Date.now();
    res.on('finish', () => {
        const duration = Date.now() - start;
        console.log(`${req.method} ${req.originalUrl} - ${res.statusCode} - ${duration}ms - ${req.ip}`);
    });
    next();
};
exports.requestLogger = requestLogger;
//# sourceMappingURL=errorHandler.js.map