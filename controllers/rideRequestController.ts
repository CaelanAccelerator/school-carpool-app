import { TripDirection } from '@prisma/client';
import { Request, Response } from 'express';
import Joi from 'joi';
import { asyncHandler } from '../middleware';
import { rideRequestService } from '../services/rideRequestService';

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
  status: Joi.string().valid('ACCEPTED', 'REJECTED').required(),
  driverNote: Joi.string().allow(null, '').optional()
});

export const upsertRideRequestByKey = asyncHandler(async (req: Request, res: Response) => {
  const { error: paramsError, value: params } = keyParamsSchema.validate(req.params);
  if (paramsError) {
    res.status(400).json({
      success: false,
      message: `Invalid params: ${paramsError.details.map(d => d.message).join(', ')}`
    });
    return;
  }

  const { error: bodyError, value: body } = keyBodySchema.validate(req.body);
  if (bodyError) {
    res.status(400).json({
      success: false,
      message: `Invalid body: ${bodyError.details.map(d => d.message).join(', ')}`
    });
    return;
  }

  const request = await rideRequestService.upsertByKey(
    params.fromUserId,
    params.toUserId,
    parseInt(params.dayOfWeek),
    params.direction as TripDirection,
    body.message
  );

  res.json({ success: true, data: request });
});

export const respondToRideRequest = asyncHandler(async (req: Request, res: Response) => {
  const id = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  const { error, value } = respondBodySchema.validate(req.body);
  if (error) {
    res.status(400).json({
      success: false,
      message: `Invalid body: ${error.details.map(d => d.message).join(', ')}`
    });
    return;
  }

  const request = await rideRequestService.respond(
    id,
    req.user!.id,
    value.status,
    value.driverNote
  );

  res.json({ success: true, data: request });
});

export const cancelRideRequest = asyncHandler(async (req: Request, res: Response) => {
  const id = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;

  const request = await rideRequestService.cancel(id, req.user!.id);
  res.json({ success: true, data: request });
});

export const getRideRequestInbox = asyncHandler(async (req: Request, res: Response) => {
  const userId = Array.isArray(req.params.userId) ? req.params.userId[0] : req.params.userId;
  const requests = await rideRequestService.getInbox(userId);
  res.json({ success: true, data: requests });
});

export const getRideRequestOutbox = asyncHandler(async (req: Request, res: Response) => {
  const userId = Array.isArray(req.params.userId) ? req.params.userId[0] : req.params.userId;
  const requests = await rideRequestService.getOutbox(userId);
  res.json({ success: true, data: requests });
});
