import { Request, Response } from 'express';
import bcrypt from 'bcrypt';
import Joi from 'joi';
import { prisma } from '../lib/prisma';

// Validation schemas
const createUserSchema = Joi.object({
  email: Joi.string().email().required(),
  password: Joi.string().min(6).required(),
  name: Joi.string().required(),
  photoUrl: Joi.string().uri().optional(),
  contactType: Joi.string().valid('EMAIL', 'PHONE', 'WECHAT', 'OTHER').required(),
  contactValue: Joi.string().required(),
  campus: Joi.string().required(),
  homeArea: Joi.string().required(),
  role: Joi.string().valid('DRIVER', 'PASSENGER', 'BOTH').default('BOTH'),
  timeZone: Joi.string().default('America/Vancouver')
});

const updateUserSchema = Joi.object({
  name: Joi.string().optional(),
  photoUrl: Joi.string().uri().optional().allow(''),
  contactType: Joi.string().valid('EMAIL', 'PHONE', 'WECHAT', 'OTHER').optional(),
  contactValue: Joi.string().optional(),
  campus: Joi.string().optional(),
  homeArea: Joi.string().optional(),
  role: Joi.string().valid('DRIVER', 'PASSENGER', 'BOTH').optional(),
  timeZone: Joi.string().optional(),
  isActive: Joi.boolean().optional()
});

const changePasswordSchema = Joi.object({
  currentPassword: Joi.string().required(),
  newPassword: Joi.string().min(6).required()
});

// Helper function to hash password
const hashPassword = async (password: string): Promise<string> => {
  const saltRounds = 12;
  return await bcrypt.hash(password, saltRounds);
};

// Helper function to verify password
const verifyPassword = async (password: string, hashedPassword: string): Promise<boolean> => {
  return await bcrypt.compare(password, hashedPassword);
};

// Create a new user
export const createUser = async (req: Request, res: Response): Promise<void> => {
  try {
    const { error, value } = createUserSchema.validate(req.body);
    
    if (error) {
      res.status(400).json({
        success: false,
        error: 'Validation error',
        details: error.details.map(detail => detail.message)
      });
      return;
    }

    const { password, ...userData } = value;

    // Check if user already exists
    const existingUser = await prisma.user.findUnique({
      where: { email: userData.email }
    });

    if (existingUser) {
      res.status(409).json({
        success: false,
        error: 'User with this email already exists'
      });
      return;
    }

    // Hash password
    const passwordHash = await hashPassword(password);

    // Create user
    const newUser = await prisma.user.create({
      data: {
        ...userData,
        passwordHash
      },
      select: {
        id: true,
        email: true,
        name: true,
        photoUrl: true,
        contactType: true,
        contactValue: true,
        campus: true,
        homeArea: true,
        role: true,
        timeZone: true,
        isActive: true,
        createdAt: true,
        updatedAt: true
      }
    });

    res.status(201).json({
      success: true,
      data: newUser,
      message: 'User created successfully'
    });
  } catch (error) {
    console.error('Create user error:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error'
    });
  }
};

// Get all users with optional filtering
export const getUsers = async (req: Request, res: Response): Promise<void> => {
  try {
    const { campus, homeArea, role, isActive, page = '1', limit = '10' } = req.query;
    
    const pageNum = parseInt(page as string);
    const limitNum = parseInt(limit as string);
    const skip = (pageNum - 1) * limitNum;

    // Build filter object
    const where: any = {};
    if (campus) where.campus = campus;
    if (homeArea) where.homeArea = homeArea;
    if (role) where.role = role;
    if (isActive !== undefined) where.isActive = isActive === 'true';

    const [users, total] = await Promise.all([
      prisma.user.findMany({
        where,
        select: {
          id: true,
          email: true,
          name: true,
          photoUrl: true,
          contactType: true,
          contactValue: true,
          campus: true,
          homeArea: true,
          role: true,
          timeZone: true,
          isActive: true,
          createdAt: true,
          updatedAt: true
        },
        skip,
        take: limitNum,
        orderBy: { createdAt: 'desc' }
      }),
      prisma.user.count({ where })
    ]);

    res.json({
      success: true,
      data: users,
      pagination: {
        page: pageNum,
        limit: limitNum,
        total,
        totalPages: Math.ceil(total / limitNum)
      }
    });
  } catch (error) {
    console.error('Get users error:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error'
    });
  }
};

