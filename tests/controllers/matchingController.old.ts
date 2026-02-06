import { expect } from 'chai';
import sinon from 'sinon';
import { mockReq, mockRes } from '../utils/express-mock';
import { makePrismaMock } from '../utils/prisma-mock';

describe('matchingController', () => {
  let sandbox: sinon.SinonSandbox;
  let prismaMock: any;
  let userMock: any;
  let scheduleEntryMock: any;
  let timeUtilsMock: any;
  let matchingController: any;

  beforeEach(() => {
    sandbox = sinon.createSandbox();
    
    const mockSetup = makePrismaMock();
    prismaMock = mockSetup.prismaMock;
    userMock = mockSetup.userMock;
    scheduleEntryMock = mockSetup.scheduleEntryMock;

    // Mock time utilities
    timeUtilsMock = {
      timeToMinutes: sandbox.stub(),
      minutesToTime: sandbox.stub()
    };

    // Clear module cache
    const moduleKeys = Object.keys(require.cache).filter(key => 
      key.includes('matchingController') || key.includes('lib/prisma') || key.includes('lib/timeUtils')
    );
    moduleKeys.forEach(key => delete require.cache[key]);

    // Mock the dependencies
    const Module = require('module');
    const originalRequire = Module.prototype.require;
    
    Module.prototype.require = function(id: string) {
      if (id === '../lib/prisma') {
        return { prisma: prismaMock };
      }
      if (id === '../lib/timeUtils') {
        return timeUtilsMock;
      }
      return originalRequire.apply(this, arguments);
    };

    matchingController = require('../../controllers/matchingController');
    Module.prototype.require = originalRequire;
  });

  afterEach(() => {
    sandbox.restore();
  });

  describe('findOptimalDriversToCampus', () => {
    it('should return 400 for validation errors', async () => {
      const req = mockReq({
        params: { userId: 'user-id' },
        body: { dayOfWeek: 8, toCampusTime: 'invalid-time' } // Invalid values
      });
      const res = mockRes();

      await matchingController.findOptimalDriversToCampus(req, res);

      expect(res.status.calledWith(400)).to.be.true;
      expect(res.json.called).to.be.true;
      const jsonResponse = res.json.getCall(0).args[0];
      expect(jsonResponse.success).to.be.false;
    });

    it('should return 404 if user not found', async () => {
      const req = mockReq({
        params: { userId: 'nonexistent-user' },
        body: { dayOfWeek: 1, toCampusTime: '08:00', flexibilityMins: 15 }
      });
      const res = mockRes();

      timeUtilsMock.timeToMinutes.returns(480);
      userMock.findUnique.resolves(null);

      await matchingController.findOptimalDriversToCampus(req, res);

      expect(res.status.calledWith(404)).to.be.true;
      expect(res.json.called).to.be.true;
      const jsonResponse = res.json.getCall(0).args[0];
      expect(jsonResponse.success).to.be.false;
    });

    it('should find optimal drivers successfully', async () => {
      const req = mockReq({
        params: { userId: 'user-id' },
        body: { dayOfWeek: 1, toCampusTime: '08:00', flexibilityMins: 15 }
      });
      const res = mockRes();

      const mockDrivers = [
        {
          id: 'driver1',
          user: { id: 'driver-user-1', name: 'Driver 1', campus: 'UBC' },
          toCampusMins: 480
        }
      ];

      timeUtilsMock.timeToMinutes.returns(480);
      userMock.findUnique.resolves({ campus: 'UBC', homeArea: 'Vancouver' });
      scheduleEntryMock.findMany.resolves(mockDrivers);

      await matchingController.findOptimalDriversToCampus(req, res);

      expect(res.json.calledWithMatch({
        success: true,
        data: mockDrivers
      })).to.be.true;
    });
  });

  describe('findOptimalPassengersToCampus', () => {
    it('should return 400 for validation errors', async () => {
      const req = mockReq({
        params: { userId: 'user-id' },
        body: { dayOfWeek: -1 } // Invalid day
      });
      const res = mockRes();

      await matchingController.findOptimalPassengersToCampus(req, res);

      expect(res.status.calledWith(400)).to.be.true;
      expect(res.json.calledWithMatch({
        success: false,
        message: 'Validation error'
      })).to.be.true;
    });

    it('should find optimal passengers successfully', async () => {
      const req = mockReq({
        params: { userId: 'user-id' },
        body: { dayOfWeek: 1, toCampusTime: '08:00', flexibilityMins: 15 }
      });
      const res = mockRes();

      const mockPassengers = [
        {
          id: 'passenger1',
          user: { id: 'passenger-user-1', name: 'Passenger 1', campus: 'UBC' },
          toCampusMins: 485
        }
      ];

      timeUtilsMock.timeToMinutes.returns(480);
      userMock.findUnique.resolves({ campus: 'UBC', homeArea: 'Vancouver' });
      scheduleEntryMock.findMany.resolves(mockPassengers);

      await matchingController.findOptimalPassengersToCampus(req, res);

      expect(res.json.calledWithMatch({
        success: true,
        data: mockPassengers
      })).to.be.true;
    });
  });

  describe('findOptimalDriversGoHome', () => {
    it('should find optimal drivers for going home', async () => {
      const req = mockReq({
        params: { userId: 'user-id' },
        body: { dayOfWeek: 1, goHomeTime: '17:00', flexibilityMins: 20 }
      });
      const res = mockRes();

      const mockDrivers = [
        {
          id: 'driver1',
          user: { id: 'driver-user-1', name: 'Driver 1', homeArea: 'Vancouver' },
          goHomeMins: 1020
        }
      ];

      timeUtilsMock.timeToMinutes.returns(1020);
      userMock.findUnique.resolves({ campus: 'UBC', homeArea: 'Vancouver' });
      scheduleEntryMock.findMany.resolves(mockDrivers);

      await matchingController.findOptimalDriversGoHome(req, res);

      expect(res.json.calledWithMatch({
        success: true,
        data: mockDrivers
      })).to.be.true;
    });
  });

  describe('findOptimalPassengersGoHome', () => {
    it('should find optimal passengers for going home', async () => {
      const req = mockReq({
        params: { userId: 'user-id' },
        body: { dayOfWeek: 1, goHomeTime: '17:00', flexibilityMins: 20 }
      });
      const res = mockRes();

      const mockPassengers = [
        {
          id: 'passenger1',
          user: { id: 'passenger-user-1', name: 'Passenger 1', homeArea: 'Vancouver' },
          goHomeMins: 1030
        }
      ];

      timeUtilsMock.timeToMinutes.returns(1020);
      userMock.findUnique.resolves({ campus: 'UBC', homeArea: 'Vancouver' });
      scheduleEntryMock.findMany.resolves(mockPassengers);

      await matchingController.findOptimalPassengersGoHome(req, res);

      expect(res.json.calledWithMatch({
        success: true,
        data: mockPassengers
      })).to.be.true;
    });
  });

  describe('getDriverAvailability', () => {
    it('should return 404 if driver not found', async () => {
      const req = mockReq({
        params: { driverId: 'nonexistent-driver', dayOfWeek: '1' }
      });
      const res = mockRes();

      userMock.findUnique.resolves(null);

      await matchingController.getDriverAvailability(req, res);

      expect(res.status.calledWith(404)).to.be.true;
      expect(res.json.calledWithMatch({
        success: false,
        message: 'Driver not found'
      })).to.be.true;
    });

    it('should return 404 if driver not available on specified day', async () => {
      const req = mockReq({
        params: { driverId: 'driver-id', dayOfWeek: '1' }
      });
      const res = mockRes();

      userMock.findUnique.resolves({ id: 'driver-id', role: 'DRIVER' });
      scheduleEntryMock.findUnique.resolves(null);

      await matchingController.getDriverAvailability(req, res);

      expect(res.status.calledWith(404)).to.be.true;
      expect(res.json.calledWithMatch({
        success: false,
        message: 'Driver not available on this day'
      })).to.be.true;
    });

    it('should return driver availability successfully', async () => {
      const req = mockReq({
        params: { driverId: 'driver-id', dayOfWeek: '1' }
      });
      const res = mockRes();

      const mockDriver = { id: 'driver-id', role: 'DRIVER' };
      const mockSchedule = {
        id: 'schedule-id',
        dayOfWeek: 1,
        toCampusMins: 480,
        goHomeMins: 1020,
        enabled: true
      };

      userMock.findUnique.resolves(mockDriver);
      scheduleEntryMock.findUnique.resolves(mockSchedule);
      timeUtilsMock.minutesToTime.withArgs(480).returns('08:00');
      timeUtilsMock.minutesToTime.withArgs(1020).returns('17:00');

      await matchingController.getDriverAvailability(req, res);

      expect(res.json.calledWithMatch({
        success: true,
        data: {
          driver: mockDriver,
          schedule: mockSchedule,
          availability: {
            toCampusTime: '08:00',
            goHomeTime: '17:00'
          }
        }
      })).to.be.true;
    });
  });
});