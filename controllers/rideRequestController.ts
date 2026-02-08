import { RideRequestStatus, TripDirection } from '@prisma/client';
import { Request, Response } from 'express';
import Joi from 'joi';
import { prisma } from '../lib/prisma';

// Validation schemas
const keyParamsSchema = Joi.object({
  fromUserId: Joi.string().required(),
  toUserId: Joi.string().required(),
  dayOfWeek: Joi.number().integer().min(0).max(6).required(),
  direction: Joi.string().valid('TO_CAMPUS', 'GO_HOME').required()
});

const keyBodySchema = Joi.object({
  message: Joi.string().allow(null, '').optional()
});

const respondBodySchema = Joi.object({
  actorUserId: Joi.string().required(),
  status: Joi.string().valid('ACCEPTED', 'REJECTED').required(),
  driverNote: Joi.string().allow(null, '').optional()
});

const cancelBodySchema = Joi.object({
  actorUserId: Joi.string().required()
});

// Error handling helper
// Input: Express response, status code, message string
// Output: Sends JSON error response
const handleError = (res: Response, status: number, message: string) => {
  res.status(status).json({
    success: false,
    message
  });
};

// Validates that both users exist and are active
// Input: fromUserId string, toUserId string
// Output: Promise resolving to boolean (true if both valid)
const validateUsers = async (fromUserId: string, toUserId: string): Promise<boolean> => {
  if (fromUserId === toUserId) {
    return false;
  }

  const users = await prisma.user.findMany({
    where: {
      id: { in: [fromUserId, toUserId] },
      isActive: true
    },
    select: { id: true }
  });

  return users.length === 2;
};

// API endpoint: Create or update ride request by business key
// Input: Express Request with params {fromUserId, toUserId, dayOfWeek, direction} and body {message?}, Response
// Output: 200 with created/updated request data
export const upsertRideRequestByKey = async (req: Request, res: Response): Promise<void> => {
  try {
    // Validate params
    const { error: paramsError, value: params } = keyParamsSchema.validate(req.params);
    if (paramsError) {
      handleError(res, 400, `Invalid params: ${paramsError.details.map(d => d.message).join(', ')}`);
      return;
    }

    // Validate body
    const { error: bodyError, value: body } = keyBodySchema.validate(req.body);
    if (bodyError) {
      handleError(res, 400, `Invalid body: ${bodyError.details.map(d => d.message).join(', ')}`);
      return;
    }

    const { fromUserId, toUserId, dayOfWeek, direction } = params;
    const { message } = body;

    // Validate users exist and are active
    if (!(await validateUsers(fromUserId, toUserId))) {
      handleError(res, 400, 'Invalid users: both users must exist, be active, and be different');
      return;
    }

    // Upsert by compound unique key
    const request = await prisma.rideRequest.upsert({
      where: {
        fromUserId_toUserId_dayOfWeek_direction: {
          fromUserId,
          toUserId,
          dayOfWeek: parseInt(dayOfWeek),
          direction: direction as TripDirection
        }
      },
      create: {
        fromUserId,
        toUserId,
        dayOfWeek: parseInt(dayOfWeek),
        direction: direction as TripDirection,
        status: RideRequestStatus.PENDING,
        message: message || null
      },
      update: {
        message: message || null,
        status: RideRequestStatus.PENDING,
        driverNote: null,
        respondedAt: null
      },
      include: {
        fromUser: {
          select: {
            id: true,
            name: true,
            photoUrl: true,
            campus: true,
            homeArea: true
          }
        },
        toUser: {
          select: {
            id: true,
            name: true,
            photoUrl: true,
            campus: true,
            homeArea: true
          }
        }
      }
    });

    res.status(200).json({
      success: true,
      data: request
    });

  } catch (error) {
    console.error('Error upserting ride request:', error);
    handleError(res, 500, 'Internal server error');
  }
};

// API endpoint: Respond to ride request (accept/reject)
// Input: Express Request with params {id} and body {actorUserId, status, driverNote?}, Response  
// Output: 200 with updated request data, 403 for permission, 409 for wrong status
export const respondToRideRequest = async (req: Request, res: Response): Promise<void> => {
  try {
    const id = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
    
    // Validate body
    const { error, value } = respondBodySchema.validate(req.body);
    if (error) {
      handleError(res, 400, `Invalid body: ${error.details.map(d => d.message).join(', ')}`);
      return;
    }

    const { actorUserId, status, driverNote } = value;

    // Find the request
    const request = await prisma.rideRequest.findUnique({
      where: { id },
      include: {
        fromUser: {
          select: {
            id: true,
            name: true,
            photoUrl: true,
            campus: true,
            homeArea: true
          }
        },
        toUser: {
          select: {
            id: true,
            name: true,
            photoUrl: true,
            campus: true,
            homeArea: true
          }
        }
      }
    });

    if (!request) {
      handleError(res, 404, 'Ride request not found');
      return;
    }

    // Permission check - only toUser can respond
    if (actorUserId !== request.toUserId) {
      handleError(res, 403, 'Only the recipient can respond to this request');
      return;
    }

    // Status check - only PENDING requests can be responded to
    if (request.status !== RideRequestStatus.PENDING) {
      handleError(res, 409, 'Can only respond to pending requests');
      return;
    }

    // Update the request
    const updatedRequest = await prisma.rideRequest.update({
      where: { id },
      data: {
        status: status as RideRequestStatus,
        driverNote: driverNote || null,
        respondedAt: new Date()
      },
      include: {
        fromUser: {
          select: {
            id: true,
            name: true,
            photoUrl: true,
            campus: true,
            homeArea: true,
            contactType: true,
            contactValue: true
          }
        },
        toUser: {
          select: {
            id: true,
            name: true,
            photoUrl: true,
            campus: true,
            homeArea: true,
            contactType: true,
            contactValue: true
          }
        }
      }
    });

    res.status(200).json({
      success: true,
      data: updatedRequest
    });

  } catch (error) {
    console.error('Error responding to ride request:', error);
    handleError(res, 500, 'Internal server error');
  }
};

