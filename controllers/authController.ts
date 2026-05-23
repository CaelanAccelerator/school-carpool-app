import { Request, Response } from 'express';
import Joi from 'joi';
import { asyncHandler } from '../middleware';
import { authService } from '../services/authService';

const loginSchema = Joi.object({
  email: Joi.string().email().required(),
  password: Joi.string().min(1).required()
});

const refreshSchema = Joi.object({
  refreshToken: Joi.string().required()
});

export const login = asyncHandler(async (req: Request, res: Response) => {
  const { error, value } = loginSchema.validate(req.body);
  if (error) {
    res.status(400).json({
      success: false,
      message: 'Validation error',
      details: error.details.map(d => d.message)
    });
    return;
  }

  const result = await authService.login(value.email, value.password);
  res.json({ success: true, data: result });
});

export const refresh = asyncHandler(async (req: Request, res: Response) => {
  const { error, value } = refreshSchema.validate(req.body);
  if (error) {
    res.status(400).json({ success: false, message: 'refreshToken is required' });
    return;
  }

  const result = await authService.refreshAccessToken(value.refreshToken);
  res.json({ success: true, data: result });
});

export const me = asyncHandler(async (req: Request, res: Response) => {
  const user = await authService.getMe(req.user!.id);
  res.json({ success: true, data: user });
});

export const logout = asyncHandler(async (req: Request, res: Response) => {
  const { refreshToken } = req.body;
  if (refreshToken) {
    await authService.logout(refreshToken);
  }
  res.json({ success: true, message: 'Logged out' });
});
