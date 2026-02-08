import { Role } from '@prisma/client';
import { Request, Response } from 'express';
import Joi from 'joi';
import { CAMPUS_NAMES, getCampusCoords } from '../lib/config/campusCoords';
import { createGeoProvider } from '../lib/geo/createGeoProvider';
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
  toCampusMaxDetourMins: number;
  goHomeMaxDetourMins: number;
  enabled: boolean;
  user: {
    id: string;
    name: string;
    photoUrl: string | null;
    campus: string;
    homeArea: string;
    homeLat: number | null;
    homeLng: number | null;
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
// Input: Express response, error object, default message string
// Output: Sends 500 JSON error response
const handleControllerError = (res: Response, error: any, defaultMessage: string) => {
  console.error(`Controller error: ${defaultMessage}`, error);
  res.status(500).json({
    success: false,
    message: defaultMessage
  });
};

// User not found helper
// Input: Express response
// Output: Sends 404 JSON response
const handleUserNotFound = (res: Response) => {
  res.status(404).json({
    success: false,
    message: 'User not found'
  });
};

// Validation error helper  
// Input: Express response, Joi validation error
// Output: Sends 400 JSON response with error details
const handleValidationError = (res: Response, error: Joi.ValidationError) => {
  res.status(400).json({
    success: false,
    message: 'Validation error',
    errors: error.details.map(detail => detail.message)
  });
};

const geoProvider = createGeoProvider();

// Utility for batched async operations with concurrency limit
// Input: Array of items, concurrency limit number, mapper function
// Output: Promise resolving to array of mapped results
const mapWithConcurrency = async <T, R>(items: T[], limit: number, mapper: (item: T) => Promise<R>): Promise<R[]> => {
  const results: R[] = [];
  for (let index = 0; index < items.length; index += limit) {
    const batch = items.slice(index, index + limit);
    const batchResults = await Promise.all(batch.map(mapper));
    results.push(...batchResults);
  }
  return results;
};

// Helper functions for matching logic
// Gets user data with campus and home coordinates or throws error
// Input: User ID string
// Output: Promise resolving to user object with {campus, homeArea, homeLat, homeLng} or throws USER_NOT_FOUND
const getRequesterOrThrow = async (userId: string) => {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { campus: true, homeArea: true, homeLat: true, homeLng: true }
  });

  if (!user) {
    throw new Error('USER_NOT_FOUND');
  }

  return user;
};

// Converts target role group to array of Role enums
// Input: 'DRIVER' or 'PASSENGER' string
// Output: Array of Role enums [Role.DRIVER, Role.BOTH] or [Role.PASSENGER, Role.BOTH]
const buildTargetRoles = (targetRoleGroup: 'DRIVER' | 'PASSENGER'): Role[] => {
  return targetRoleGroup === 'DRIVER' 
    ? [Role.DRIVER, Role.BOTH] 
    : [Role.PASSENGER, Role.BOTH];
};

// Queries database for matching schedule entries with filters
// Input: Object with {dayOfWeek, userCampus, userId, targetRoles, timeField, timeFilter}
// Output: Promise resolving to array of schedule entries with user details
const queryMatchingEntries = async ({
  dayOfWeek,
  userCampus,
  userId,
  targetRoles,
  timeField,
  timeFilter
}: {
  dayOfWeek: number;
  userCampus: string;
  userId: string;
  targetRoles: Role[];
  timeField: 'toCampusMins' | 'goHomeMins';
  timeFilter: any;
}) => {
  return await prisma.scheduleEntry.findMany({
    where: {
      dayOfWeek,
      enabled: true,
      user: {
        isActive: true,
        campus: userCampus,
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
          homeLat: true,
          homeLng: true,
          role: true,
          timeZone: true
        }
      }
    },
    orderBy: [
      { [timeField]: 'asc' }
    ]
  });
};

// Adds matching scores and empty geo info to schedule entries
// Input: Array of matching entries, time field name, target time in minutes
// Output: Array of entries with added matchingScore and geoInfo objects
const buildBaseResults = (matchingEntries: any[], timeField: 'toCampusMins' | 'goHomeMins', timeMins: number) => {
  return matchingEntries.map((entry: any) => {
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
        baseMins: null,
        viaMins: null,
        extraDetourMins: null
      }
    };
  });
};

