import { Router } from 'express';
import {
  cancelRideRequest,
  getRideRequestInbox,
  getRideRequestOutbox,
  respondToRideRequest,
  upsertRideRequestByKey
} from '../controllers/rideRequestController';
import { authenticate } from '../middleware';

const router = Router();

router.put('/key/:fromUserId/:toUserId/:dayOfWeek/:direction', authenticate, upsertRideRequestByKey);
router.put('/:id/respond', authenticate, respondToRideRequest);
router.put('/:id/cancel', authenticate, cancelRideRequest);
router.get('/inbox/:userId', authenticate, getRideRequestInbox);
router.get('/outbox/:userId', authenticate, getRideRequestOutbox);

export default router;