import express from 'express';
import {
    findOptimalDriversGoHome,
    findOptimalDriversToCampus,
    findOptimalPassengersGoHome,
    findOptimalPassengersToCampus,
    getDriverAvailability
} from '../controllers/matchingController';

const router = express.Router();

// Passenger matching endpoints
router.post('/users/:userId/find-optimal-passengers-to-campus', findOptimalPassengersToCampus);
router.post('/users/:userId/find-optimal-passengers-go-home', findOptimalPassengersGoHome);
// Driver matching endpoints
router.post('/users/:userId/find-optimal-drivers-to-campus', findOptimalDriversToCampus);
router.post('/users/:userId/find-optimal-drivers-go-home', findOptimalDriversGoHome);
router.get('/drivers/:driverId/availability/:dayOfWeek', getDriverAvailability);

export default router;