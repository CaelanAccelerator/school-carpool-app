import { Request, Response } from 'express';
import Joi from 'joi';
import { asyncHandler } from '../middleware';
import { userService } from '../services/userService';

const createUserSchema = Joi.object({
  email: Joi.string().email().required(),
  password: Joi.string().min(6).required(),
  name: Joi.string().required(),
  photoUrl: Joi.string().uri().optional().allow(''),
  contactType: Joi.string().valid('EMAIL', 'PHONE', 'WECHAT', 'OTHER').required(),
  contactValue: Joi.string().required(),
  campus: Joi.string().required(),
  homeArea: Joi.string().required(),
  role: Joi.string().valid('DRIVER', 'PASSENGER', 'BOTH').default('BOTH'),
  timeZone: Joi.string().default('America/Vancouver'),
  homeAddress: Joi.string().optional().allow(''),
  homeLat: Joi.number().optional(),
  homeLng: Joi.number().optional()
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
  isActive: Joi.boolean().optional(),
  homeAddress: Joi.string().optional().allow(''),
  homeLat: Joi.number().optional().allow(null),
  homeLng: Joi.number().optional().allow(null)
});

const changePasswordSchema = Joi.object({
  currentPassword: Joi.string().required(),
  newPassword: Joi.string().min(6).required()
});

export const createUser = asyncHandler(async (req: Request, res: Response) => {
  const { error, value } = createUserSchema.validate(req.body);
  if (error) {
    res.status(400).json({
      success: false,
      error: 'Validation error',
      details: error.details.map(d => d.message)
    });
    return;
  }

  const user = await userService.createUser(value);
  res.status(201).json({ success: true, data: user, message: 'User created successfully' });
});

export const getUsers = asyncHandler(async (req: Request, res: Response) => {
  const result = await userService.getUsers(req.query as Record<string, string>);
  res.json({ success: true, ...result });
});

export const getUserById = asyncHandler(async (req: Request, res: Response) => {
  const id = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  const user = await userService.getUserById(id);
  res.json({ success: true, data: user });
});

export const updateUser = asyncHandler(async (req: Request, res: Response) => {
  const id = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  const { error, value } = updateUserSchema.validate(req.body);
  if (error) {
    res.status(400).json({
      success: false,
      error: 'Validation error',
      details: error.details.map(d => d.message)
    });
    return;
  }

  const user = await userService.updateUser(id, value);
  res.json({ success: true, data: user, message: 'User updated successfully' });
});

export const changePassword = asyncHandler(async (req: Request, res: Response) => {
  const id = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  const { error, value } = changePasswordSchema.validate(req.body);
  if (error) {
    res.status(400).json({
      success: false,
      error: 'Validation error',
      details: error.details.map(d => d.message)
    });
    return;
  }

  await userService.changePassword(id, value.currentPassword, value.newPassword);
  res.json({ success: true, message: 'Password changed successfully' });
});

export const deleteUser = asyncHandler(async (req: Request, res: Response) => {
  const id = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  await userService.deleteUser(id);
  res.json({ success: true, message: 'User deactivated successfully' });
});

export const permanentDeleteUser = asyncHandler(async (req: Request, res: Response) => {
  const id = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  await userService.permanentDeleteUser(id);
  res.json({ success: true, message: 'User permanently deleted' });
});
