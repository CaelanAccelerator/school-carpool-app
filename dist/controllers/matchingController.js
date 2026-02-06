"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.findOptimalPassengersGoHome = exports.findOptimalPassengersToCampus = exports.findOptimalDriversGoHome = exports.findOptimalDriversToCampus = exports.getDriverAvailability = void 0;
const client_1 = require("@prisma/client");
const joi_1 = __importDefault(require("joi"));
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
// Shared matching function
const matchByTimeField = async (params) => {
    const { userId, dayOfWeek, timeValue, flexibilityMins, timeField, targetRoleGroup } = params;
    // Convert time string to minutes
    const timeMins = (0, timeUtils_1.timeToMinutes)(timeValue);
    // Get user's info to match campus
    const user = await prisma_1.prisma.user.findUnique({
        where: { id: userId },
        select: { campus: true, homeArea: true }
    });
    if (!user) {
        throw new Error('USER_NOT_FOUND');
    }
    // Determine target roles based on group
    const targetRoles = targetRoleGroup === 'DRIVER'
        ? [client_1.Role.DRIVER, client_1.Role.BOTH]
        : [client_1.Role.PASSENGER, client_1.Role.BOTH];
    // Build time filter condition
    const timeFilter = {
        [timeField]: {
            gte: timeMins - flexibilityMins,
            lte: timeMins + flexibilityMins
        }
    };
    // Query matching entries
    const matchingEntries = await prisma_1.prisma.scheduleEntry.findMany({
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
    const results = matchingEntries.map((entry) => {
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
                // Placeholder for geo API integration
                estimatedPickupTime: null,
                distance: null,
                route: null
            }
        };
    });
    // Sort by time difference (ascending)
    return results.sort((a, b) => a.matchingScore.timeDifference - b.matchingScore.timeDifference);
};
const getDriverAvailability = async (req, res) => {
    try {
        const driverId = Array.isArray(req.params.driverId)
            ? req.params.driverId[0]
            : req.params.driverId;
        const dayOfWeek = parseInt(req.params.dayOfWeek);
        if (!driverId || isNaN(dayOfWeek) || dayOfWeek < 0 || dayOfWeek > 6) {
            res.status(400).json({
                success: false,
                message: 'Valid driver ID and day of week (0-6) are required'
            });
            return;
        }
        // Verify the user is a driver
        const driver = await prisma_1.prisma.user.findUnique({
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
        if (!driver) {
            res.status(404).json({
                success: false,
                message: 'Driver not found or not available'
            });
            return;
        }
        // Use findFirst to check enabled status in query
        const scheduleEntry = await prisma_1.prisma.scheduleEntry.findFirst({
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
                    toCampusTimeFormatted: (0, timeUtils_1.minutesToTime)(scheduleEntry.toCampusMins),
                    goHomeTimeFormatted: (0, timeUtils_1.minutesToTime)(scheduleEntry.goHomeMins)
                }
            }
        });
    }
    catch (error) {
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
    }
    catch (error) {
        if (error instanceof Error && error.message === 'USER_NOT_FOUND') {
            handleUserNotFound(res);
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
    }
    catch (error) {
        if (error instanceof Error && error.message === 'USER_NOT_FOUND') {
            handleUserNotFound(res);
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
    }
    catch (error) {
        if (error instanceof Error && error.message === 'USER_NOT_FOUND') {
            handleUserNotFound(res);
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
    }
    catch (error) {
        if (error instanceof Error && error.message === 'USER_NOT_FOUND') {
            handleUserNotFound(res);
            return;
        }
        handleControllerError(res, error, 'Failed to find optimal go-home passengers');
    }
};
exports.findOptimalPassengersGoHome = findOptimalPassengersGoHome;
//# sourceMappingURL=matchingController.js.map