"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const scheduleController_1 = require("../controllers/scheduleController");
const router = express_1.default.Router();
// Schedule Entry CRUD operations
router.post('/users/:userId/schedule', scheduleController_1.createScheduleEntry);
router.get('/users/:userId/schedule', scheduleController_1.getUserScheduleEntries);
router.get('/users/:userId/schedule/:dayOfWeek', scheduleController_1.getScheduleEntryByDay);
router.put('/schedule/:entryId', scheduleController_1.updateScheduleEntry);
router.delete('/schedule/:entryId', scheduleController_1.deleteScheduleEntry);
// Bulk operations
router.post('/users/:userId/schedule/weekly', scheduleController_1.createWeeklySchedule);
exports.default = router;
//# sourceMappingURL=schedule.js.map