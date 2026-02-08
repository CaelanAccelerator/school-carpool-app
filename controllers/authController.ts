import bcrypt from 'bcrypt';
import { Request, Response } from 'express';
import Joi from 'joi';
import { prisma } from '../lib/prisma';

const loginSchema = Joi.object({
  email: Joi.string().email().required(),
  password: Joi.string().min(1).required()
});

const userSelect = {
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
  homeAddress: true,
  homeLat: true,
  homeLng: true,
  isActive: true,
  createdAt: true,
  updatedAt: true
};

export const login = async (req: Request, res: Response): Promise<void> => {
  const { error, value } = loginSchema.validate(req.body);
  if (error) {
    res.status(400).json({
      success: false,
      message: 'Validation error',
      details: error.details.map(detail => detail.message)
    });
    return;
  }

  const { email, password } = value;

  try {
    const user = await prisma.user.findUnique({
      where: { email },
      select: { ...userSelect, passwordHash: true }
    });

    if (!user || !user.isActive) {
      res.status(401).json({
        success: false,
        message: 'Invalid email or password'
      });
      return;
    }

    const isValid = await bcrypt.compare(password, user.passwordHash);
    if (!isValid) {
      res.status(401).json({
        success: false,
        message: 'Invalid email or password'
      });
      return;
    }

    res.cookie('sessionUserId', user.id, {
      httpOnly: true,
      sameSite: 'lax',
      secure: process.env.NODE_ENV === 'production',
      maxAge: 7 * 24 * 60 * 60 * 1000
    });

    const { passwordHash, ...safeUser } = user;
    res.json({
      success: true,
      data: safeUser
    });
  } catch (err) {
    console.error('Login error:', err);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
};

export const me = async (req: Request, res: Response): Promise<void> => {
  const sessionUserId = req.cookies?.sessionUserId;
  if (!sessionUserId) {
    res.status(401).json({
      success: false,
      message: 'Not authenticated'
    });
    return;
  }

  try {
    const user = await prisma.user.findUnique({
      where: { id: sessionUserId },
      select: userSelect
    });

    if (!user || !user.isActive) {
      res.status(401).json({
        success: false,
        message: 'Not authenticated'
      });
      return;
    }

    res.json({
      success: true,
      data: user
    });
  } catch (err) {
    console.error('Auth me error:', err);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
};

export const logout = (req: Request, res: Response): void => {
  res.clearCookie('sessionUserId');
  res.json({
    success: true,
    message: 'Logged out'
  });
};
