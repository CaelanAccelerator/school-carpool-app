import { Role } from '@prisma/client';
import { AppError } from '../lib/AppError';
import { CAMPUS_NAMES, getCampusCoords } from '../lib/config/campusCoords';
import { createGeoProvider } from '../lib/geo/createGeoProvider';
import { prisma } from '../lib/prisma';
import { minutesToTime, timeToMinutes } from '../lib/timeUtils';

export interface MatchByTimeFieldParams {
  userId: string;
  dayOfWeek: number;
  timeValue: string;
  flexibilityMins: number;
  timeField: 'toCampusMins' | 'goHomeMins';
  targetRoleGroup: 'DRIVER' | 'PASSENGER';
}

const geoProvider = createGeoProvider();

const mapWithConcurrency = async <T, R>(
  items: T[],
  limit: number,
  mapper: (item: T) => Promise<R>
): Promise<R[]> => {
  const results: R[] = [];
  for (let i = 0; i < items.length; i += limit) {
    const batch = items.slice(i, i + limit);
    results.push(...(await Promise.all(batch.map(mapper))));
  }
  return results;
};

const getRequesterOrThrow = async (userId: string) => {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { campus: true, homeArea: true, homeLat: true, homeLng: true }
  });
  if (!user) throw new AppError(404, 'User not found');
  return user;
};

const buildTargetRoles = (group: 'DRIVER' | 'PASSENGER'): Role[] =>
  group === 'DRIVER' ? [Role.DRIVER, Role.BOTH] : [Role.PASSENGER, Role.BOTH];

const queryMatchingEntries = async ({
  dayOfWeek,
  userCampus,
  userId,
  targetRoles,
  timeField,
  timeFilter
}: {
  dayOfWeek: number;
  userCampus: string;
  userId: string;
  targetRoles: Role[];
  timeField: 'toCampusMins' | 'goHomeMins';
  timeFilter: Record<string, unknown>;
}) => {
  return prisma.scheduleEntry.findMany({
    where: {
      dayOfWeek,
      enabled: true,
      user: { isActive: true, campus: userCampus, role: { in: targetRoles }, id: { not: userId } },
      ...timeFilter
    },
    include: {
      user: {
        select: {
          id: true,
          name: true,
          photoUrl: true,
          campus: true,
          homeArea: true,
          homeLat: true,
          homeLng: true,
          role: true,
          timeZone: true
        }
      }
    },
    orderBy: [{ [timeField]: 'asc' }]
  });
};

const buildBaseResults = (entries: any[], timeField: 'toCampusMins' | 'goHomeMins', timeMins: number) =>
  entries.map(entry => ({
    ...entry,
    matchingScore: {
      timeDifference: Math.abs(entry[timeField] - timeMins),
      field: timeField,
      targetTimeFormatted: minutesToTime(timeMins),
      entryTimeFormatted: minutesToTime(entry[timeField]),
      toCampusTimeFormatted: minutesToTime(entry.toCampusMins),
      goHomeTimeFormatted: minutesToTime(entry.goHomeMins)
    },
    geoInfo: { baseMins: null, viaMins: null, extraDetourMins: null }
  }));

const applyGeoDetourFilter = async (
  baseResults: any[],
  requester: { homeLat: number; homeLng: number },
  campusCoords: { lat: number; lng: number },
  timeField: 'toCampusMins' | 'goHomeMins'
) => {
  const detourResults = await mapWithConcurrency(baseResults, 5, async (entry: any) => {
    if (entry.user.homeLat == null || entry.user.homeLng == null) return null;

    const detour = await geoProvider.detourExtraMins(
      { lat: entry.user.homeLat, lng: entry.user.homeLng },
      { lat: requester.homeLat, lng: requester.homeLng },
      campusCoords
    );

    const maxDetour = timeField === 'toCampusMins'
      ? entry.toCampusMaxDetourMins
      : entry.goHomeMaxDetourMins;

    if (detour.extraMins > maxDetour) return null;

    return {
      ...entry,
      geoInfo: { baseMins: detour.baseMins, viaMins: detour.viaMins, extraDetourMins: detour.extraMins }
    };
  });

  return detourResults.filter((e: any) => e !== null);
};

const sortResults = (results: any[]) =>
  results.sort((a: any, b: any) => {
    const diff = a.geoInfo.extraDetourMins - b.geoInfo.extraDetourMins;
    return diff !== 0 ? diff : a.matchingScore.timeDifference - b.matchingScore.timeDifference;
  });

export const matchingService = {
  async matchByTimeField(params: MatchByTimeFieldParams) {
    const { userId, dayOfWeek, timeValue, flexibilityMins, timeField, targetRoleGroup } = params;
    const timeMins = timeToMinutes(timeValue);

    const user = await getRequesterOrThrow(userId);
    const campusCoords = getCampusCoords(user.campus);

    const targetRoles = buildTargetRoles(targetRoleGroup);
    const timeFilter = {
      [timeField]: { gte: timeMins - flexibilityMins, lte: timeMins + flexibilityMins }
    };

    const matchingEntries = await queryMatchingEntries({
      dayOfWeek,
      userCampus: user.campus,
      userId,
      targetRoles,
      timeField,
      timeFilter
    });

    const baseResults = buildBaseResults(matchingEntries, timeField, timeMins);

    if (!user.homeLat || !user.homeLng) {
      return {
        results: baseResults.sort((a: any, b: any) => a.matchingScore.timeDifference - b.matchingScore.timeDifference),
        geoNote: 'Geo filtering skipped: requester home location missing.'
      };
    }

    const filteredResults = await applyGeoDetourFilter(
      baseResults,
      { homeLat: user.homeLat, homeLng: user.homeLng },
      campusCoords,
      timeField
    );

    return { results: sortResults(filteredResults), geoNote: undefined };
  },

  async getDriverAvailability(driverId: string, dayOfWeek: number) {
    const driver = await prisma.user.findUnique({
      where: { id: driverId, role: { in: [Role.DRIVER, Role.BOTH] }, isActive: true },
      select: {
        id: true,
        name: true,
        photoUrl: true,
        campus: true,
        homeArea: true,
        role: true,
        timeZone: true
      }
    });

    if (!driver) throw new AppError(404, 'Driver not found or not available');

    const schedule = await prisma.scheduleEntry.findFirst({
      where: { userId: driverId, dayOfWeek, enabled: true }
    });

    if (!schedule) throw new AppError(404, 'Driver not available on this day');

    return {
      driver,
      schedule: {
        ...schedule,
        toCampusTimeFormatted: minutesToTime(schedule.toCampusMins),
        goHomeTimeFormatted: minutesToTime(schedule.goHomeMins)
      }
    };
  },

  CAMPUS_NAMES
};
