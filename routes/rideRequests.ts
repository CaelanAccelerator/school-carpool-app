import { Router } from 'express';
import {
  cancelRideRequest,
  getRideRequestInbox,
  getRideRequestOutbox,
  respondToRideRequest,
  upsertRideRequestByKey
} from '../controllers/rideRequestController';

const router = Router();

// PUT endpoints for mutations
router.put('/key/:fromUserId/:toUserId/:dayOfWeek/:direction', upsertRideRequestByKey);
router.put('/:id/respond', respondToRideRequest);
router.put('/:id/cancel', cancelRideRequest);

// GET endpoints for queries
router.get('/inbox/:userId', getRideRequestInbox);
router.get('/outbox/:userId', getRideRequestOutbox);

export default router;