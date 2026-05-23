import { Request, Response } from 'express';
import Joi from 'joi';
import { asyncHandler } from '../middleware';
import { matchingService } from '../services/matchingService';

const toCampusSchema = Joi.object({
  dayOfWeek: Joi.number().integer().min(0).max(6).required(),
  toCampusTime: Joi.string().pattern(/^([0-1]?[0-9]|2[0-3]):([0-5][0-9])$/).required(),
  flexibilityMins: Joi.number().integer().min(0).max(120).default(15)
});

const goHomeSchema = Joi.object({
  dayOfWeek: Joi.number().integer().min(0).max(6).required(),
  goHomeTime: Joi.string().pattern(/^([0-1]?[0-9]|2[0-3]):([0-5][0-9])$/).required(),
  flexibilityMins: Joi.number().integer().min(0).max(120).default(15)
});

const getUserId = (req: Request): string =>
  Array.isArray(req.params.userId) ? req.params.userId[0] : req.params.userId;

const handleMatchingError = (res: Response, error: unknown) => {
  if (error instanceof Error && error.message.startsWith('UNKNOWN_CAMPUS:')) {
    const campus = error.message.substring('UNKNOWN_CAMPUS:'.length);
    res.status(400).json({
      success: false,
      message: `Unknown campus: ${campus}`,
      allowed: matchingService.CAMPUS_NAMES
    });
    return true;
  }
  return false;
};

export const findOptimalDriversToCampus = asyncHandler(async (req: Request, res: Response) => {
  const { error, value } = toCampusSchema.validate(req.body);
  if (error) {
    res.status(400).json({ success: false, message: 'Validation error', errors: error.details.map(d => d.message) });
    return;
  }

  const userId = getUserId(req);
  try {
    const { results, geoNote } = await matchingService.matchByTimeField({
      userId,
      dayOfWeek: value.dayOfWeek,
      timeValue: value.toCampusTime,
      flexibilityMins: value.flexibilityMins,
      timeField: 'toCampusMins',
      targetRoleGroup: 'DRIVER'
    });
    res.json({
      success: true,
      message: `Found ${results.length} to-campus compatible drivers`,
      data: { drivers: results, note: geoNote ?? 'Geo-based filtering applied' }
    });
  } catch (err) {
    if (!handleMatchingError(res, err)) throw err;
  }
});

export const findOptimalDriversGoHome = asyncHandler(async (req: Request, res: Response) => {
  const { error, value } = goHomeSchema.validate(req.body);
  if (error) {
    res.status(400).json({ success: false, message: 'Validation error', errors: error.details.map(d => d.message) });
    return;
  }

  const userId = getUserId(req);
  try {
    const { results, geoNote } = await matchingService.matchByTimeField({
      userId,
      dayOfWeek: value.dayOfWeek,
      timeValue: value.goHomeTime,
      flexibilityMins: value.flexibilityMins,
      timeField: 'goHomeMins',
      targetRoleGroup: 'DRIVER'
    });
    res.json({
      success: true,
      message: `Found ${results.length} go-home compatible drivers`,
      data: { drivers: results, note: geoNote ?? 'Geo-based filtering applied' }
    });
  } catch (err) {
    if (!handleMatchingError(res, err)) throw err;
  }
});

export const findOptimalPassengersToCampus = asyncHandler(async (req: Request, res: Response) => {
  const { error, value } = toCampusSchema.validate(req.body);
  if (error) {
    res.status(400).json({ success: false, message: 'Validation error', errors: error.details.map(d => d.message) });
    return;
  }

  const userId = getUserId(req);
  try {
    const { results, geoNote } = await matchingService.matchByTimeField({
      userId,
      dayOfWeek: value.dayOfWeek,
      timeValue: value.toCampusTime,
      flexibilityMins: value.flexibilityMins,
      timeField: 'toCampusMins',
      targetRoleGroup: 'PASSENGER'
    });
    res.json({
      success: true,
      message: `Found ${results.length} to-campus compatible passengers`,
      data: { passengers: results, note: geoNote ?? 'Geo-based filtering applied' }
    });
  } catch (err) {
    if (!handleMatchingError(res, err)) throw err;
  }
});

export const findOptimalPassengersGoHome = asyncHandler(async (req: Request, res: Response) => {
  const { error, value } = goHomeSchema.validate(req.body);
  if (error) {
    res.status(400).json({ success: false, message: 'Validation error', errors: error.details.map(d => d.message) });
    return;
  }

  const userId = getUserId(req);
  try {
    const { results, geoNote } = await matchingService.matchByTimeField({
      userId,
      dayOfWeek: value.dayOfWeek,
      timeValue: value.goHomeTime,
      flexibilityMins: value.flexibilityMins,
      timeField: 'goHomeMins',
      targetRoleGroup: 'PASSENGER'
    });
    res.json({
      success: true,
      message: `Found ${results.length} go-home compatible passengers`,
      data: { passengers: results, note: geoNote ?? 'Geo-based filtering applied' }
    });
  } catch (err) {
    if (!handleMatchingError(res, err)) throw err;
  }
});

export const getDriverAvailability = asyncHandler(async (req: Request, res: Response) => {
  const driverId = Array.isArray(req.params.driverId) ? req.params.driverId[0] : req.params.driverId;
  const dayOfWeek = parseInt(req.params.dayOfWeek as string);

  if (!driverId || isNaN(dayOfWeek) || dayOfWeek < 0 || dayOfWeek > 6) {
    res.status(400).json({
      success: false,
      message: 'Valid driver ID and day of week (0-6) are required'
    });
    return;
  }

  const data = await matchingService.getDriverAvailability(driverId, dayOfWeek);
  res.json({ success: true, data });
});
