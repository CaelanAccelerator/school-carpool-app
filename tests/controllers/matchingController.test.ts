import { expect } from 'chai';
import sinon from 'sinon';
import { mockReq, mockRes } from '../utils/express-mock';
import { AppError } from '../../lib/AppError';
import { matchingService } from '../../services/matchingService';
import {
  findOptimalDriversToCampus,
  findOptimalDriversGoHome,
  findOptimalPassengersToCampus,
  findOptimalPassengersGoHome,
  getDriverAvailability
} from '../../controllers/matchingController';

const makeNext = (res: any) => (err?: any) => {
  if (!err) return;
  const status = (err instanceof AppError) ? err.statusCode : (err.status || 500);
  res.status(status).json({ success: false, error: err.message });
};

describe('matchingController', () => {
  let sandbox: sinon.SinonSandbox;

  beforeEach(() => {
    sandbox = sinon.createSandbox();
  });

  afterEach(() => {
    sandbox.restore();
  });

  describe('findOptimalDriversToCampus', () => {
    it('should return 400 for invalid input', async () => {
      const req: any = mockReq({ params: { userId: 'test-user-id' }, body: { dayOfWeek: 8, toCampusTime: 'invalid-time' } });
      const res: any = mockRes();
      await findOptimalDriversToCampus(req, res, makeNext(res));
      expect(res.status.calledWith(400)).to.be.true;
      expect(res.json.getCall(0).args[0]).to.have.property('success', false);
    });

    it('should return 404 if user not found', async () => {
      const req: any = mockReq({ params: { userId: 'nonexistent-user' }, body: { dayOfWeek: 1, toCampusTime: '08:00', flexibilityMins: 15 } });
      const res: any = mockRes();
      sandbox.stub(matchingService, 'matchByTimeField').rejects(new AppError(404, 'User not found'));
      await findOptimalDriversToCampus(req, res, makeNext(res));
      expect(res.status.calledWith(404)).to.be.true;
      expect(res.json.getCall(0).args[0]).to.have.property('success', false);
    });

    it('should find optimal drivers successfully', async () => {
      const req: any = mockReq({ params: { userId: 'test-user' }, body: { dayOfWeek: 1, toCampusTime: '08:00', flexibilityMins: 15 } });
      const res: any = mockRes();
      sandbox.stub(matchingService, 'matchByTimeField').resolves({
        results: [{ id: 'driver1' }, { id: 'driver2' }],
        geoNote: null
      } as any);
      await findOptimalDriversToCampus(req, res, makeNext(res));
      expect(res.json.called).to.be.true;
      expect(res.json.getCall(0).args[0]).to.have.property('success', true);
      expect(res.json.getCall(0).args[0]).to.have.property('data');
    });
  });

  describe('findOptimalDriversGoHome', () => {
    it('should return 400 for invalid input', async () => {
      const req: any = mockReq({ params: { userId: 'test-user-id' }, body: { dayOfWeek: 8, goHomeTime: 'invalid-time' } });
      const res: any = mockRes();
      await findOptimalDriversGoHome(req, res, makeNext(res));
      expect(res.status.calledWith(400)).to.be.true;
      expect(res.json.getCall(0).args[0]).to.have.property('success', false);
    });

    it('should return 404 if user not found', async () => {
      const req: any = mockReq({ params: { userId: 'nonexistent-user' }, body: { dayOfWeek: 1, goHomeTime: '17:00', flexibilityMins: 30 } });
      const res: any = mockRes();
      sandbox.stub(matchingService, 'matchByTimeField').rejects(new AppError(404, 'User not found'));
      await findOptimalDriversGoHome(req, res, makeNext(res));
      expect(res.status.calledWith(404)).to.be.true;
      expect(res.json.getCall(0).args[0]).to.have.property('success', false);
    });

    it('should find optimal drivers successfully', async () => {
      const req: any = mockReq({ params: { userId: 'test-user' }, body: { dayOfWeek: 1, goHomeTime: '17:00', flexibilityMins: 30 } });
      const res: any = mockRes();
      sandbox.stub(matchingService, 'matchByTimeField').resolves({ results: [{ id: 'driver1' }], geoNote: null } as any);
      await findOptimalDriversGoHome(req, res, makeNext(res));
      expect(res.json.getCall(0).args[0]).to.have.property('success', true);
      expect(res.json.getCall(0).args[0]).to.have.property('data');
    });
  });

  describe('findOptimalPassengersToCampus', () => {
    it('should return 400 for invalid input', async () => {
      const req: any = mockReq({ params: { userId: 'test-user-id' }, body: { dayOfWeek: 8, toCampusTime: 'invalid-time' } });
      const res: any = mockRes();
      await findOptimalPassengersToCampus(req, res, makeNext(res));
      expect(res.status.calledWith(400)).to.be.true;
      expect(res.json.getCall(0).args[0]).to.have.property('success', false);
    });

    it('should return 404 if user not found', async () => {
      const req: any = mockReq({ params: { userId: 'nonexistent-user' }, body: { dayOfWeek: 1, toCampusTime: '08:00', flexibilityMins: 15 } });
      const res: any = mockRes();
      sandbox.stub(matchingService, 'matchByTimeField').rejects(new AppError(404, 'User not found'));
      await findOptimalPassengersToCampus(req, res, makeNext(res));
      expect(res.status.calledWith(404)).to.be.true;
      expect(res.json.getCall(0).args[0]).to.have.property('success', false);
    });

    it('should find optimal passengers successfully', async () => {
      const req: any = mockReq({ params: { userId: 'driver-user' }, body: { dayOfWeek: 1, toCampusTime: '08:00', flexibilityMins: 15 } });
      const res: any = mockRes();
      sandbox.stub(matchingService, 'matchByTimeField').resolves({ results: [{ id: 'passenger1' }], geoNote: null } as any);
      await findOptimalPassengersToCampus(req, res, makeNext(res));
      expect(res.json.getCall(0).args[0]).to.have.property('success', true);
      expect(res.json.getCall(0).args[0]).to.have.property('data');
    });
  });

  describe('findOptimalPassengersGoHome', () => {
    it('should return 400 for invalid input', async () => {
      const req: any = mockReq({ params: { userId: 'test-user-id' }, body: { dayOfWeek: 8, goHomeTime: 'invalid-time' } });
      const res: any = mockRes();
      await findOptimalPassengersGoHome(req, res, makeNext(res));
      expect(res.status.calledWith(400)).to.be.true;
      expect(res.json.getCall(0).args[0]).to.have.property('success', false);
    });

    it('should return 404 if user not found', async () => {
      const req: any = mockReq({ params: { userId: 'nonexistent-user' }, body: { dayOfWeek: 1, goHomeTime: '17:00', flexibilityMins: 30 } });
      const res: any = mockRes();
      sandbox.stub(matchingService, 'matchByTimeField').rejects(new AppError(404, 'User not found'));
      await findOptimalPassengersGoHome(req, res, makeNext(res));
      expect(res.status.calledWith(404)).to.be.true;
      expect(res.json.getCall(0).args[0]).to.have.property('success', false);
    });

    it('should find optimal passengers successfully', async () => {
      const req: any = mockReq({ params: { userId: 'driver-user' }, body: { dayOfWeek: 1, goHomeTime: '17:00', flexibilityMins: 30 } });
      const res: any = mockRes();
      sandbox.stub(matchingService, 'matchByTimeField').resolves({ results: [{ id: 'passenger1' }], geoNote: null } as any);
      await findOptimalPassengersGoHome(req, res, makeNext(res));
      expect(res.json.getCall(0).args[0]).to.have.property('success', true);
      expect(res.json.getCall(0).args[0]).to.have.property('data');
    });
  });

  describe('getDriverAvailability', () => {
    it('should return 400 for invalid input', async () => {
      const req: any = mockReq({ params: { driverId: 'test-user-id', dayOfWeek: '8' } });
      const res: any = mockRes();
      await getDriverAvailability(req, res, makeNext(res));
      expect(res.status.calledWith(400)).to.be.true;
      expect(res.json.getCall(0).args[0]).to.have.property('success', false);
    });

    it('should return 404 if driver not found', async () => {
      const req: any = mockReq({ params: { driverId: 'nonexistent-driver', dayOfWeek: '1' } });
      const res: any = mockRes();
      sandbox.stub(matchingService, 'getDriverAvailability').rejects(
        new AppError(404, 'Driver not found or not available')
      );
      await getDriverAvailability(req, res, makeNext(res));
      expect(res.status.calledWith(404)).to.be.true;
      expect(res.json.getCall(0).args[0]).to.have.property('success', false);
    });

    it('should return 404 if driver not available on specified day', async () => {
      const req: any = mockReq({ params: { driverId: 'driver1', dayOfWeek: '1' } });
      const res: any = mockRes();
      sandbox.stub(matchingService, 'getDriverAvailability').rejects(
        new AppError(404, 'Driver not found or not available')
      );
      await getDriverAvailability(req, res, makeNext(res));
      expect(res.status.calledWith(404)).to.be.true;
      expect(res.json.getCall(0).args[0]).to.have.property('success', false);
    });

    it('should return driver availability successfully', async () => {
      const req: any = mockReq({ params: { driverId: 'driver1', dayOfWeek: '1' } });
      const res: any = mockRes();
      const mockData = { driver: { id: 'driver1' }, schedule: { dayOfWeek: 1, toCampusMins: 480 } };
      sandbox.stub(matchingService, 'getDriverAvailability').resolves(mockData as any);
      await getDriverAvailability(req, res, makeNext(res));
      expect(res.json.getCall(0).args[0]).to.have.property('success', true);
      expect(res.json.getCall(0).args[0]).to.have.property('data');
    });
  });
});
