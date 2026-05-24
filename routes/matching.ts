import express from 'express';
import {
  findOptimalDriversGoHome,
  findOptimalDriversToCampus,
  findOptimalPassengersGoHome,
  findOptimalPassengersToCampus,
  getDriverAvailability
} from '../controllers/matchingController';
import { authenticate } from '../middleware';
import { matchingRateLimit } from '../middleware/rateLimit';

const router = express.Router();

// authenticate first so req.user is available inside matchingRateLimit
router.post('/users/:userId/find-optimal-passengers-to-campus', authenticate, matchingRateLimit, findOptimalPassengersToCampus);
router.post('/users/:userId/find-optimal-passengers-go-home', authenticate, matchingRateLimit, findOptimalPassengersGoHome);
router.post('/users/:userId/find-optimal-drivers-to-campus', authenticate, matchingRateLimit, findOptimalDriversToCampus);
router.post('/users/:userId/find-optimal-drivers-go-home', authenticate, matchingRateLimit, findOptimalDriversGoHome);
router.get('/drivers/:driverId/availability/:dayOfWeek', authenticate, getDriverAvailability);

export default router;