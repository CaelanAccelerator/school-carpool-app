import bcrypt from 'bcrypt';
import { AppError } from '../lib/AppError';
import { signAccessToken, signRefreshToken, verifyRefreshToken } from '../lib/auth/jwt';
import { prisma } from '../lib/prisma';

const SAFE_USER_SELECT = {
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
} as const;

export const authService = {
  async login(email: string, password: string) {
    const user = await prisma.user.findUnique({
      where: { email },
      select: { ...SAFE_USER_SELECT, passwordHash: true }
    });

    if (!user || !user.isActive) {
      throw new AppError(401, 'Invalid email or password');
    }

    const isValid = await bcrypt.compare(password, user.passwordHash);
    if (!isValid) {
      throw new AppError(401, 'Invalid email or password');
    }

    const payload = { userId: user.id, role: user.role };
    const accessToken = signAccessToken(payload);
    const refreshToken = signRefreshToken(payload);

    await prisma.refreshToken.create({
      data: {
        token: refreshToken,
        userId: user.id,
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)
      }
    });

    const { passwordHash, ...safeUser } = user;
    return { user: safeUser, accessToken, refreshToken };
  },

  async refreshAccessToken(token: string) {
    let payload;
    try {
      payload = verifyRefreshToken(token);
    } catch {
      throw new AppError(401, 'Invalid refresh token');
    }

    const stored = await prisma.refreshToken.findUnique({ where: { token } });
    if (!stored || stored.expiresAt < new Date()) {
      throw new AppError(401, 'Refresh token expired or revoked');
    }

    const accessToken = signAccessToken({ userId: payload.userId, role: payload.role });
    return { accessToken };
  },

  async logout(refreshToken: string) {
    await prisma.refreshToken.deleteMany({ where: { token: refreshToken } });
  },

  async getMe(userId: string) {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: SAFE_USER_SELECT
    });

    if (!user || !user.isActive) {
      throw new AppError(401, 'User not found or inactive');
    }

    return user;
  }
};
