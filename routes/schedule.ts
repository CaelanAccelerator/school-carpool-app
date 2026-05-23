import express from 'express';
import {
  createScheduleEntry,
  createWeeklySchedule,
  deleteScheduleEntry,
  getScheduleEntryByDay,
  getUserScheduleEntries,
  updateScheduleEntry
} from '../controllers/scheduleController';
import { authenticate } from '../middleware';

const router = express.Router();

router.put('/users/:userId/schedule', authenticate, createScheduleEntry);
router.get('/users/:userId/schedule', authenticate, getUserScheduleEntries);
router.get('/users/:userId/schedule/:dayOfWeek', authenticate, getScheduleEntryByDay);

// Bulk operation — must be defined before :entryId to avoid route conflict
router.put('/users/:userId/schedule/weekly', authenticate, createWeeklySchedule);

router.put('/users/:userId/schedule/:entryId', authenticate, updateScheduleEntry);
router.delete('/users/:userId/schedule/:entryId', authenticate, deleteScheduleEntry);

export default router;
