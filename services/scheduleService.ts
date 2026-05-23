import { AppError } from '../lib/AppError';
import { prisma } from '../lib/prisma';

const USER_SNIPPET = {
  select: {
    id: true,
    name: true,
    campus: true,
    homeArea: true,
    role: true
  }
} as const;

export interface CreateScheduleEntryInput {
  dayOfWeek: number;
  toCampusMins: number;
  goHomeMins: number;
  toCampusFlexMin?: number;
  goHomeFlexMin?: number;
  toCampusMaxDetourMins?: number;
  goHomeMaxDetourMins?: number;
  enabled?: boolean;
}

export interface UpdateScheduleEntryInput {
  toCampusMins?: number;
  goHomeMins?: number;
  toCampusFlexMin?: number;
  goHomeFlexMin?: number;
  toCampusMaxDetourMins?: number;
  goHomeMaxDetourMins?: number;
  enabled?: boolean;
}

export const scheduleService = {
  async createEntry(userId: string, data: CreateScheduleEntryInput) {
    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user) throw new AppError(404, 'User not found');

    return prisma.scheduleEntry.create({
      data: { userId, ...data },
      include: { user: USER_SNIPPET }
    });
  },

  async getUserEntries(userId: string) {
    return prisma.scheduleEntry.findMany({
      where: { userId },
      orderBy: { dayOfWeek: 'asc' },
      include: { user: USER_SNIPPET }
    });
  },

  async getEntryByDay(userId: string, dayOfWeek: number) {
    const entry = await prisma.scheduleEntry.findUnique({
      where: { userId_dayOfWeek: { userId, dayOfWeek } },
      include: { user: USER_SNIPPET }
    });

    if (!entry) throw new AppError(404, 'Schedule entry not found for this day');
    return entry;
  },

  async updateEntry(entryId: string, data: UpdateScheduleEntryInput) {
    const entry = await prisma.scheduleEntry.findUnique({ where: { id: entryId } });
    if (!entry) throw new AppError(404, 'Schedule entry not found');

    return prisma.scheduleEntry.update({
      where: { id: entryId },
      data,
      include: { user: USER_SNIPPET }
    });
  },

  async deleteEntry(entryId: string) {
    const entry = await prisma.scheduleEntry.findUnique({ where: { id: entryId } });
    if (!entry) throw new AppError(404, 'Schedule entry not found');

    await prisma.scheduleEntry.delete({ where: { id: entryId } });
  },

  async upsertWeeklySchedule(userId: string, entries: CreateScheduleEntryInput[]) {
    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user) throw new AppError(404, 'User not found');

    return prisma.$transaction(async (tx: any) => {
      const results = [];
      for (const entry of entries) {
        const upserted = await tx.scheduleEntry.upsert({
          where: { userId_dayOfWeek: { userId, dayOfWeek: entry.dayOfWeek } },
          update: {
            toCampusMins: entry.toCampusMins,
            goHomeMins: entry.goHomeMins,
            toCampusFlexMin: entry.toCampusFlexMin,
            goHomeFlexMin: entry.goHomeFlexMin,
            toCampusMaxDetourMins: entry.toCampusMaxDetourMins,
            goHomeMaxDetourMins: entry.goHomeMaxDetourMins,
            enabled: entry.enabled
          },
          create: { userId, ...entry },
          include: { user: USER_SNIPPET }
        });
        results.push(upserted);
      }
      return results;
    });
  }
};
