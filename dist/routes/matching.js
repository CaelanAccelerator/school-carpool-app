"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const matchingController_1 = require("../controllers/matchingController");
const router = express_1.default.Router();
// Passenger matching endpoints
router.post('/users/:userId/find-optimal-passengers-to-campus', matchingController_1.findOptimalPassengersToCampus);
router.post('/users/:userId/find-optimal-passengers-go-home', matchingController_1.findOptimalPassengersGoHome);
// Driver matching endpoints
router.post('/users/:userId/find-optimal-drivers-to-campus', matchingController_1.findOptimalDriversToCampus);
router.post('/users/:userId/find-optimal-drivers-go-home', matchingController_1.findOptimalDriversGoHome);
router.get('/drivers/:driverId/availability/:dayOfWeek', matchingController_1.getDriverAvailability);
exports.default = router;
//# sourceMappingURL=matching.js.map