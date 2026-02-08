import { RideRequestStatus, TripDirection } from '@prisma/client';
import { expect } from 'chai';
import sinon from 'sinon';
import {
  getRideRequestInbox,
  getRideRequestOutbox,
  respondToRideRequest,
  upsertRideRequestByKey
} from '../../controllers/rideRequestController';
import { prisma } from '../../lib/prisma';

describe('rideRequestController', () => {
  let prismaMock: any;

  beforeEach(() => {
    prismaMock = {
      user: {
        findMany: sinon.stub(),
        findUnique: sinon.stub()
      },
      rideRequest: {
        upsert: sinon.stub(),
        findUnique: sinon.stub(),
        update: sinon.stub(),
        findMany: sinon.stub()
      }
    };
    sinon.stub(prisma, 'user').value(prismaMock.user);
    sinon.stub(prisma, 'rideRequest').value(prismaMock.rideRequest);
  });

  afterEach(() => {
    sinon.restore();
  });

  describe('upsertRideRequestByKey - PUT idempotency', () => {
    it('should ensure only 1 row exists and message updated on duplicate calls', async () => {
      const mockUsers = [
        { id: 'user1' },
        { id: 'user2' }
      ];

      const mockRequest = {
        id: 'req1',
        fromUserId: 'user1',
        toUserId: 'user2',
        dayOfWeek: 1,
        direction: TripDirection.TO_CAMPUS,
        status: RideRequestStatus.PENDING,
        message: 'Updated message',
        fromUser: { id: 'user1', name: 'User 1', photoUrl: null, campus: 'Main Campus', homeArea: 'Downtown' },
        toUser: { id: 'user2', name: 'User 2', photoUrl: null, campus: 'Main Campus', homeArea: 'Suburb' }
      };

      prismaMock.user.findMany.resolves(mockUsers);
      prismaMock.rideRequest.upsert.resolves(mockRequest);

      const req: any = {
        params: { fromUserId: 'user1', toUserId: 'user2', dayOfWeek: '1', direction: 'TO_CAMPUS' },
        body: { message: 'First message' }
      };
      const res: any = {
        status: sinon.stub().returnsThis(),
        json: sinon.stub()
      };

      // First call
      await upsertRideRequestByKey(req, res);

      // Second call with updated message
      req.body.message = 'Updated message';
      await upsertRideRequestByKey(req, res);

      // Verify upsert was called twice
      expect(prismaMock.rideRequest.upsert.callCount).to.equal(2);
      
      // Verify the upsert parameters for business key uniqueness
      const upsertCall = prismaMock.rideRequest.upsert.firstCall.args[0];
      expect(upsertCall.where.fromUserId_toUserId_dayOfWeek_direction).to.deep.equal({
        fromUserId: 'user1',
        toUserId: 'user2',
        dayOfWeek: 1,
        direction: 'TO_CAMPUS'
      });

      // Verify update resets status to PENDING and clears driver fields
      expect(upsertCall.update).to.deep.include({
        status: RideRequestStatus.PENDING,
        driverNote: null,
        respondedAt: null
      });

      expect(res.status.calledWith(200)).to.be.true;
      expect(res.json.calledWith({ success: true, data: mockRequest })).to.be.true;
    });
  });

  describe('respondToRideRequest - Permission check', () => {
    it('should return 403 when wrong actorUserId tries to respond', async () => {
      const mockRequest = {
        id: 'req1',
        fromUserId: 'user1',
        toUserId: 'user2',
        status: RideRequestStatus.PENDING
      };

      prismaMock.rideRequest.findUnique.resolves(mockRequest);

      const req: any = {
        params: { id: 'req1' },
        body: { actorUserId: 'user3', status: 'ACCEPTED' } // Wrong user trying to respond
      };
      const res: any = {
        status: sinon.stub().returnsThis(),
        json: sinon.stub()
      };

      await respondToRideRequest(req, res);

      expect(res.status.calledWith(403)).to.be.true;
      expect(res.json.calledWith({ 
        success: false, 
        message: 'Only the recipient can respond to this request' 
      })).to.be.true;
      expect(prismaMock.rideRequest.update.called).to.be.false;
    });
  });

  describe('Contact info visibility', () => {
    it('should reveal contact info only when status is ACCEPTED', async () => {
      const mockInboxRequests = [
        {
          id: 'req1',
          status: RideRequestStatus.ACCEPTED,
          fromUser: { 
            id: 'user1', 
            name: 'User 1', 
            contactType: 'EMAIL', 
            contactValue: 'user1@example.com' 
          }
        },
        {
          id: 'req2', 
          status: RideRequestStatus.REJECTED,
          fromUser: { 
            id: 'user2', 
            name: 'User 2', 
            contactType: 'PHONE', 
            contactValue: '1234567890' 
          }
        }
      ];

      const mockOutboxRequests = [
        {
          id: 'req3',
          status: RideRequestStatus.ACCEPTED,
          toUser: { 
            id: 'user3', 
            name: 'User 3', 
            contactType: 'WECHAT', 
            contactValue: 'user3_wechat' 
          }
        },
        {
          id: 'req4',
          status: RideRequestStatus.PENDING,
          toUser: { 
            id: 'user4', 
            name: 'User 4', 
            contactType: 'EMAIL', 
            contactValue: 'user4@example.com' 
          }
        }
      ];

      prismaMock.rideRequest.findMany.resolves(mockInboxRequests);

      const inboxReq: any = { params: { userId: 'user5' } };
      const inboxRes: any = {
        status: sinon.stub().returnsThis(),
        json: sinon.stub()
      };

      await getRideRequestInbox(inboxReq, inboxRes);

      const inboxResponse = inboxRes.json.firstCall.args[0];
      expect(inboxResponse.success).to.be.true;
      
      // ACCEPTED request should have contact info
      expect(inboxResponse.data[0].fromUser.contactType).to.equal('EMAIL');
      expect(inboxResponse.data[0].fromUser.contactValue).to.equal('user1@example.com');
      
      // REJECTED request should have null contact info
      expect(inboxResponse.data[1].fromUser.contactType).to.be.null;
      expect(inboxResponse.data[1].fromUser.contactValue).to.be.null;

      // Test outbox
      prismaMock.rideRequest.findMany.resolves(mockOutboxRequests);
      
      const outboxReq: any = { params: { userId: 'user5' } };
      const outboxRes: any = {
        status: sinon.stub().returnsThis(),
        json: sinon.stub()
      };

      await getRideRequestOutbox(outboxReq, outboxRes);

      const outboxResponse = outboxRes.json.firstCall.args[0];
      expect(outboxResponse.success).to.be.true;
      
      // ACCEPTED request should have contact info
      expect(outboxResponse.data[0].toUser.contactType).to.equal('WECHAT');
      expect(outboxResponse.data[0].toUser.contactValue).to.equal('user3_wechat');
      
      // PENDING request should have null contact info
      expect(outboxResponse.data[1].toUser.contactType).to.be.null;
      expect(outboxResponse.data[1].toUser.contactValue).to.be.null;
    });
  });
});