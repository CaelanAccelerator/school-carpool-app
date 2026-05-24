import { RideRequestStatus, TripDirection } from '@prisma/client';
import { expect } from 'chai';
import sinon from 'sinon';
import { AppError } from '../../lib/AppError';
import { prisma } from '../../lib/prisma';
import { rideRequestService } from '../../services/rideRequestService';

describe('rideRequestService', () => {
  let sandbox: sinon.SinonSandbox;

  beforeEach(() => {
    sandbox = sinon.createSandbox();
  });

  afterEach(() => {
    sandbox.restore();
  });

  describe('upsertByKey', () => {
    it('should throw AppError(400) when fromUserId equals toUserId', async () => {
      try {
        await rideRequestService.upsertByKey('user1', 'user1', 1, TripDirection.TO_CAMPUS);
        expect.fail('should have thrown');
      } catch (err: any) {
        expect(err).to.be.instanceOf(AppError);
        expect(err.statusCode).to.equal(400);
        expect(err.message).to.include('different');
      }
    });

    it('should throw AppError(400) when a user is not found or inactive', async () => {
      sandbox.stub(prisma, 'user').value({
        findMany: sinon.stub().resolves([{ id: 'user1' }])
      });

      try {
        await rideRequestService.upsertByKey('user1', 'user2', 1, TripDirection.TO_CAMPUS);
        expect.fail('should have thrown');
      } catch (err: any) {
        expect(err).to.be.instanceOf(AppError);
        expect(err.statusCode).to.equal(400);
        expect(err.message).to.include('active');
      }
    });
  });

  describe('respond', () => {
    it('should throw AppError(404) when request not found', async () => {
      sandbox.stub(prisma, 'rideRequest').value({
        findUnique: sinon.stub().resolves(null)
      });

      try {
        await rideRequestService.respond('req1', 'user1', 'ACCEPTED');
        expect.fail('should have thrown');
      } catch (err: any) {
        expect(err).to.be.instanceOf(AppError);
        expect(err.statusCode).to.equal(404);
      }
    });

    it('should throw AppError(403) when actor is not the recipient', async () => {
      sandbox.stub(prisma, 'rideRequest').value({
        findUnique: sinon.stub().resolves({
          id: 'req1',
          toUserId: 'recipient',
          status: RideRequestStatus.PENDING,
          fromUser: {}, toUser: {}
        })
      });

      try {
        await rideRequestService.respond('req1', 'wrong-user', 'ACCEPTED');
        expect.fail('should have thrown');
      } catch (err: any) {
        expect(err).to.be.instanceOf(AppError);
        expect(err.statusCode).to.equal(403);
        expect(err.message).to.include('recipient');
      }
    });

    it('should throw AppError(409) when request is not PENDING', async () => {
      sandbox.stub(prisma, 'rideRequest').value({
        findUnique: sinon.stub().resolves({
          id: 'req1',
          toUserId: 'user2',
          status: RideRequestStatus.ACCEPTED,
          fromUser: {}, toUser: {}
        })
      });

      try {
        await rideRequestService.respond('req1', 'user2', 'REJECTED');
        expect.fail('should have thrown');
      } catch (err: any) {
        expect(err).to.be.instanceOf(AppError);
        expect(err.statusCode).to.equal(409);
        expect(err.message).to.include('pending');
      }
    });

    it('should update status and respondedAt on success', async () => {
      const rideRequestStub = {
        findUnique: sinon.stub().resolves({
          id: 'req1',
          toUserId: 'user2',
          status: RideRequestStatus.PENDING,
          fromUser: {}, toUser: {}
        }),
        update: sinon.stub().resolves({ id: 'req1', status: RideRequestStatus.ACCEPTED })
      };
      sandbox.stub(prisma, 'rideRequest').value(rideRequestStub);

      await rideRequestService.respond('req1', 'user2', 'ACCEPTED', 'Pick up at 8am');

      const updateArgs = rideRequestStub.update.firstCall.args[0];
      expect(updateArgs.data.status).to.equal(RideRequestStatus.ACCEPTED);
      expect(updateArgs.data.driverNote).to.equal('Pick up at 8am');
      expect(updateArgs.data.respondedAt).to.be.instanceOf(Date);
    });
  });

  describe('cancel', () => {
    it('should throw AppError(403) when actor is not the sender', async () => {
      sandbox.stub(prisma, 'rideRequest').value({
        findUnique: sinon.stub().resolves({
          id: 'req1',
          fromUserId: 'sender',
          status: RideRequestStatus.PENDING
        })
      });

      try {
        await rideRequestService.cancel('req1', 'not-sender');
        expect.fail('should have thrown');
      } catch (err: any) {
        expect(err).to.be.instanceOf(AppError);
        expect(err.statusCode).to.equal(403);
        expect(err.message).to.include('sender');
      }
    });

    it('should throw AppError(409) when request is not PENDING', async () => {
      sandbox.stub(prisma, 'rideRequest').value({
        findUnique: sinon.stub().resolves({
          id: 'req1',
          fromUserId: 'sender',
          status: RideRequestStatus.ACCEPTED
        })
      });

      try {
        await rideRequestService.cancel('req1', 'sender');
        expect.fail('should have thrown');
      } catch (err: any) {
        expect(err).to.be.instanceOf(AppError);
        expect(err.statusCode).to.equal(409);
      }
    });
  });

  describe('getInbox - contact info filtering', () => {
    it('should expose contact info only for ACCEPTED requests', async () => {
      const mockRequests = [
        {
          id: 'req1', status: RideRequestStatus.ACCEPTED,
          fromUser: { id: 'u1', name: 'User 1', contactType: 'EMAIL', contactValue: 'u1@test.com' }
        },
        {
          id: 'req2', status: RideRequestStatus.PENDING,
          fromUser: { id: 'u2', name: 'User 2', contactType: 'PHONE', contactValue: '555-1234' }
        },
        {
          id: 'req3', status: RideRequestStatus.REJECTED,
          fromUser: { id: 'u3', name: 'User 3', contactType: 'WECHAT', contactValue: 'wechat_id' }
        }
      ];
      sandbox.stub(prisma, 'rideRequest').value({
        findMany: sinon.stub().resolves(mockRequests)
      });

      const result = await rideRequestService.getInbox('target-user');

      expect(result[0].fromUser.contactType).to.equal('EMAIL');
      expect(result[0].fromUser.contactValue).to.equal('u1@test.com');
      expect(result[1].fromUser.contactType).to.be.null;
      expect(result[1].fromUser.contactValue).to.be.null;
      expect(result[2].fromUser.contactType).to.be.null;
      expect(result[2].fromUser.contactValue).to.be.null;
    });
  });

  describe('getOutbox - contact info filtering', () => {
    it('should expose contact info only for ACCEPTED requests', async () => {
      const mockRequests = [
        {
          id: 'req1', status: RideRequestStatus.ACCEPTED,
          toUser: { id: 'u1', name: 'Driver 1', contactType: 'WECHAT', contactValue: 'driver_wechat' }
        },
        {
          id: 'req2', status: RideRequestStatus.PENDING,
          toUser: { id: 'u2', name: 'Driver 2', contactType: 'EMAIL', contactValue: 'driver@test.com' }
        }
      ];
      sandbox.stub(prisma, 'rideRequest').value({
        findMany: sinon.stub().resolves(mockRequests)
      });

      const result = await rideRequestService.getOutbox('sender-user');

      expect(result[0].toUser.contactType).to.equal('WECHAT');
      expect(result[0].toUser.contactValue).to.equal('driver_wechat');
      expect(result[1].toUser.contactType).to.be.null;
      expect(result[1].toUser.contactValue).to.be.null;
    });
  });
});
