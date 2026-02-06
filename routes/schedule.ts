import express from 'express';
import {
  createScheduleEntry,
  getUserScheduleEntries,
  getScheduleEntryByDay,
  updateScheduleEntry,
  deleteScheduleEntry,
  createWeeklySchedule
} from '../controllers/scheduleController';

const router = express.Router();

// Schedule Entry CRUD operations
router.post('/users/:userId/schedule', createScheduleEntry);
router.get('/users/:userId/schedule', getUserScheduleEntries);
router.get('/users/:userId/schedule/:dayOfWeek', getScheduleEntryByDay);
router.put('/schedule/:entryId', updateScheduleEntry);
router.delete('/schedule/:entryId', deleteScheduleEntry);

// Bulk operations
router.post('/users/:userId/schedule/weekly', createWeeklySchedule);

export default router;