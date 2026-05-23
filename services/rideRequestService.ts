import { RideRequestStatus, TripDirection } from '@prisma/client';
import { AppError } from '../lib/AppError';
import { prisma } from '../lib/prisma';

const USER_SNIPPET = {
  id: true,
  name: true,
  photoUrl: true,
  campus: true,
  homeArea: true
} as const;

const USER_SNIPPET_WITH_CONTACT = {
  ...USER_SNIPPET,
  contactType: true,
  contactValue: true
} as const;

export const rideRequestService = {
  async upsertByKey(
    fromUserId: string,
    toUserId: string,
    dayOfWeek: number,
    direction: TripDirection,
    message?: string | null
  ) {
    if (fromUserId === toUserId) {
      throw new AppError(400, 'Users must be different');
    }

    const users = await prisma.user.findMany({
      where: { id: { in: [fromUserId, toUserId] }, isActive: true },
      select: { id: true }
    });
    if (users.length !== 2) {
      throw new AppError(400, 'Both users must exist and be active');
    }

    return prisma.rideRequest.upsert({
      where: {
        fromUserId_toUserId_dayOfWeek_direction: {
          fromUserId,
          toUserId,
          dayOfWeek,
          direction
        }
      },
      create: {
        fromUserId,
        toUserId,
        dayOfWeek,
        direction,
        status: RideRequestStatus.PENDING,
        message: message ?? null
      },
      update: {
        message: message ?? null,
        status: RideRequestStatus.PENDING,
        driverNote: null,
        respondedAt: null
      },
      include: {
        fromUser: { select: USER_SNIPPET },
        toUser: { select: USER_SNIPPET }
      }
    });
  },

  async respond(
    requestId: string,
    actorUserId: string,
    status: 'ACCEPTED' | 'REJECTED',
    driverNote?: string | null
  ) {
    const request = await prisma.rideRequest.findUnique({
      where: { id: requestId },
      include: {
        fromUser: { select: USER_SNIPPET },
        toUser: { select: USER_SNIPPET }
      }
    });

    if (!request) throw new AppError(404, 'Ride request not found');
    if (actorUserId !== request.toUserId) {
      throw new AppError(403, 'Only the recipient can respond to this request');
    }
    if (request.status !== RideRequestStatus.PENDING) {
      throw new AppError(409, 'Can only respond to pending requests');
    }

    return prisma.rideRequest.update({
      where: { id: requestId },
      data: {
        status: status as RideRequestStatus,
        driverNote: driverNote ?? null,
        respondedAt: new Date()
      },
      include: {
        fromUser: { select: USER_SNIPPET_WITH_CONTACT },
        toUser: { select: USER_SNIPPET_WITH_CONTACT }
      }
    });
  },

  async cancel(requestId: string, actorUserId: string) {
    const request = await prisma.rideRequest.findUnique({ where: { id: requestId } });

    if (!request) throw new AppError(404, 'Ride request not found');
    if (actorUserId !== request.fromUserId) {
      throw new AppError(403, 'Only the sender can cancel this request');
    }
    if (request.status !== RideRequestStatus.PENDING) {
      throw new AppError(409, 'Can only cancel pending requests');
    }

    return prisma.rideRequest.update({
      where: { id: requestId },
      data: { status: RideRequestStatus.CANCELLED },
      include: {
        fromUser: { select: USER_SNIPPET },
        toUser: { select: USER_SNIPPET }
      }
    });
  },

  async getInbox(userId: string) {
    const requests = await prisma.rideRequest.findMany({
      where: { toUserId: userId },
      include: {
        fromUser: { select: USER_SNIPPET_WITH_CONTACT }
      },
      orderBy: { createdAt: 'desc' }
    });

    return requests.map(r => ({
      ...r,
      fromUser: {
        ...r.fromUser,
        contactType: r.status === RideRequestStatus.ACCEPTED ? r.fromUser.contactType : null,
        contactValue: r.status === RideRequestStatus.ACCEPTED ? r.fromUser.contactValue : null
      }
    }));
  },

  async getOutbox(userId: string) {
    const requests = await prisma.rideRequest.findMany({
      where: { fromUserId: userId },
      include: {
        toUser: { select: USER_SNIPPET_WITH_CONTACT }
      },
      orderBy: { createdAt: 'desc' }
    });

    return requests.map(r => ({
      ...r,
      toUser: {
        ...r.toUser,
        contactType: r.status === RideRequestStatus.ACCEPTED ? r.toUser.contactType : null,
        contactValue: r.status === RideRequestStatus.ACCEPTED ? r.toUser.contactValue : null
      }
    }));
  }
};
