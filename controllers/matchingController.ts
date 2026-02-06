import { Role } from '@prisma/client';
import { Request, Response } from 'express';
import Joi from 'joi';
import { prisma } from '../lib/prisma';
import { minutesToTime, timeToMinutes } from '../lib/timeUtils';

// Types and interfaces
interface ScheduleMatchResult {
  id: string;
  userId: string;
  dayOfWeek: number;
  toCampusMins: number;
  goHomeMins: number;
  toCampusFlexMin: number;
  goHomeFlexMin: number;
  enabled: boolean;
  user: {
    id: string;
    name: string;
    photoUrl: string | null;
    campus: string;
    homeArea: string;
    role: string;
    timeZone: string;
  };
}

interface MatchByTimeFieldParams {
  userId: string;
  dayOfWeek: number;
  timeValue: string;
  flexibilityMins: number;
  timeField: 'toCampusMins' | 'goHomeMins';
  targetRoleGroup: 'DRIVER' | 'PASSENGER';
}

// Validation schemas
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

// Error handling helper
const handleControllerError = (res: Response, error: any, defaultMessage: string) => {
  console.error(`Controller error: ${defaultMessage}`, error);
  res.status(500).json({
    success: false,
    message: defaultMessage
  });
};

const handleUserNotFound = (res: Response) => {
  res.status(404).json({
    success: false,
    message: 'User not found'
  });
};

const handleValidationError = (res: Response, error: Joi.ValidationError) => {
  res.status(400).json({
    success: false,
    message: 'Validation error',
    errors: error.details.map(detail => detail.message)
  });
};

// Shared matching function
const matchByTimeField = async (params: MatchByTimeFieldParams) => {
  const { userId, dayOfWeek, timeValue, flexibilityMins, timeField, targetRoleGroup } = params;
  
  // Convert time string to minutes
  const timeMins = timeToMinutes(timeValue);
  
  // Get user's info to match campus
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { campus: true, homeArea: true }
  });

  if (!user) {
    throw new Error('USER_NOT_FOUND');
  }

  // Determine target roles based on group
  const targetRoles: Role[] = targetRoleGroup === 'DRIVER' 
    ? [Role.DRIVER, Role.BOTH] 
    : [Role.PASSENGER, Role.BOTH];

  // Build time filter condition
  const timeFilter = {
    [timeField]: {
      gte: timeMins - flexibilityMins,
      lte: timeMins + flexibilityMins
    }
  };

  // Query matching entries
  const matchingEntries = await prisma.scheduleEntry.findMany({
    where: {
      dayOfWeek,
      enabled: true,
      user: {
        isActive: true,
        campus: user.campus,
        role: { in: targetRoles },
        id: { not: userId }
      },
      ...timeFilter
    },
    include: {
      user: {
        select: {
          id: true,
          name: true,
          photoUrl: true,
          campus: true,
          homeArea: true,
          role: true,
          timeZone: true
        }
      }
    },
    orderBy: [
      { [timeField]: 'asc' }
    ]
  });

  // Transform results with matching scores
  const results = matchingEntries.map((entry: any) => {
    const entryTimeMins = entry[timeField];
    const timeDifference = Math.abs(entryTimeMins - timeMins);

    return {
      ...entry,
      matchingScore: {
        timeDifference,
        field: timeField,
        targetTimeFormatted: minutesToTime(timeMins),
        entryTimeFormatted: minutesToTime(entryTimeMins),
        toCampusTimeFormatted: minutesToTime(entry.toCampusMins),
        goHomeTimeFormatted: minutesToTime(entry.goHomeMins)
      },
      geoInfo: {
        // Placeholder for geo API integration
        estimatedPickupTime: null,
        distance: null,
        route: null
      }
    };
  });

  // Sort by time difference (ascending)
  return results.sort((a: any, b: any) => a.matchingScore.timeDifference - b.matchingScore.timeDifference);
};
export const getDriverAvailability = async (req: Request, res: Response): Promise<void> => {
  try {
    const driverId = Array.isArray(req.params.driverId) 
      ? req.params.driverId[0] 
      : req.params.driverId;
    const dayOfWeek = parseInt(req.params.dayOfWeek as string);

    if (!driverId || isNaN(dayOfWeek) || dayOfWeek < 0 || dayOfWeek > 6) {
      res.status(400).json({
        success: false,
        message: 'Valid driver ID and day of week (0-6) are required'
      });
      return;
    }

    // Verify the user is a driver
    const driver = await prisma.user.findUnique({
      where: {
        id: driverId,
        role: { in: [Role.DRIVER, Role.BOTH] },
        isActive: true
      },
      select: {
        id: true,
        name: true,
        photoUrl: true,
        campus: true,
        homeArea: true,
        role: true,
        timeZone: true
      }
    });

    if (!driver) {
      res.status(404).json({
        success: false,
        message: 'Driver not found or not available'
      });
      return;
    }

    // Use findFirst to check enabled status in query
    const scheduleEntry = await prisma.scheduleEntry.findFirst({
      where: {
        userId: driverId,
        dayOfWeek,
        enabled: true
      }
    });

    if (!scheduleEntry) {
      res.status(404).json({
        success: false,
        message: 'Driver not available on this day'
      });
      return;
    }

    res.status(200).json({
      success: true,
      data: {
        driver,
        schedule: {
          ...scheduleEntry,
          toCampusTimeFormatted: minutesToTime(scheduleEntry.toCampusMins),
          goHomeTimeFormatted: minutesToTime(scheduleEntry.goHomeMins)
        }
      }
    });

  } catch (error) {
    handleControllerError(res, error, 'Failed to fetch driver availability');
  }
};

