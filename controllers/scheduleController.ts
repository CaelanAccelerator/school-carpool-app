import { Request, Response } from 'express';
import Joi from 'joi';
import { prisma } from '../lib/prisma';

// Validation schemas
const createScheduleEntrySchema = Joi.object({
  dayOfWeek: Joi.number().integer().min(0).max(6).required(), // 0 = Sunday
  toCampusMins: Joi.number().integer().min(0).max(1439).required(), // 0-1439 minutes in a day
  goHomeMins: Joi.number().integer().min(0).max(1439).required(),
  toCampusFlexMin: Joi.number().integer().min(0).max(120).default(15),
  goHomeFlexMin: Joi.number().integer().min(0).max(120).default(15),
  enabled: Joi.boolean().default(true)
});

const updateScheduleEntrySchema = Joi.object({
  toCampusMins: Joi.number().integer().min(0).max(1439).optional(),
  goHomeMins: Joi.number().integer().min(0).max(1439).optional(),
  toCampusFlexMin: Joi.number().integer().min(0).max(120).optional(),
  goHomeFlexMin: Joi.number().integer().min(0).max(120).optional(),
  enabled: Joi.boolean().optional()
});



// Helper function to convert time string to minutes since midnight
const timeToMinutes = (timeStr: string): number => {
  const [hours, minutes] = timeStr.split(':').map(Number);
  return hours * 60 + minutes;
};

// Helper function to convert minutes since midnight to time string
const minutesToTime = (minutes: number): string => {
  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;
  return `${hours.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}`;
};

// Create a new schedule entry for a user
export const createScheduleEntry = async (req: Request, res: Response): Promise<void> => {
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
    const user = await prisma.user.findUnique({
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
    const scheduleEntry = await prisma.scheduleEntry.create({
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

  } catch (error: any) {
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

// Get all schedule entries for a user
export const getUserScheduleEntries = async (req: Request, res: Response): Promise<void> => {
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

    const scheduleEntries = await prisma.scheduleEntry.findMany({
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

  } catch (error) {
    console.error('Error fetching schedule entries:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch schedule entries'
    });
  }
};

// Get specific schedule entry by day
export const getScheduleEntryByDay = async (req: Request, res: Response): Promise<void> => {
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

    const scheduleEntry = await prisma.scheduleEntry.findUnique({
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

  } catch (error) {
    console.error('Error fetching schedule entry:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch schedule entry'
    });
  }
};

// Update schedule entry
export const updateScheduleEntry = async (req: Request, res: Response): Promise<void> => {
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

    const updatedEntry = await prisma.scheduleEntry.update({
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

  } catch (error: any) {
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

// Delete schedule entry
export const deleteScheduleEntry = async (req: Request, res: Response): Promise<void> => {
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

    await prisma.scheduleEntry.delete({
      where: { id: entryId }
    });

    res.status(200).json({
      success: true,
      message: 'Schedule entry deleted successfully'
    });

  } catch (error: any) {
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





// Bulk create/update schedule entries for all days of the week
export const createWeeklySchedule = async (req: Request, res: Response): Promise<void> => {
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

    const weeklyScheduleSchema = Joi.array().items(
      Joi.object({
        dayOfWeek: Joi.number().integer().min(0).max(6).required(),
        toCampusMins: Joi.number().integer().min(0).max(1439).required(),
        goHomeMins: Joi.number().integer().min(0).max(1439).required(),
        toCampusFlexMin: Joi.number().integer().min(0).max(120).default(15),
        goHomeFlexMin: Joi.number().integer().min(0).max(120).default(15),
        enabled: Joi.boolean().default(true)
      })
    ).min(1).max(7);

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
    const user = await prisma.user.findUnique({
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
    const result = await prisma.$transaction(async (tx: any) => {
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

  } catch (error: any) {
    console.error('Error creating weekly schedule:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to create weekly schedule'
    });
  }
};