"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.createWeeklySchedule = exports.deleteScheduleEntry = exports.updateScheduleEntry = exports.getScheduleEntryByDay = exports.getUserScheduleEntries = exports.createScheduleEntry = void 0;
const joi_1 = __importDefault(require("joi"));
const prisma_1 = require("../lib/prisma");
// Validation schemas
const createScheduleEntrySchema = joi_1.default.object({
    dayOfWeek: joi_1.default.number().integer().min(0).max(6).required(), // 0 = Sunday
    toCampusMins: joi_1.default.number().integer().min(0).max(1439).required(), // 0-1439 minutes in a day
    goHomeMins: joi_1.default.number().integer().min(0).max(1439).required(),
    toCampusFlexMin: joi_1.default.number().integer().min(0).max(120).default(15),
    goHomeFlexMin: joi_1.default.number().integer().min(0).max(120).default(15),
    enabled: joi_1.default.boolean().default(true)
});
const updateScheduleEntrySchema = joi_1.default.object({
    toCampusMins: joi_1.default.number().integer().min(0).max(1439).optional(),
    goHomeMins: joi_1.default.number().integer().min(0).max(1439).optional(),
    toCampusFlexMin: joi_1.default.number().integer().min(0).max(120).optional(),
    goHomeFlexMin: joi_1.default.number().integer().min(0).max(120).optional(),
    enabled: joi_1.default.boolean().optional()
});
// Helper function to convert time string to minutes since midnight
const timeToMinutes = (timeStr) => {
    const [hours, minutes] = timeStr.split(':').map(Number);
    return hours * 60 + minutes;
};
// Helper function to convert minutes since midnight to time string
const minutesToTime = (minutes) => {
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return `${hours.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}`;
};
// Create a new schedule entry for a user
const createScheduleEntry = async (req, res) => {
    try {
        const { error, value } = createScheduleEntrySchema.validate(req.body);
        if (error) {
            res.status(400).json({
                success: false,
                message: 'Validation error',
                errors: error.details.map(detail => detail.message)
            });
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
        // Check if user exists
        const user = await prisma_1.prisma.user.findUnique({
            where: { id: userId }
        });
        if (!user) {
            res.status(404).json({
                success: false,
                message: 'User not found'
            });
            return;
        }
        // Create schedule entry
        const scheduleEntry = await prisma_1.prisma.scheduleEntry.create({
            data: {
                userId,
                ...value
            },
            include: {
                user: {
                    select: {
                        id: true,
                        name: true,
                        campus: true,
                        homeArea: true,
                        role: true
                    }
                }
            }
        });
        res.status(201).json({
            success: true,
            message: 'Schedule entry created successfully',
            data: scheduleEntry
        });
    }
    catch (error) {
        console.error('Error creating schedule entry:', error);
        if (error.code === 'P2002') {
            res.status(409).json({
                success: false,
                message: 'Schedule entry for this day already exists'
            });
            return;
        }
        res.status(500).json({
            success: false,
            message: 'Failed to create schedule entry'
        });
    }
};
exports.createScheduleEntry = createScheduleEntry;
// Get all schedule entries for a user
const getUserScheduleEntries = async (req, res) => {
    try {
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
        const scheduleEntries = await prisma_1.prisma.scheduleEntry.findMany({
            where: { userId },
            orderBy: { dayOfWeek: 'asc' },
            include: {
                user: {
                    select: {
                        id: true,
                        name: true,
                        campus: true,
                        homeArea: true,
                        role: true
                    }
                }
            }
        });
        res.status(200).json({
            success: true,
            data: scheduleEntries
        });
    }
    catch (error) {
        console.error('Error fetching schedule entries:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch schedule entries'
        });
    }
};
exports.getUserScheduleEntries = getUserScheduleEntries;
// Get specific schedule entry by day
const getScheduleEntryByDay = async (req, res) => {
    try {
        const userId = Array.isArray(req.params.userId)
            ? req.params.userId[0]
            : req.params.userId;
        const dayOfWeekParam = Array.isArray(req.params.dayOfWeek)
            ? req.params.dayOfWeek[0]
            : req.params.dayOfWeek;
        const dayOfWeek = parseInt(dayOfWeekParam || '');
        if (!userId || isNaN(dayOfWeek) || dayOfWeek < 0 || dayOfWeek > 6) {
            res.status(400).json({
                success: false,
                message: 'Valid User ID and day of week (0-6) are required'
            });
            return;
        }
        const scheduleEntry = await prisma_1.prisma.scheduleEntry.findUnique({
            where: {
                userId_dayOfWeek: {
                    userId,
                    dayOfWeek
                }
            },
            include: {
                user: {
                    select: {
                        id: true,
                        name: true,
                        campus: true,
                        homeArea: true,
                        role: true
                    }
                }
            }
        });
        if (!scheduleEntry) {
            res.status(404).json({
                success: false,
                message: 'Schedule entry not found for this day'
            });
            return;
        }
        res.status(200).json({
            success: true,
            data: scheduleEntry
        });
    }
    catch (error) {
        console.error('Error fetching schedule entry:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch schedule entry'
        });
    }
};
exports.getScheduleEntryByDay = getScheduleEntryByDay;
// Update schedule entry
const updateScheduleEntry = async (req, res) => {
    try {
        const { error, value } = updateScheduleEntrySchema.validate(req.body);
        if (error) {
            res.status(400).json({
                success: false,
                message: 'Validation error',
                errors: error.details.map(detail => detail.message)
            });
            return;
        }
        const entryId = Array.isArray(req.params.entryId)
            ? req.params.entryId[0]
            : req.params.entryId;
        if (!entryId) {
            res.status(400).json({
                success: false,
                message: 'Schedule entry ID is required'
            });
            return;
        }
        const updatedEntry = await prisma_1.prisma.scheduleEntry.update({
            where: { id: entryId },
            data: value,
            include: {
                user: {
                    select: {
                        id: true,
                        name: true,
                        campus: true,
                        homeArea: true,
                        role: true
                    }
                }
            }
        });
        res.status(200).json({
            success: true,
            message: 'Schedule entry updated successfully',
            data: updatedEntry
        });
    }
    catch (error) {
        console.error('Error updating schedule entry:', error);
        if (error.code === 'P2025') {
            res.status(404).json({
                success: false,
                message: 'Schedule entry not found'
            });
            return;
        }
        res.status(500).json({
            success: false,
            message: 'Failed to update schedule entry'
        });
    }
};
exports.updateScheduleEntry = updateScheduleEntry;
// Delete schedule entry
const deleteScheduleEntry = async (req, res) => {
    try {
        const entryId = Array.isArray(req.params.entryId)
            ? req.params.entryId[0]
            : req.params.entryId;
        if (!entryId) {
            res.status(400).json({
                success: false,
                message: 'Schedule entry ID is required'
            });
            return;
        }
        await prisma_1.prisma.scheduleEntry.delete({
            where: { id: entryId }
        });
        res.status(200).json({
            success: true,
            message: 'Schedule entry deleted successfully'
        });
    }
    catch (error) {
        console.error('Error deleting schedule entry:', error);
        if (error.code === 'P2025') {
            res.status(404).json({
                success: false,
                message: 'Schedule entry not found'
            });
            return;
        }
        res.status(500).json({
            success: false,
            message: 'Failed to delete schedule entry'
        });
    }
};
exports.deleteScheduleEntry = deleteScheduleEntry;
// Bulk create/update schedule entries for all days of the week
const createWeeklySchedule = async (req, res) => {
    try {
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
        const weeklyScheduleSchema = joi_1.default.array().items(joi_1.default.object({
            dayOfWeek: joi_1.default.number().integer().min(0).max(6).required(),
            toCampusMins: joi_1.default.number().integer().min(0).max(1439).required(),
            goHomeMins: joi_1.default.number().integer().min(0).max(1439).required(),
            toCampusFlexMin: joi_1.default.number().integer().min(0).max(120).default(15),
            goHomeFlexMin: joi_1.default.number().integer().min(0).max(120).default(15),
            enabled: joi_1.default.boolean().default(true)
        })).min(1).max(7);
        const { error, value: scheduleEntries } = weeklyScheduleSchema.validate(req.body);
        if (error) {
            res.status(400).json({
                success: false,
                message: 'Validation error',
                errors: error.details.map(detail => detail.message)
            });
            return;
        }
        // Check if user exists
        const user = await prisma_1.prisma.user.findUnique({
            where: { id: userId }
        });
        if (!user) {
            res.status(404).json({
                success: false,
                message: 'User not found'
            });
            return;
        }
        // Use transaction to create/update all entries
        const result = await prisma_1.prisma.$transaction(async (tx) => {
            const createdEntries = [];
            for (const entry of scheduleEntries) {
                const upsertedEntry = await tx.scheduleEntry.upsert({
                    where: {
                        userId_dayOfWeek: {
                            userId,
                            dayOfWeek: entry.dayOfWeek
                        }
                    },
                    update: {
                        toCampusMins: entry.toCampusMins,
                        goHomeMins: entry.goHomeMins,
                        toCampusFlexMin: entry.toCampusFlexMin,
                        goHomeFlexMin: entry.goHomeFlexMin,
                        enabled: entry.enabled
                    },
                    create: {
                        userId,
                        ...entry
                    },
                    include: {
                        user: {
                            select: {
                                id: true,
                                name: true,
                                campus: true,
                                homeArea: true,
                                role: true
                            }
                        }
                    }
                });
                createdEntries.push(upsertedEntry);
            }
            return createdEntries;
        });
        res.status(200).json({
            success: true,
            message: 'Weekly schedule created/updated successfully',
            data: result
        });
    }
    catch (error) {
        console.error('Error creating weekly schedule:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to create weekly schedule'
        });
    }
};
exports.createWeeklySchedule = createWeeklySchedule;
//# sourceMappingURL=scheduleController.js.map