// Find optimal drivers for to-campus trips
export const findOptimalDriversToCampus = async (req: Request, res: Response): Promise<void> => {
  try {
    const { error, value } = toCampusSchema.validate(req.body);
    if (error) {
      handleValidationError(res, error);
      return;
    }

    const userId = Array.isArray(req.params.userId) 
      ? req.params.userId[0] 
      : req.params.userId;
    if (!userId) {
      res.status(400).json({
        success: false,
        message: 'User ID is required'
      });
      return;
    }

    const results = await matchByTimeField({
      userId,
      dayOfWeek: value.dayOfWeek,
      timeValue: value.toCampusTime,
      flexibilityMins: value.flexibilityMins,
      timeField: 'toCampusMins',
      targetRoleGroup: 'DRIVER'
    });

    res.status(200).json({
      success: true,
      message: `Found ${results.length} to-campus compatible drivers`,
      data: {
        drivers: results,
        note: 'Geo-based filtering will be implemented with distance API integration'
      }
    });

  } catch (error) {
    if (error instanceof Error && error.message === 'USER_NOT_FOUND') {
      handleUserNotFound(res);
      return;
    }
    handleControllerError(res, error, 'Failed to find optimal to-campus drivers');
  }
};

// Find optimal drivers for go-home trips
export const findOptimalDriversGoHome = async (req: Request, res: Response): Promise<void> => {
  try {
    const { error, value } = goHomeSchema.validate(req.body);
    if (error) {
      handleValidationError(res, error);
      return;
    }

    const userId = Array.isArray(req.params.userId) 
      ? req.params.userId[0] 
      : req.params.userId;
    if (!userId) {
      res.status(400).json({
        success: false,
        message: 'User ID is required'
      });
      return;
    }

    const results = await matchByTimeField({
      userId,
      dayOfWeek: value.dayOfWeek,
      timeValue: value.goHomeTime,
      flexibilityMins: value.flexibilityMins,
      timeField: 'goHomeMins',
      targetRoleGroup: 'DRIVER'
    });

    res.status(200).json({
      success: true,
      message: `Found ${results.length} go-home compatible drivers`,
      data: {
        drivers: results,
        note: 'Geo-based filtering will be implemented with distance API integration'
      }
    });

  } catch (error) {
    if (error instanceof Error && error.message === 'USER_NOT_FOUND') {
      handleUserNotFound(res);
      return;
    }
    handleControllerError(res, error, 'Failed to find optimal go-home drivers');
  }
};

// Find optimal passengers for to-campus trips
export const findOptimalPassengersToCampus = async (req: Request, res: Response): Promise<void> => {
  try {
    const { error, value } = toCampusSchema.validate(req.body);
    if (error) {
      handleValidationError(res, error);
      return;
    }

    const userId = Array.isArray(req.params.userId) 
      ? req.params.userId[0] 
      : req.params.userId;
    if (!userId) {
      res.status(400).json({
        success: false,
        message: 'User ID is required'
      });
      return;
    }

    const results = await matchByTimeField({
      userId,
      dayOfWeek: value.dayOfWeek,
      timeValue: value.toCampusTime,
      flexibilityMins: value.flexibilityMins,
      timeField: 'toCampusMins',
      targetRoleGroup: 'PASSENGER'
    });

    res.status(200).json({
      success: true,
      message: `Found ${results.length} to-campus compatible passengers`,
      data: {
        passengers: results,
        note: 'Geo-based filtering will be implemented with distance API integration'
      }
    });

  } catch (error) {
    if (error instanceof Error && error.message === 'USER_NOT_FOUND') {
      handleUserNotFound(res);
      return;
    }
    handleControllerError(res, error, 'Failed to find optimal to-campus passengers');
  }
};

// Find optimal passengers for go-home trips
export const findOptimalPassengersGoHome = async (req: Request, res: Response): Promise<void> => {
  try {
    const { error, value } = goHomeSchema.validate(req.body);
    if (error) {
      handleValidationError(res, error);
      return;
    }

    const userId = Array.isArray(req.params.userId) 
      ? req.params.userId[0] 
      : req.params.userId;
    if (!userId) {
      res.status(400).json({
        success: false,
        message: 'User ID is required'
      });
      return;
    }

    const results = await matchByTimeField({
      userId,
      dayOfWeek: value.dayOfWeek,
      timeValue: value.goHomeTime,
      flexibilityMins: value.flexibilityMins,
      timeField: 'goHomeMins',
      targetRoleGroup: 'PASSENGER'
    });

    res.status(200).json({
      success: true,
      message: `Found ${results.length} go-home compatible passengers`,
      data: {
        passengers: results,
        note: 'Geo-based filtering will be implemented with distance API integration'
      }
    });

  } catch (error) {
    if (error instanceof Error && error.message === 'USER_NOT_FOUND') {
      handleUserNotFound(res);
      return;
    }
    handleControllerError(res, error, 'Failed to find optimal go-home passengers');
  }
};