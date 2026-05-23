import bcrypt from 'bcrypt';
import { ContactType, Role } from '@prisma/client';
import { AppError } from '../lib/AppError';
import { prisma } from '../lib/prisma';

const USER_SELECT = {
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

export interface CreateUserInput {
  email: string;
  password: string;
  name: string;
  photoUrl?: string;
  contactType: string;
  contactValue: string;
  campus: string;
  homeArea: string;
  role?: string;
  timeZone?: string;
  homeAddress?: string;
  homeLat?: number;
  homeLng?: number;
}

export interface UpdateUserInput {
  name?: string;
  photoUrl?: string;
  contactType?: string;
  contactValue?: string;
  campus?: string;
  homeArea?: string;
  role?: string;
  timeZone?: string;
  isActive?: boolean;
  homeAddress?: string;
  homeLat?: number | null;
  homeLng?: number | null;
}

export interface GetUsersQuery {
  campus?: string;
  homeArea?: string;
  role?: string;
  isActive?: string;
  page?: string;
  limit?: string;
}

export const userService = {
  async createUser(data: CreateUserInput) {
    const { password, ...userData } = data;

    const existing = await prisma.user.findUnique({ where: { email: userData.email } });
    if (existing) throw new AppError(409, 'User with this email already exists');

    const passwordHash = await bcrypt.hash(password, 12);
    return prisma.user.create({
      data: {
        ...userData,
        contactType: userData.contactType as ContactType,
        role: userData.role as Role | undefined,
        passwordHash
      },
      select: USER_SELECT
    });
  },

  async getUsers(query: GetUsersQuery) {
    const pageNum = parseInt(query.page ?? '1');
    const limitNum = parseInt(query.limit ?? '10');
    const skip = (pageNum - 1) * limitNum;

    const where: Record<string, unknown> = {};
    if (query.campus) where.campus = query.campus;
    if (query.homeArea) where.homeArea = query.homeArea;
    if (query.role) where.role = query.role;
    if (query.isActive !== undefined) where.isActive = query.isActive === 'true';

    const [users, total] = await Promise.all([
      prisma.user.findMany({
        where,
        select: USER_SELECT,
        skip,
        take: limitNum,
        orderBy: { createdAt: 'desc' }
      }),
      prisma.user.count({ where })
    ]);

    return {
      users,
      pagination: {
        page: pageNum,
        limit: limitNum,
        total,
        totalPages: Math.ceil(total / limitNum)
      }
    };
  },

  async getUserById(id: string) {
    const user = await prisma.user.findUnique({
      where: { id },
      select: {
        ...USER_SELECT,
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

    if (!user) throw new AppError(404, 'User not found');
    return user;
  },

  async updateUser(id: string, data: UpdateUserInput) {
    const existing = await prisma.user.findUnique({ where: { id } });
    if (!existing) throw new AppError(404, 'User not found');

    return prisma.user.update({
      where: { id },
      data: {
        ...data,
        contactType: data.contactType as ContactType | undefined,
        role: data.role as Role | undefined
      },
      select: USER_SELECT
    });
  },

  async changePassword(id: string, currentPassword: string, newPassword: string) {
    const user = await prisma.user.findUnique({
      where: { id },
      select: { id: true, passwordHash: true }
    });
    if (!user) throw new AppError(404, 'User not found');

    const isValid = await bcrypt.compare(currentPassword, user.passwordHash);
    if (!isValid) throw new AppError(400, 'Current password is incorrect');

    await prisma.user.update({
      where: { id },
      data: { passwordHash: await bcrypt.hash(newPassword, 12) }
    });
  },

  async deleteUser(id: string) {
    const existing = await prisma.user.findUnique({ where: { id } });
    if (!existing) throw new AppError(404, 'User not found');

    await prisma.user.update({ where: { id }, data: { isActive: false } });
  },

  async permanentDeleteUser(id: string) {
    const existing = await prisma.user.findUnique({ where: { id } });
    if (!existing) throw new AppError(404, 'User not found');

    await prisma.user.delete({ where: { id } });
  }
};
