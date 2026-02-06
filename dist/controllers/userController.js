"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.permanentDeleteUser = exports.deleteUser = exports.changePassword = exports.updateUser = exports.getUserById = exports.getUsers = exports.createUser = void 0;
const bcrypt_1 = __importDefault(require("bcrypt"));
const joi_1 = __importDefault(require("joi"));
const prisma_1 = require("../lib/prisma");
// Validation schemas
const createUserSchema = joi_1.default.object({
    email: joi_1.default.string().email().required(),
    password: joi_1.default.string().min(6).required(),
    name: joi_1.default.string().required(),
    photoUrl: joi_1.default.string().uri().optional(),
    contactType: joi_1.default.string().valid('EMAIL', 'PHONE', 'WECHAT', 'OTHER').required(),
    contactValue: joi_1.default.string().required(),
    campus: joi_1.default.string().required(),
    homeArea: joi_1.default.string().required(),
    role: joi_1.default.string().valid('DRIVER', 'PASSENGER', 'BOTH').default('BOTH'),
    timeZone: joi_1.default.string().default('America/Vancouver')
});
const updateUserSchema = joi_1.default.object({
    name: joi_1.default.string().optional(),
    photoUrl: joi_1.default.string().uri().optional().allow(''),
    contactType: joi_1.default.string().valid('EMAIL', 'PHONE', 'WECHAT', 'OTHER').optional(),
    contactValue: joi_1.default.string().optional(),
    campus: joi_1.default.string().optional(),
    homeArea: joi_1.default.string().optional(),
    role: joi_1.default.string().valid('DRIVER', 'PASSENGER', 'BOTH').optional(),
    timeZone: joi_1.default.string().optional(),
    isActive: joi_1.default.boolean().optional()
});
const changePasswordSchema = joi_1.default.object({
    currentPassword: joi_1.default.string().required(),
    newPassword: joi_1.default.string().min(6).required()
});
// Helper function to hash password
const hashPassword = async (password) => {
    const saltRounds = 12;
    return await bcrypt_1.default.hash(password, saltRounds);
};
// Helper function to verify password
const verifyPassword = async (password, hashedPassword) => {
    return await bcrypt_1.default.compare(password, hashedPassword);
};
// Create a new user
const createUser = async (req, res) => {
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
        const existingUser = await prisma_1.prisma.user.findUnique({
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
        const newUser = await prisma_1.prisma.user.create({
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
    }
    catch (error) {
        console.error('Create user error:', error);
        res.status(500).json({
            success: false,
            error: 'Internal server error'
        });
    }
};
exports.createUser = createUser;
// Get all users with optional filtering
const getUsers = async (req, res) => {
    try {
        const { campus, homeArea, role, isActive, page = '1', limit = '10' } = req.query;
        const pageNum = parseInt(page);
        const limitNum = parseInt(limit);
        const skip = (pageNum - 1) * limitNum;
        // Build filter object
        const where = {};
        if (campus)
            where.campus = campus;
        if (homeArea)
            where.homeArea = homeArea;
        if (role)
            where.role = role;
        if (isActive !== undefined)
            where.isActive = isActive === 'true';
        const [users, total] = await Promise.all([
            prisma_1.prisma.user.findMany({
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
            prisma_1.prisma.user.count({ where })
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
    }
    catch (error) {
        console.error('Get users error:', error);
        res.status(500).json({
            success: false,
            error: 'Internal server error'
        });
    }
};
exports.getUsers = getUsers;
// Get user by ID
const getUserById = async (req, res) => {
    try {
        const id = Array.isArray(req.params.id)
            ? req.params.id[0]
            : req.params.id;
        const user = await prisma_1.prisma.user.findUnique({
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
    }
    catch (error) {
        console.error('Get user error:', error);
        res.status(500).json({
            success: false,
            error: 'Internal server error'
        });
    }
};
exports.getUserById = getUserById;
// Update user
const updateUser = async (req, res) => {
    try {
        const id = Array.isArray(req.params.id)
            ? req.params.id[0]
            : req.params.id;
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
        const existingUser = await prisma_1.prisma.user.findUnique({
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
        const updatedUser = await prisma_1.prisma.user.update({
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
    }
    catch (error) {
        console.error('Update user error:', error);
        res.status(500).json({
            success: false,
            error: 'Internal server error'
        });
    }
};
exports.updateUser = updateUser;
// Change user password
const changePassword = async (req, res) => {
    try {
        const id = Array.isArray(req.params.id)
            ? req.params.id[0]
            : req.params.id;
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
        const user = await prisma_1.prisma.user.findUnique({
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
        await prisma_1.prisma.user.update({
            where: { id },
            data: { passwordHash: newPasswordHash }
        });
        res.json({
            success: true,
            message: 'Password changed successfully'
        });
    }
    catch (error) {
        console.error('Change password error:', error);
        res.status(500).json({
            success: false,
            error: 'Internal server error'
        });
    }
};
exports.changePassword = changePassword;
// Delete user (soft delete by setting isActive to false)
const deleteUser = async (req, res) => {
    try {
        const id = Array.isArray(req.params.id)
            ? req.params.id[0]
            : req.params.id;
        // Check if user exists
        const existingUser = await prisma_1.prisma.user.findUnique({
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
        await prisma_1.prisma.user.update({
            where: { id },
            data: { isActive: false }
        });
        res.json({
            success: true,
            message: 'User deactivated successfully'
        });
    }
    catch (error) {
        console.error('Delete user error:', error);
        res.status(500).json({
            success: false,
            error: 'Internal server error'
        });
    }
};
exports.deleteUser = deleteUser;
// Permanently delete user (hard delete)
const permanentDeleteUser = async (req, res) => {
    try {
        const id = Array.isArray(req.params.id)
            ? req.params.id[0]
            : req.params.id;
        // Check if user exists
        const existingUser = await prisma_1.prisma.user.findUnique({
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
        await prisma_1.prisma.user.delete({
            where: { id }
        });
        res.json({
            success: true,
            message: 'User permanently deleted'
        });
    }
    catch (error) {
        console.error('Permanent delete user error:', error);
        res.status(500).json({
            success: false,
            error: 'Internal server error'
        });
    }
};
exports.permanentDeleteUser = permanentDeleteUser;
//# sourceMappingURL=userController.js.map