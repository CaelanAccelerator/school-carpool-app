import express from 'express';
import {
  findOptimalDriversGoHome,
  findOptimalDriversToCampus,
  findOptimalPassengersGoHome,
  findOptimalPassengersToCampus,
  getDriverAvailability
} from '../controllers/matchingController';
import { authenticate } from '../middleware';

const router = express.Router();

router.post('/users/:userId/find-optimal-passengers-to-campus', authenticate, findOptimalPassengersToCampus);
router.post('/users/:userId/find-optimal-passengers-go-home', authenticate, findOptimalPassengersGoHome);
router.post('/users/:userId/find-optimal-drivers-to-campus', authenticate, findOptimalDriversToCampus);
router.post('/users/:userId/find-optimal-drivers-go-home', authenticate, findOptimalDriversGoHome);
router.get('/drivers/:driverId/availability/:dayOfWeek', authenticate, getDriverAvailability);

export default router;