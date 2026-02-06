import express, { Request, Response, NextFunction } from 'express';
const router = express.Router();

/* GET home page. */
router.get('/', function(req: Request, res: Response, next: NextFunction) {
  res.render('index', { title: 'Campus Carpool App' });
});

/* GET API health check */
router.get('/health', function(req: Request, res: Response) {
  res.json({
    success: true,
    message: 'Campus Carpool API is running',
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV || 'development'
  });
});

/* GET API info */
router.get('/api', function(req: Request, res: Response) {
  res.json({
    success: true,
    data: {
      name: 'Campus Carpool API',
      version: '1.0.0',
      endpoints: {
        users: '/api/users',
        schedule: '/api/schedule',
        matching: '/api/matching',
        health: '/health'
      },
      documentation: 'See README.md for full API documentation'
    }
  });
});

export default router;