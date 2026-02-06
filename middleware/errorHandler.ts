import { Request, Response, NextFunction } from 'express';

// Global error handler middleware
export const errorHandler = (
  err: any,
  req: Request,
  res: Response,
  next: NextFunction
): void => {
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

// Async error wrapper to catch async errors in route handlers
export const asyncHandler = (
  fn: (req: Request, res: Response, next: NextFunction) => Promise<any>
) => {
  return (req: Request, res: Response, next: NextFunction) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
};

// Request logger middleware
export const requestLogger = (req: Request, res: Response, next: NextFunction): void => {
  const start = Date.now();
  
  res.on('finish', () => {
    const duration = Date.now() - start;
    console.log(
      `${req.method} ${req.originalUrl} - ${res.statusCode} - ${duration}ms - ${req.ip}`
    );
  });
  
  next();
};