// API endpoint: Cancel ride request
// Input: Express Request with params {id} and body {actorUserId}, Response
// Output: 200 with updated request data, 403 for permission, 409 for wrong status
export const cancelRideRequest = async (req: Request, res: Response): Promise<void> => {
  try {
    const id = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
    
    // Validate body
    const { error, value } = cancelBodySchema.validate(req.body);
    if (error) {
      handleError(res, 400, `Invalid body: ${error.details.map(d => d.message).join(', ')}`);
      return;
    }

    const { actorUserId } = value;

    // Find the request
    const request = await prisma.rideRequest.findUnique({
      where: { id }
    });

    if (!request) {
      handleError(res, 404, 'Ride request not found');
      return;
    }

    // Permission check - only fromUser can cancel
    if (actorUserId !== request.fromUserId) {
      handleError(res, 403, 'Only the sender can cancel this request');
      return;
    }

    // Status check - only PENDING requests can be cancelled
    if (request.status !== RideRequestStatus.PENDING) {
      handleError(res, 409, 'Can only cancel pending requests');
      return;
    }

    // Update the request
    const updatedRequest = await prisma.rideRequest.update({
      where: { id },
      data: {
        status: RideRequestStatus.CANCELLED
      },
      include: {
        fromUser: {
          select: {
            id: true,
            name: true,
            photoUrl: true,
            campus: true,
            homeArea: true
          }
        },
        toUser: {
          select: {
            id: true,
            name: true,
            photoUrl: true,
            campus: true,
            homeArea: true
          }
        }
      }
    });

    res.status(200).json({
      success: true,
      data: updatedRequest
    });

  } catch (error) {
    console.error('Error cancelling ride request:', error);
    handleError(res, 500, 'Internal server error');
  }
};

// API endpoint: Get ride request inbox (incoming requests)
// Input: Express Request with params {userId}, Response
// Output: 200 with array of incoming requests with contact info only if ACCEPTED
export const getRideRequestInbox = async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = Array.isArray(req.params.userId) ? req.params.userId[0] : req.params.userId;

    if (!userId) {
      handleError(res, 400, 'User ID is required');
      return;
    }

    const requests = await prisma.rideRequest.findMany({
      where: {
        toUserId: userId
      },
      include: {
        fromUser: {
          select: {
            id: true,
            name: true,
            photoUrl: true,
            campus: true,
            homeArea: true,
            contactType: true,
            contactValue: true
          }
        }
      },
      orderBy: {
        createdAt: 'desc'
      }
    });

    // Hide contact info unless status is ACCEPTED
    const processedRequests = requests.map(request => ({
      ...request,
      fromUser: {
        ...request.fromUser,
        contactType: request.status === RideRequestStatus.ACCEPTED ? request.fromUser.contactType : null,
        contactValue: request.status === RideRequestStatus.ACCEPTED ? request.fromUser.contactValue : null
      }
    }));

    res.status(200).json({
      success: true,
      data: processedRequests
    });

  } catch (error) {
    console.error('Error getting ride request inbox:', error);
    handleError(res, 500, 'Internal server error');
  }
};

// API endpoint: Get ride request outbox (outgoing requests)  
// Input: Express Request with params {userId}, Response
// Output: 200 with array of outgoing requests with contact info only if ACCEPTED
export const getRideRequestOutbox = async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = Array.isArray(req.params.userId) ? req.params.userId[0] : req.params.userId;

    if (!userId) {
      handleError(res, 400, 'User ID is required');
      return;
    }

    const requests = await prisma.rideRequest.findMany({
      where: {
        fromUserId: userId
      },
      include: {
        toUser: {
          select: {
            id: true,
            name: true,
            photoUrl: true,
            campus: true,
            homeArea: true,
            contactType: true,
            contactValue: true
          }
        }
      },
      orderBy: {
        createdAt: 'desc'
      }
    });

    // Hide contact info unless status is ACCEPTED
    const processedRequests = requests.map(request => ({
      ...request,
      toUser: {
        ...request.toUser,
        contactType: request.status === RideRequestStatus.ACCEPTED ? request.toUser.contactType : null,
        contactValue: request.status === RideRequestStatus.ACCEPTED ? request.toUser.contactValue : null
      }
    }));

    res.status(200).json({
      success: true,
      data: processedRequests
    });

  } catch (error) {
    console.error('Error getting ride request outbox:', error);
    handleError(res, 500, 'Internal server error');
  }
};