import { Request, Response } from 'express';
import Joi from 'joi';
import { asyncHandler } from '../middleware';
import { scheduleService } from '../services/scheduleService';

const createEntrySchema = Joi.object({
  dayOfWeek: Joi.number().integer().min(0).max(6).required(),
  toCampusMins: Joi.number().integer().min(0).max(1439).required(),
  goHomeMins: Joi.number().integer().min(0).max(1439).required(),
  toCampusFlexMin: Joi.number().integer().min(0).max(120).default(15),
  goHomeFlexMin: Joi.number().integer().min(0).max(120).default(15),
  toCampusMaxDetourMins: Joi.number().integer().min(0).max(120).default(10),
  goHomeMaxDetourMins: Joi.number().integer().min(0).max(120).default(10),
  enabled: Joi.boolean().default(true)
});

const updateEntrySchema = Joi.object({
  toCampusMins: Joi.number().integer().min(0).max(1439).optional(),
  goHomeMins: Joi.number().integer().min(0).max(1439).optional(),
  toCampusFlexMin: Joi.number().integer().min(0).max(120).optional(),
  goHomeFlexMin: Joi.number().integer().min(0).max(120).optional(),
  toCampusMaxDetourMins: Joi.number().integer().min(0).max(120).optional(),
  goHomeMaxDetourMins: Joi.number().integer().min(0).max(120).optional(),
  enabled: Joi.boolean().optional()
});

const weeklyScheduleSchema = Joi.array().items(
  Joi.object({
    dayOfWeek: Joi.number().integer().min(0).max(6).required(),
    toCampusMins: Joi.number().integer().min(0).max(1439).required(),
    goHomeMins: Joi.number().integer().min(0).max(1439).required(),
    toCampusFlexMin: Joi.number().integer().min(0).max(120).default(15),
    goHomeFlexMin: Joi.number().integer().min(0).max(120).default(15),
    toCampusMaxDetourMins: Joi.number().integer().min(0).max(120).default(10),
    goHomeMaxDetourMins: Joi.number().integer().min(0).max(120).default(10),
    enabled: Joi.boolean().default(true)
  })
).min(1).max(7);

const getUserId = (req: Request): string =>
  Array.isArray(req.params.userId) ? req.params.userId[0] : req.params.userId;

export const createScheduleEntry = asyncHandler(async (req: Request, res: Response) => {
  const userId = getUserId(req);
  const { error, value } = createEntrySchema.validate(req.body);
  if (error) {
    res.status(400).json({
      success: false,
      message: 'Validation error',
      errors: error.details.map(d => d.message)
    });
    return;
  }

  const entry = await scheduleService.createEntry(userId, value);
  res.status(201).json({ success: true, message: 'Schedule entry created successfully', data: entry });
});

export const getUserScheduleEntries = asyncHandler(async (req: Request, res: Response) => {
  const userId = getUserId(req);
  const entries = await scheduleService.getUserEntries(userId);
  res.json({ success: true, data: entries });
});

export const getScheduleEntryByDay = asyncHandler(async (req: Request, res: Response) => {
  const userId = getUserId(req);
  const dayOfWeekParam = Array.isArray(req.params.dayOfWeek)
    ? req.params.dayOfWeek[0]
    : req.params.dayOfWeek;
  const dayOfWeek = parseInt(dayOfWeekParam ?? '');

  if (isNaN(dayOfWeek) || dayOfWeek < 0 || dayOfWeek > 6) {
    res.status(400).json({ success: false, message: 'Valid day of week (0-6) is required' });
    return;
  }

  const entry = await scheduleService.getEntryByDay(userId, dayOfWeek);
  res.json({ success: true, data: entry });
});

export const updateScheduleEntry = asyncHandler(async (req: Request, res: Response) => {
  const entryId = Array.isArray(req.params.entryId) ? req.params.entryId[0] : req.params.entryId;
  const { error, value } = updateEntrySchema.validate(req.body);
  if (error) {
    res.status(400).json({
      success: false,
      message: 'Validation error',
      errors: error.details.map(d => d.message)
    });
    return;
  }

  const entry = await scheduleService.updateEntry(entryId, value);
  res.json({ success: true, message: 'Schedule entry updated successfully', data: entry });
});

export const deleteScheduleEntry = asyncHandler(async (req: Request, res: Response) => {
  const entryId = Array.isArray(req.params.entryId) ? req.params.entryId[0] : req.params.entryId;
  await scheduleService.deleteEntry(entryId);
  res.json({ success: true, message: 'Schedule entry deleted successfully' });
});

export const createWeeklySchedule = asyncHandler(async (req: Request, res: Response) => {
  const userId = getUserId(req);
  const { error, value } = weeklyScheduleSchema.validate(req.body);
  if (error) {
    res.status(400).json({
      success: false,
      message: 'Validation error',
      errors: error.details.map(d => d.message)
    });
    return;
  }

  const result = await scheduleService.upsertWeeklySchedule(userId, value);
  res.json({ success: true, message: 'Weekly schedule created/updated successfully', data: result });
});
