import express from 'express';
import {
  createScheduleEntry,
  createWeeklySchedule,
  deleteScheduleEntry,
  getScheduleEntryByDay,
  getUserScheduleEntries,
  updateScheduleEntry
} from '../controllers/scheduleController';

const router = express.Router();

// Schedule Entry CRUD operations
router.put('/users/:userId/schedule', createScheduleEntry);
router.get('/users/:userId/schedule', getUserScheduleEntries);
router.get('/users/:userId/schedule/:dayOfWeek', getScheduleEntryByDay);

// Bulk operations (define before :entryId to avoid route conflicts)
router.put('/users/:userId/schedule/weekly', createWeeklySchedule);

router.put('/users/:userId/schedule/:entryId', updateScheduleEntry);
router.delete('/users/:userId/schedule/:entryId', deleteScheduleEntry);

export default router;