// Get user by ID
export const getUserById = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;

    const user = await prisma.user.findUnique({
      where: { id },
      select: {
        id: true,
        email: true,
        name: true,
        photoUrl: true,
        contactType: true,
        contactValue: true,
        campus: true,
        homeArea: true,
        role: true,
        timeZone: true,
        isActive: true,
        createdAt: true,
        updatedAt: true,
        schedule: {
          select: {
            id: true,
            dayOfWeek: true,
            toCampusMins: true,
            goHomeMins: true,
            toCampusFlexMin: true,
            goHomeFlexMin: true,
            enabled: true
          }
        },
        _count: {
          select: {
            sentConnections: true,
            receivedConnections: true
          }
        }
      }
    });

    if (!user) {
      res.status(404).json({
        success: false,
        error: 'User not found'
      });
      return;
    }

    res.json({
      success: true,
      data: user
    });
  } catch (error) {
    console.error('Get user error:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error'
    });
  }
};

// Update user
export const updateUser = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const { error, value } = updateUserSchema.validate(req.body);
    
    if (error) {
      res.status(400).json({
        success: false,
        error: 'Validation error',
        details: error.details.map(detail => detail.message)
      });
      return;
    }

    // Check if user exists
    const existingUser = await prisma.user.findUnique({
      where: { id }
    });

    if (!existingUser) {
      res.status(404).json({
        success: false,
        error: 'User not found'
      });
      return;
    }

    // Update user
    const updatedUser = await prisma.user.update({
      where: { id },
      data: value,
      select: {
        id: true,
        email: true,
        name: true,
        photoUrl: true,
        contactType: true,
        contactValue: true,
        campus: true,
        homeArea: true,
        role: true,
        timeZone: true,
        isActive: true,
        createdAt: true,
        updatedAt: true
      }
    });

    res.json({
      success: true,
      data: updatedUser,
      message: 'User updated successfully'
    });
  } catch (error) {
    console.error('Update user error:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error'
    });
  }
};

// Change user password
export const changePassword = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const { error, value } = changePasswordSchema.validate(req.body);
    
    if (error) {
      res.status(400).json({
        success: false,
        error: 'Validation error',
        details: error.details.map(detail => detail.message)
      });
      return;
    }

    const { currentPassword, newPassword } = value;

    // Get user with password hash
    const user = await prisma.user.findUnique({
      where: { id },
      select: {
        id: true,
        passwordHash: true
      }
    });

    if (!user) {
      res.status(404).json({
        success: false,
        error: 'User not found'
      });
      return;
    }

    // Verify current password
    const isCurrentPasswordValid = await verifyPassword(currentPassword, user.passwordHash);
    
    if (!isCurrentPasswordValid) {
      res.status(400).json({
        success: false,
        error: 'Current password is incorrect'
      });
      return;
    }

    // Hash new password and update
    const newPasswordHash = await hashPassword(newPassword);
    
    await prisma.user.update({
      where: { id },
      data: { passwordHash: newPasswordHash }
    });

    res.json({
      success: true,
      message: 'Password changed successfully'
    });
  } catch (error) {
    console.error('Change password error:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error'
    });
  }
};

// Delete user (soft delete by setting isActive to false)
export const deleteUser = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;

    // Check if user exists
    const existingUser = await prisma.user.findUnique({
      where: { id }
    });

    if (!existingUser) {
      res.status(404).json({
        success: false,
        error: 'User not found'
      });
      return;
    }

    // Soft delete by setting isActive to false
    await prisma.user.update({
      where: { id },
      data: { isActive: false }
    });

    res.json({
      success: true,
      message: 'User deactivated successfully'
    });
  } catch (error) {
    console.error('Delete user error:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error'
    });
  }
};

// Permanently delete user (hard delete)
export const permanentDeleteUser = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;

    // Check if user exists
    const existingUser = await prisma.user.findUnique({
      where: { id }
    });

    if (!existingUser) {
      res.status(404).json({
        success: false,
        error: 'User not found'
      });
      return;
    }

    // Hard delete user (cascade will handle related records)
    await prisma.user.delete({
      where: { id }
    });

    res.json({
      success: true,
      message: 'User permanently deleted'
    });
  } catch (error) {
    console.error('Permanent delete user error:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error'
    });
  }
};