// Applies geo-based detour filtering to results
// Input: Base results array, requester coords {homeLat, homeLng}, campus coords, time field
// Output: Promise resolving to filtered array with geo info populated, excluding entries over detour limits
const applyGeoDetourFilter = async (
  baseResults: any[],
  requester: { homeLat: number; homeLng: number },
  campusCoords: { lat: number; lng: number },
  timeField: 'toCampusMins' | 'goHomeMins'
) => {
  const detourResults = await mapWithConcurrency(baseResults, 5, async (entry: any) => {
    if (entry.user.homeLat == null || entry.user.homeLng == null) {
      return null;
    }

    const detour = await geoProvider.detourExtraMins(
      { lat: entry.user.homeLat, lng: entry.user.homeLng },
      { lat: requester.homeLat, lng: requester.homeLng },
      campusCoords
    );

    const maxDetour = timeField === 'toCampusMins'
      ? entry.toCampusMaxDetourMins
      : entry.goHomeMaxDetourMins;

    if (detour.extraMins > maxDetour) {
      return null;
    }

    return {
      ...entry,
      geoInfo: {
        baseMins: detour.baseMins,
        viaMins: detour.viaMins,
        extraDetourMins: detour.extraMins
      }
    };
  });

  return detourResults.filter((entry: any) => entry !== null);
};

// Sorts results by geo detour minutes then time difference  
// Input: Array of results with geoInfo.extraDetourMins and matchingScore.timeDifference
// Output: Sorted array (ascending by detour, then by time difference)
const sortResults = (results: any[]) => {
  return results.sort((a: any, b: any) => {
    const extraDiff = a.geoInfo.extraDetourMins - b.geoInfo.extraDetourMins;
    if (extraDiff !== 0) {
      return extraDiff;
    }
    return a.matchingScore.timeDifference - b.matchingScore.timeDifference;
  });
};

// Main matching function - finds compatible users based on time and applies geo filtering
// Input: MatchByTimeFieldParams object with userId, dayOfWeek, timeValue, etc.
// Output: Promise resolving to {results: sorted array, geoNote?: string}
const matchByTimeField = async (params: MatchByTimeFieldParams) => {
  const { userId, dayOfWeek, timeValue, flexibilityMins, timeField, targetRoleGroup } = params;
  
  // Convert time string to minutes
  const timeMins = timeToMinutes(timeValue);
  
  // Get user's info - this will throw USER_NOT_FOUND if missing
  const user = await getRequesterOrThrow(userId);

  // Validate campus and get coordinates - let UNKNOWN_CAMPUS bubble up
  const campusCoords = getCampusCoords(user.campus);

  // Determine target roles and build time filter
  const targetRoles = buildTargetRoles(targetRoleGroup);
  const timeFilter = {
    [timeField]: {
      gte: timeMins - flexibilityMins,
      lte: timeMins + flexibilityMins
    }
  };

  // Query matching entries
  const matchingEntries = await queryMatchingEntries({
    dayOfWeek,
    userCampus: user.campus,
    userId,
    targetRoles,
    timeField,
    timeFilter
  });

  // Build base results with matching scores
  const baseResults = buildBaseResults(matchingEntries, timeField, timeMins);

  // Check if requester has home coordinates for geo filtering
  if (!user.homeLat || !user.homeLng) {
    return {
      results: baseResults.sort((a: any, b: any) => a.matchingScore.timeDifference - b.matchingScore.timeDifference),
      geoNote: 'Geo filtering skipped: requester home location missing.'
    };
  }

  // Apply geo detour filtering and sorting
  const filteredResults = await applyGeoDetourFilter(
    baseResults,
    { homeLat: user.homeLat, homeLng: user.homeLng },
    campusCoords,
    timeField
  );

  return {
    results: sortResults(filteredResults),
    geoNote: undefined
  };
};

// Helper functions for driver availability
// Parses and validates driver ID and day of week from request params
// Input: Express Request object
// Output: {driverId: string, dayOfWeek: number} or throws INVALID_PARAMS
const parseDriverIdAndDay = (req: Request) => {
  const driverId = Array.isArray(req.params.driverId) 
    ? req.params.driverId[0] 
    : req.params.driverId;
  const dayOfWeek = parseInt(req.params.dayOfWeek as string);

  if (!driverId || isNaN(dayOfWeek) || dayOfWeek < 0 || dayOfWeek > 6) {
    throw new Error('INVALID_PARAMS');
  }

  return { driverId, dayOfWeek };
};

