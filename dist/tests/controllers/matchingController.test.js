"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const chai_1 = require("chai");
const proxyquire_1 = __importDefault(require("proxyquire"));
const sinon_1 = __importDefault(require("sinon"));
const express_mock_1 = require("../utils/express-mock");
const prisma_mock_1 = require("../utils/prisma-mock");
describe('matchingController', () => {
    let matchingController;
    let prismaMock;
    let userMock;
    let scheduleEntryMock;
    let timeUtilsMock;
    beforeEach(() => {
        const { prismaMock: prisma, userMock: user, scheduleEntryMock: schedule } = (0, prisma_mock_1.makePrismaMock)();
        prismaMock = prisma;
        userMock = user;
        scheduleEntryMock = schedule;
        // Mock time utilities
        timeUtilsMock = {
            timeToMinutes: sinon_1.default.stub(),
            minutesToTime: sinon_1.default.stub()
        };
        // Use proxyquire to inject mocks
        matchingController = (0, proxyquire_1.default)('../../controllers/matchingController', {
            '../lib/prisma': { prisma: prismaMock },
            '../lib/timeUtils': timeUtilsMock
        });
    });
    afterEach(() => {
        sinon_1.default.restore();
    });
    describe('findOptimalDriversToCampus', () => {
        it('should return 400 for validation errors', async () => {
            const req = (0, express_mock_1.mockReq)({
                params: { userId: 'user-id' },
                body: { dayOfWeek: 8, toCampusTime: 'invalid-time' } // Invalid values
            });
            const res = (0, express_mock_1.mockRes)();
            await matchingController.findOptimalDriversToCampus(req, res);
            (0, chai_1.expect)(res.status.calledWith(400)).to.be.true;
            (0, chai_1.expect)(res.json.calledWithMatch({
                success: false,
                message: 'Validation error'
            })).to.be.true;
        });
        it('should return 404 if user not found', async () => {
            const req = (0, express_mock_1.mockReq)({
                params: { userId: 'nonexistent-user' },
                body: { dayOfWeek: 1, toCampusTime: '08:00', flexibilityMins: 15 }
            });
            const res = (0, express_mock_1.mockRes)();
            timeUtilsMock.timeToMinutes.returns(480);
            userMock.findUnique.resolves(null);
            await matchingController.findOptimalDriversToCampus(req, res);
            (0, chai_1.expect)(res.status.calledWith(404)).to.be.true;
            (0, chai_1.expect)(res.json.calledWithMatch({
                success: false,
                message: 'User not found'
            })).to.be.true;
        });
        it('should find optimal drivers successfully', async () => {
            const req = (0, express_mock_1.mockReq)({
                params: { userId: 'user-id' },
                body: { dayOfWeek: 1, toCampusTime: '08:00', flexibilityMins: 15 }
            });
            const res = (0, express_mock_1.mockRes)();
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
            (0, chai_1.expect)(res.json.calledWithMatch({
                success: true,
                data: mockDrivers
            })).to.be.true;
        });
    });
    describe('findOptimalPassengersToCampus', () => {
        it('should return 400 for validation errors', async () => {
            const req = (0, express_mock_1.mockReq)({
                params: { userId: 'user-id' },
                body: { dayOfWeek: -1 } // Invalid day
            });
            const res = (0, express_mock_1.mockRes)();
            await matchingController.findOptimalPassengersToCampus(req, res);
            (0, chai_1.expect)(res.status.calledWith(400)).to.be.true;
            (0, chai_1.expect)(res.json.calledWithMatch({
                success: false,
                message: 'Validation error'
            })).to.be.true;
        });
        it('should find optimal passengers successfully', async () => {
            const req = (0, express_mock_1.mockReq)({
                params: { userId: 'user-id' },
                body: { dayOfWeek: 1, toCampusTime: '08:00', flexibilityMins: 15 }
            });
            const res = (0, express_mock_1.mockRes)();
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
            (0, chai_1.expect)(res.json.calledWithMatch({
                success: true,
                data: mockPassengers
            })).to.be.true;
        });
    });
    describe('findOptimalDriversGoHome', () => {
        it('should find optimal drivers for going home', async () => {
            const req = (0, express_mock_1.mockReq)({
                params: { userId: 'user-id' },
                body: { dayOfWeek: 1, goHomeTime: '17:00', flexibilityMins: 20 }
            });
            const res = (0, express_mock_1.mockRes)();
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
            (0, chai_1.expect)(res.json.calledWithMatch({
                success: true,
                data: mockDrivers
            })).to.be.true;
        });
    });
    describe('findOptimalPassengersGoHome', () => {
        it('should find optimal passengers for going home', async () => {
            const req = (0, express_mock_1.mockReq)({
                params: { userId: 'user-id' },
                body: { dayOfWeek: 1, goHomeTime: '17:00', flexibilityMins: 20 }
            });
            const res = (0, express_mock_1.mockRes)();
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
            (0, chai_1.expect)(res.json.calledWithMatch({
                success: true,
                data: mockPassengers
            })).to.be.true;
        });
    });
    describe('getDriverAvailability', () => {
        it('should return 404 if driver not found', async () => {
            const req = (0, express_mock_1.mockReq)({
                params: { driverId: 'nonexistent-driver', dayOfWeek: '1' }
            });
            const res = (0, express_mock_1.mockRes)();
            userMock.findUnique.resolves(null);
            await matchingController.getDriverAvailability(req, res);
            (0, chai_1.expect)(res.status.calledWith(404)).to.be.true;
            (0, chai_1.expect)(res.json.calledWithMatch({
                success: false,
                message: 'Driver not found'
            })).to.be.true;
        });
        it('should return 404 if driver not available on specified day', async () => {
            const req = (0, express_mock_1.mockReq)({
                params: { driverId: 'driver-id', dayOfWeek: '1' }
            });
            const res = (0, express_mock_1.mockRes)();
            userMock.findUnique.resolves({ id: 'driver-id', role: 'DRIVER' });
            scheduleEntryMock.findUnique.resolves(null);
            await matchingController.getDriverAvailability(req, res);
            (0, chai_1.expect)(res.status.calledWith(404)).to.be.true;
            (0, chai_1.expect)(res.json.calledWithMatch({
                success: false,
                message: 'Driver not available on this day'
            })).to.be.true;
        });
        it('should return driver availability successfully', async () => {
            const req = (0, express_mock_1.mockReq)({
                params: { driverId: 'driver-id', dayOfWeek: '1' }
            });
            const res = (0, express_mock_1.mockRes)();
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
            (0, chai_1.expect)(res.json.calledWithMatch({
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
//# sourceMappingURL=matchingController.test.js.map