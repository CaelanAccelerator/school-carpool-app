"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.findOptimalPassengersGoHome = exports.findOptimalPassengersToCampus = exports.findOptimalDriversGoHome = exports.findOptimalDriversToCampus = exports.getDriverAvailability = void 0;
const client_1 = require("@prisma/client");
const joi_1 = __importDefault(require("joi"));
const campusCoords_1 = require("../lib/config/campusCoords");
const MockGeoProvider_1 = require("../lib/geo/MockGeoProvider");
const prisma_1 = require("../lib/prisma");
const timeUtils_1 = require("../lib/timeUtils");
// Validation schemas
const toCampusSchema = joi_1.default.object({
    dayOfWeek: joi_1.default.number().integer().min(0).max(6).required(),
    toCampusTime: joi_1.default.string().pattern(/^([0-1]?[0-9]|2[0-3]):([0-5][0-9])$/).required(),
    flexibilityMins: joi_1.default.number().integer().min(0).max(120).default(15)
});
const goHomeSchema = joi_1.default.object({
    dayOfWeek: joi_1.default.number().integer().min(0).max(6).required(),
    goHomeTime: joi_1.default.string().pattern(/^([0-1]?[0-9]|2[0-3]):([0-5][0-9])$/).required(),
    flexibilityMins: joi_1.default.number().integer().min(0).max(120).default(15)
});
// Error handling helper
const handleControllerError = (res, error, defaultMessage) => {
    console.error(`Controller error: ${defaultMessage}`, error);
    res.status(500).json({
        success: false,
        message: defaultMessage
    });
};
const handleUserNotFound = (res) => {
    res.status(404).json({
        success: false,
        message: 'User not found'
    });
};
const handleValidationError = (res, error) => {
    res.status(400).json({
        success: false,
        message: 'Validation error',
        errors: error.details.map(detail => detail.message)
    });
};
const geoProvider = new MockGeoProvider_1.MockGeoProvider();
const mapWithConcurrency = async (items, limit, mapper) => {
    const results = [];
    for (let index = 0; index < items.length; index += limit) {
        const batch = items.slice(index, index + limit);
        const batchResults = await Promise.all(batch.map(mapper));
        results.push(...batchResults);
    }
    return results;
};
// Helper functions for matching logic
const getRequesterOrThrow = async (userId) => {
    const user = await prisma_1.prisma.user.findUnique({
        where: { id: userId },
        select: { campus: true, homeArea: true, homeLat: true, homeLng: true }
    });
    if (!user) {
        throw new Error('USER_NOT_FOUND');
    }
    return user;
};
const buildTargetRoles = (targetRoleGroup) => {
    return targetRoleGroup === 'DRIVER'
        ? [client_1.Role.DRIVER, client_1.Role.BOTH]
        : [client_1.Role.PASSENGER, client_1.Role.BOTH];
};
const queryMatchingEntries = async ({ dayOfWeek, userCampus, userId, targetRoles, timeField, timeFilter }) => {
    return await prisma_1.prisma.scheduleEntry.findMany({
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
const buildBaseResults = (matchingEntries, timeField, timeMins) => {
    return matchingEntries.map((entry) => {
        const entryTimeMins = entry[timeField];
        const timeDifference = Math.abs(entryTimeMins - timeMins);
        return {
            ...entry,
            matchingScore: {
                timeDifference,
                field: timeField,
                targetTimeFormatted: (0, timeUtils_1.minutesToTime)(timeMins),
                entryTimeFormatted: (0, timeUtils_1.minutesToTime)(entryTimeMins),
                toCampusTimeFormatted: (0, timeUtils_1.minutesToTime)(entry.toCampusMins),
                goHomeTimeFormatted: (0, timeUtils_1.minutesToTime)(entry.goHomeMins)
            },
            geoInfo: {
                baseMins: null,
                viaMins: null,
                extraDetourMins: null
            }
        };
    });
};
const applyGeoDetourFilter = async (baseResults, requester, campusCoords, timeField) => {
    const detourResults = await mapWithConcurrency(baseResults, 5, async (entry) => {
        if (entry.user.homeLat == null || entry.user.homeLng == null) {
            return null;
        }
        const detour = await geoProvider.detourExtraMins({ lat: entry.user.homeLat, lng: entry.user.homeLng }, { lat: requester.homeLat, lng: requester.homeLng }, campusCoords);
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
    return detourResults.filter((entry) => entry !== null);
};
const sortResults = (results) => {
    return results.sort((a, b) => {
        const extraDiff = a.geoInfo.extraDetourMins - b.geoInfo.extraDetourMins;
        if (extraDiff !== 0) {
            return extraDiff;
        }
        return a.matchingScore.timeDifference - b.matchingScore.timeDifference;
    });
};
// Shared matching function
const matchByTimeField = async (params) => {
    const { userId, dayOfWeek, timeValue, flexibilityMins, timeField, targetRoleGroup } = params;
    // Convert time string to minutes
    const timeMins = (0, timeUtils_1.timeToMinutes)(timeValue);
    // Get user's info - this will throw USER_NOT_FOUND if missing
    const user = await getRequesterOrThrow(userId);
    // Validate campus and get coordinates - let UNKNOWN_CAMPUS bubble up
    const campusCoords = (0, campusCoords_1.getCampusCoords)(user.campus);
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
            results: baseResults.sort((a, b) => a.matchingScore.timeDifference - b.matchingScore.timeDifference),
            geoNote: 'Geo filtering skipped: requester home location missing.'
        };
    }
    // Apply geo detour filtering and sorting
    const filteredResults = await applyGeoDetourFilter(baseResults, { homeLat: user.homeLat, homeLng: user.homeLng }, campusCoords, timeField);
    return {
        results: sortResults(filteredResults),
        geoNote: undefined
    };
};
// Helper functions for driver availability
const parseDriverIdAndDay = (req) => {
    const driverId = Array.isArray(req.params.driverId)
        ? req.params.driverId[0]
        : req.params.driverId;
    const dayOfWeek = parseInt(req.params.dayOfWeek);
    if (!driverId || isNaN(dayOfWeek) || dayOfWeek < 0 || dayOfWeek > 6) {
        throw new Error('INVALID_PARAMS');
    }
    return { driverId, dayOfWeek };
};
const getActiveDriverOr404 = async (driverId) => {
    return await prisma_1.prisma.user.findUnique({
        where: {
            id: driverId,
            role: { in: [client_1.Role.DRIVER, client_1.Role.BOTH] },
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
const getEnabledScheduleOr404 = async (driverId, dayOfWeek) => {
    return await prisma_1.prisma.scheduleEntry.findFirst({
        where: {
            userId: driverId,
            dayOfWeek,
            enabled: true
        }
    });
};
const getDriverAvailability = async (req, res) => {
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
                    toCampusTimeFormatted: (0, timeUtils_1.minutesToTime)(scheduleEntry.toCampusMins),
                    goHomeTimeFormatted: (0, timeUtils_1.minutesToTime)(scheduleEntry.goHomeMins)
                }
            }
        });
    }
    catch (error) {
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
exports.getDriverAvailability = getDriverAvailability;
// Find optimal drivers for to-campus trips
const findOptimalDriversToCampus = async (req, res) => {
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
                note: geoNote || 'Geo-based filtering will be implemented with distance API integration'
            }
        });
    }
    catch (error) {
        if (error instanceof Error && error.message === 'USER_NOT_FOUND') {
            handleUserNotFound(res);
            return;
        }
        if (error instanceof Error && error.message.startsWith('UNKNOWN_CAMPUS:')) {
            const campus = error.message.substring('UNKNOWN_CAMPUS:'.length);
            res.status(400).json({
                success: false,
                message: `Unknown campus: ${campus}`,
                allowed: campusCoords_1.CAMPUS_NAMES
            });
            return;
        }
        handleControllerError(res, error, 'Failed to find optimal to-campus drivers');
    }
};
exports.findOptimalDriversToCampus = findOptimalDriversToCampus;
// Find optimal drivers for go-home trips
const findOptimalDriversGoHome = async (req, res) => {
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
                note: geoNote || 'Geo-based filtering will be implemented with distance API integration'
            }
        });
    }
    catch (error) {
        if (error instanceof Error && error.message === 'USER_NOT_FOUND') {
            handleUserNotFound(res);
            return;
        }
        if (error instanceof Error && error.message.startsWith('UNKNOWN_CAMPUS:')) {
            const campus = error.message.substring('UNKNOWN_CAMPUS:'.length);
            res.status(400).json({
                success: false,
                message: `Unknown campus: ${campus}`,
                allowed: campusCoords_1.CAMPUS_NAMES
            });
            return;
        }
        handleControllerError(res, error, 'Failed to find optimal go-home drivers');
    }
};
exports.findOptimalDriversGoHome = findOptimalDriversGoHome;
// Find optimal passengers for to-campus trips
const findOptimalPassengersToCampus = async (req, res) => {
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
                note: geoNote || 'Geo-based filtering will be implemented with distance API integration'
            }
        });
    }
    catch (error) {
        if (error instanceof Error && error.message === 'USER_NOT_FOUND') {
            handleUserNotFound(res);
            return;
        }
        if (error instanceof Error && error.message.startsWith('UNKNOWN_CAMPUS:')) {
            const campus = error.message.substring('UNKNOWN_CAMPUS:'.length);
            res.status(400).json({
                success: false,
                message: `Unknown campus: ${campus}`,
                allowed: campusCoords_1.CAMPUS_NAMES
            });
            return;
        }
        handleControllerError(res, error, 'Failed to find optimal to-campus passengers');
    }
};
exports.findOptimalPassengersToCampus = findOptimalPassengersToCampus;
// Find optimal passengers for go-home trips
const findOptimalPassengersGoHome = async (req, res) => {
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
                note: geoNote || 'Geo-based filtering will be implemented with distance API integration'
            }
        });
    }
    catch (error) {
        if (error instanceof Error && error.message === 'USER_NOT_FOUND') {
            handleUserNotFound(res);
            return;
        }
        if (error instanceof Error && error.message.startsWith('UNKNOWN_CAMPUS:')) {
            const campus = error.message.substring('UNKNOWN_CAMPUS:'.length);
            res.status(400).json({
                success: false,
                message: `Unknown campus: ${campus}`,
                allowed: campusCoords_1.CAMPUS_NAMES
            });
            return;
        }
        handleControllerError(res, error, 'Failed to find optimal go-home passengers');
    }
};
exports.findOptimalPassengersGoHome = findOptimalPassengersGoHome;
//# sourceMappingURL=matchingController.js.map