// Fetches active driver by ID with role validation
// Input: Driver ID string  
// Output: Promise resolving to driver object or null if not found/invalid
const getActiveDriverOr404 = async (driverId: string) => {
  return await prisma.user.findUnique({
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
};

// Fetches enabled schedule entry for driver on specific day
// Input: Driver ID string, day of week number
// Output: Promise resolving to schedule entry object or null if not found/disabled  
const getEnabledScheduleOr404 = async (driverId: string, dayOfWeek: number) => {
  return await prisma.scheduleEntry.findFirst({
    where: {
      userId: driverId,
      dayOfWeek,
      enabled: true
    }
  });
};

// API endpoint: Get driver availability for specific day
// Input: Express Request with params {driverId, dayOfWeek}, Response
// Output: 200 with driver+schedule data, 400 for invalid params, 404 if not found
export const getDriverAvailability = async (req: Request, res: Response): Promise<void> => {
  try {
    const { driverId, dayOfWeek } = parseDriverIdAndDay(req);

    const driver = await getActiveDriverOr404(driverId);
    if (!driver) {
      res.status(404).json({
        success: false,
        message: 'Driver not found or not available'
      });
      return;
    }

    const scheduleEntry = await getEnabledScheduleOr404(driverId, dayOfWeek);
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
    if (error instanceof Error && error.message === 'INVALID_PARAMS') {
      res.status(400).json({
        success: false,
        message: 'Valid driver ID and day of week (0-6) are required'
      });
      return;
    }
    handleControllerError(res, error, 'Failed to fetch driver availability');
  }
};

// API endpoint: Find optimal drivers for to-campus trips
// Input: Express Request with params {userId} and body {dayOfWeek, toCampusTime, flexibilityMins}, Response
// Output: 200 with matching drivers array, 400 for validation/unknown campus, 404 if user not found
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

    const { results, geoNote } = await matchByTimeField({
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
        note: geoNote || 'Geo-based filtering applied'
      }
    });

  } catch (error) {
    if (error instanceof Error && error.message === 'USER_NOT_FOUND') {
      handleUserNotFound(res);
      return;
    }
    if (error instanceof Error && error.message.startsWith('UNKNOWN_CAMPUS:')) {
      const campus = error.message.substring('UNKNOWN_CAMPUS:'.length);
      res.status(400).json({
        success: false,
        message: `Unknown campus: ${campus}`,
        allowed: CAMPUS_NAMES
      });
      return;
    }
    handleControllerError(res, error, 'Failed to find optimal to-campus drivers');
  }
};

// API endpoint: Find optimal drivers for go-home trips
// Input: Express Request with params {userId} and body {dayOfWeek, goHomeTime, flexibilityMins}, Response  
// Output: 200 with matching drivers array, 400 for validation/unknown campus, 404 if user not found
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

    const { results, geoNote } = await matchByTimeField({
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
        note: geoNote || 'Geo-based filtering applied'
      }
    });

  } catch (error) {
    if (error instanceof Error && error.message === 'USER_NOT_FOUND') {
      handleUserNotFound(res);
      return;
    }
    if (error instanceof Error && error.message.startsWith('UNKNOWN_CAMPUS:')) {
      const campus = error.message.substring('UNKNOWN_CAMPUS:'.length);
      res.status(400).json({
        success: false,
        message: `Unknown campus: ${campus}`,
        allowed: CAMPUS_NAMES
      });
      return;
    }
    handleControllerError(res, error, 'Failed to find optimal go-home drivers');
  }
};

// API endpoint: Find optimal passengers for to-campus trips
// Input: Express Request with params {userId} and body {dayOfWeek, toCampusTime, flexibilityMins}, Response
// Output: 200 with matching passengers array, 400 for validation/unknown campus, 404 if user not found
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

    const { results, geoNote } = await matchByTimeField({
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
        note: geoNote || 'Geo-based filtering applied'
      }
    });

  } catch (error) {
    if (error instanceof Error && error.message === 'USER_NOT_FOUND') {
      handleUserNotFound(res);
      return;
    }
    if (error instanceof Error && error.message.startsWith('UNKNOWN_CAMPUS:')) {
      const campus = error.message.substring('UNKNOWN_CAMPUS:'.length);
      res.status(400).json({
        success: false,
        message: `Unknown campus: ${campus}`,
        allowed: CAMPUS_NAMES
      });
      return;
    }
    handleControllerError(res, error, 'Failed to find optimal to-campus passengers');
  }
};

// API endpoint: Find optimal passengers for go-home trips
// Input: Express Request with params {userId} and body {dayOfWeek, goHomeTime, flexibilityMins}, Response
// Output: 200 with matching passengers array, 400 for validation/unknown campus, 404 if user not found
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

    const { results, geoNote } = await matchByTimeField({
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
        note: geoNote || 'Geo-based filtering applied'
      }
    });

  } catch (error) {
    if (error instanceof Error && error.message === 'USER_NOT_FOUND') {
      handleUserNotFound(res);
      return;
    }
    if (error instanceof Error && error.message.startsWith('UNKNOWN_CAMPUS:')) {
      const campus = error.message.substring('UNKNOWN_CAMPUS:'.length);
      res.status(400).json({
        success: false,
        message: `Unknown campus: ${campus}`,
        allowed: CAMPUS_NAMES
      });
      return;
    }
    handleControllerError(res, error, 'Failed to find optimal go-home passengers');
  }
};