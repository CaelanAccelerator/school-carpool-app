"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const chai_1 = require("chai");
const sinon_1 = __importDefault(require("sinon"));
const express_mock_1 = require("../utils/express-mock");
const prisma_mock_1 = require("../utils/prisma-mock");
describe('matchingController', () => {
    let sandbox;
    let prismaMock;
    let userMock;
    let scheduleEntryMock;
    let timeUtilsMock;
    let matchingController;
    beforeEach(() => {
        sandbox = sinon_1.default.createSandbox();
        const mockSetup = (0, prisma_mock_1.makePrismaMock)();
        prismaMock = mockSetup.prismaMock;
        userMock = mockSetup.userMock;
        scheduleEntryMock = mockSetup.scheduleEntryMock;
        // Mock time utilities
        timeUtilsMock = {
            timeToMinutes: sandbox.stub(),
            minutesToTime: sandbox.stub()
        };
        // Clear module cache
        const moduleKeys = require.cache ? Object.keys(require.cache).filter(key => key.includes('matchingController') || key.includes('lib/prisma') || key.includes('lib/timeUtils')) : [];
        moduleKeys.forEach(key => delete require.cache[key]);
        // Mock the dependencies
        const Module = require('module');
        const originalRequire = Module.prototype.require;
        Module.prototype.require = function (id) {
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
        it('should return 400 for invalid input', async () => {
            const req = (0, express_mock_1.mockReq)({
                params: { userId: 'test-user-id' },
                body: { dayOfWeek: 8, toCampusTime: 'invalid-time' } // Invalid values
            });
            const res = (0, express_mock_1.mockRes)();
            await matchingController.findOptimalDriversToCampus(req, res);
            (0, chai_1.expect)(res.status.calledWith(400)).to.be.true;
            (0, chai_1.expect)(res.json.called).to.be.true;
            const jsonResponse = res.json.getCall(0).args[0];
            (0, chai_1.expect)(jsonResponse).to.have.property('success', false);
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
            (0, chai_1.expect)(res.json.called).to.be.true;
            const jsonResponse = res.json.getCall(0).args[0];
            (0, chai_1.expect)(jsonResponse).to.have.property('success', false);
        });
        it('should find optimal drivers successfully', async () => {
            const req = (0, express_mock_1.mockReq)({
                params: { userId: 'test-user' },
                body: { dayOfWeek: 1, toCampusTime: '08:00', flexibilityMins: 15 }
            });
            const res = (0, express_mock_1.mockRes)();
            const mockUser = { id: 'test-user', name: 'Test User', campus: 'Main Campus' };
            const mockDrivers = [
                { id: 'driver1', name: 'Driver 1', toCampusTimeMins: 480 },
                { id: 'driver2', name: 'Driver 2', toCampusTimeMins: 490 }
            ];
            timeUtilsMock.timeToMinutes.returns(480);
            userMock.findUnique.resolves(mockUser);
            scheduleEntryMock.findMany.resolves(mockDrivers);
            await matchingController.findOptimalDriversToCampus(req, res);
            (0, chai_1.expect)(res.json.called).to.be.true;
            const jsonResponse = res.json.getCall(0).args[0];
            (0, chai_1.expect)(jsonResponse).to.have.property('success', true);
            (0, chai_1.expect)(jsonResponse).to.have.property('data');
        });
    });
    describe('findOptimalDriversGoHome', () => {
        it('should return 400 for invalid input', async () => {
            const req = (0, express_mock_1.mockReq)({
                params: { userId: 'test-user-id' },
                body: { dayOfWeek: 8, goHomeTime: 'invalid-time' } // Invalid values
            });
            const res = (0, express_mock_1.mockRes)();
            await matchingController.findOptimalDriversGoHome(req, res);
            (0, chai_1.expect)(res.status.calledWith(400)).to.be.true;
            (0, chai_1.expect)(res.json.called).to.be.true;
            const jsonResponse = res.json.getCall(0).args[0];
            (0, chai_1.expect)(jsonResponse).to.have.property('success', false);
        });
        it('should return 404 if user not found', async () => {
            const req = (0, express_mock_1.mockReq)({
                params: { userId: 'nonexistent-user' },
                body: { dayOfWeek: 1, goHomeTime: '17:00', flexibilityMins: 30 }
            });
            const res = (0, express_mock_1.mockRes)();
            timeUtilsMock.timeToMinutes.returns(1020);
            userMock.findUnique.resolves(null);
            await matchingController.findOptimalDriversGoHome(req, res);
            (0, chai_1.expect)(res.status.calledWith(404)).to.be.true;
            (0, chai_1.expect)(res.json.called).to.be.true;
            const jsonResponse = res.json.getCall(0).args[0];
            (0, chai_1.expect)(jsonResponse).to.have.property('success', false);
        });
        it('should find optimal drivers successfully', async () => {
            const req = (0, express_mock_1.mockReq)({
                params: { userId: 'test-user' },
                body: { dayOfWeek: 1, goHomeTime: '17:00', flexibilityMins: 30 }
            });
            const res = (0, express_mock_1.mockRes)();
            const mockUser = { id: 'test-user', name: 'Test User', campus: 'Main Campus' };
            const mockDrivers = [
                { id: 'driver1', name: 'Driver 1', goHomeMins: 1020 }
            ];
            timeUtilsMock.timeToMinutes.returns(1020);
            userMock.findUnique.resolves(mockUser);
            scheduleEntryMock.findMany.resolves(mockDrivers);
            await matchingController.findOptimalDriversGoHome(req, res);
            (0, chai_1.expect)(res.json.called).to.be.true;
            const jsonResponse = res.json.getCall(0).args[0];
            (0, chai_1.expect)(jsonResponse).to.have.property('success', true);
            (0, chai_1.expect)(jsonResponse).to.have.property('data');
        });
    });
    describe('findOptimalPassengersToCampus', () => {
        it('should return 400 for invalid input', async () => {
            const req = (0, express_mock_1.mockReq)({
                params: { userId: 'test-user-id' },
                body: { dayOfWeek: 8, toCampusTime: 'invalid-time' } // Invalid values
            });
            const res = (0, express_mock_1.mockRes)();
            await matchingController.findOptimalPassengersToCampus(req, res);
            (0, chai_1.expect)(res.status.calledWith(400)).to.be.true;
            (0, chai_1.expect)(res.json.called).to.be.true;
            const jsonResponse = res.json.getCall(0).args[0];
            (0, chai_1.expect)(jsonResponse).to.have.property('success', false);
        });
        it('should return 404 if user not found', async () => {
            const req = (0, express_mock_1.mockReq)({
                params: { userId: 'nonexistent-user' },
                body: { dayOfWeek: 1, toCampusTime: '08:00', flexibilityMins: 15 }
            });
            const res = (0, express_mock_1.mockRes)();
            timeUtilsMock.timeToMinutes.returns(480);
            userMock.findUnique.resolves(null);
            await matchingController.findOptimalPassengersToCampus(req, res);
            (0, chai_1.expect)(res.status.calledWith(404)).to.be.true;
            (0, chai_1.expect)(res.json.called).to.be.true;
            const jsonResponse = res.json.getCall(0).args[0];
            (0, chai_1.expect)(jsonResponse).to.have.property('success', false);
        });
        it('should find optimal passengers successfully', async () => {
            const req = (0, express_mock_1.mockReq)({
                params: { userId: 'driver-user' },
                body: { dayOfWeek: 1, toCampusTime: '08:00', flexibilityMins: 15 }
            });
            const res = (0, express_mock_1.mockRes)();
            const mockDriver = { id: 'driver-user', name: 'Driver User', campus: 'Main Campus' };
            const mockPassengers = [
                { id: 'passenger1', name: 'Passenger 1', toCampusMins: 480 }
            ];
            timeUtilsMock.timeToMinutes.returns(480);
            userMock.findUnique.resolves(mockDriver);
            scheduleEntryMock.findMany.resolves(mockPassengers);
            await matchingController.findOptimalPassengersToCampus(req, res);
            (0, chai_1.expect)(res.json.called).to.be.true;
            const jsonResponse = res.json.getCall(0).args[0];
            (0, chai_1.expect)(jsonResponse).to.have.property('success', true);
            (0, chai_1.expect)(jsonResponse).to.have.property('data');
        });
    });
    describe('findOptimalPassengersGoHome', () => {
        it('should return 400 for invalid input', async () => {
            const req = (0, express_mock_1.mockReq)({
                params: { userId: 'test-user-id' },
                body: { dayOfWeek: 8, goHomeTime: 'invalid-time' } // Invalid values
            });
            const res = (0, express_mock_1.mockRes)();
            await matchingController.findOptimalPassengersGoHome(req, res);
            (0, chai_1.expect)(res.status.calledWith(400)).to.be.true;
            (0, chai_1.expect)(res.json.called).to.be.true;
            const jsonResponse = res.json.getCall(0).args[0];
            (0, chai_1.expect)(jsonResponse).to.have.property('success', false);
        });
        it('should return 404 if user not found', async () => {
            const req = (0, express_mock_1.mockReq)({
                params: { userId: 'nonexistent-user' },
                body: { dayOfWeek: 1, goHomeTime: '17:00', flexibilityMins: 30 }
            });
            const res = (0, express_mock_1.mockRes)();
            timeUtilsMock.timeToMinutes.returns(1020);
            userMock.findUnique.resolves(null);
            await matchingController.findOptimalPassengersGoHome(req, res);
            (0, chai_1.expect)(res.status.calledWith(404)).to.be.true;
            (0, chai_1.expect)(res.json.called).to.be.true;
            const jsonResponse = res.json.getCall(0).args[0];
            (0, chai_1.expect)(jsonResponse).to.have.property('success', false);
        });
        it('should find optimal passengers successfully', async () => {
            const req = (0, express_mock_1.mockReq)({
                params: { userId: 'driver-user' },
                body: { dayOfWeek: 1, goHomeTime: '17:00', flexibilityMins: 30 }
            });
            const res = (0, express_mock_1.mockRes)();
            const mockDriver = { id: 'driver-user', name: 'Driver User', campus: 'Main Campus' };
            const mockPassengers = [
                { id: 'passenger1', name: 'Passenger 1', goHomeMins: 1020 }
            ];
            timeUtilsMock.timeToMinutes.returns(1020);
            userMock.findUnique.resolves(mockDriver);
            scheduleEntryMock.findMany.resolves(mockPassengers);
            await matchingController.findOptimalPassengersGoHome(req, res);
            (0, chai_1.expect)(res.json.called).to.be.true;
            const jsonResponse = res.json.getCall(0).args[0];
            (0, chai_1.expect)(jsonResponse).to.have.property('success', true);
            (0, chai_1.expect)(jsonResponse).to.have.property('data');
        });
    });
    describe('getDriverAvailability', () => {
        it('should return 400 for invalid input', async () => {
            const req = (0, express_mock_1.mockReq)({
                params: { driverId: 'test-user-id', dayOfWeek: '8' } // Invalid day
            });
            const res = (0, express_mock_1.mockRes)();
            await matchingController.getDriverAvailability(req, res);
            (0, chai_1.expect)(res.status.calledWith(400)).to.be.true;
            (0, chai_1.expect)(res.json.called).to.be.true;
            const jsonResponse = res.json.getCall(0).args[0];
            (0, chai_1.expect)(jsonResponse).to.have.property('success', false);
        });
        it('should return 404 if driver not found', async () => {
            const req = (0, express_mock_1.mockReq)({
                params: { driverId: 'nonexistent-driver', dayOfWeek: '1' }
            });
            const res = (0, express_mock_1.mockRes)();
            userMock.findUnique.resolves(null);
            await matchingController.getDriverAvailability(req, res);
            (0, chai_1.expect)(res.status.calledWith(404)).to.be.true;
            (0, chai_1.expect)(res.json.called).to.be.true;
            const jsonResponse = res.json.getCall(0).args[0];
            (0, chai_1.expect)(jsonResponse).to.have.property('success', false);
        });
        it('should return 404 if driver not available on specified day', async () => {
            const req = (0, express_mock_1.mockReq)({
                params: { driverId: 'driver1', dayOfWeek: '1' }
            });
            const res = (0, express_mock_1.mockRes)();
            const mockDriver = { id: 'driver1', name: 'Driver 1' };
            userMock.findUnique.resolves(mockDriver);
            scheduleEntryMock.findFirst.resolves(null); // No availability
            await matchingController.getDriverAvailability(req, res);
            (0, chai_1.expect)(res.status.calledWith(404)).to.be.true;
            (0, chai_1.expect)(res.json.called).to.be.true;
            const jsonResponse = res.json.getCall(0).args[0];
            (0, chai_1.expect)(jsonResponse).to.have.property('success', false);
        });
        it('should return driver availability successfully', async () => {
            const req = (0, express_mock_1.mockReq)({
                params: { driverId: 'driver1', dayOfWeek: '1' }
            });
            const res = (0, express_mock_1.mockRes)();
            const mockDriver = { id: 'driver1', name: 'Driver 1' };
            const mockSchedule = {
                id: 'schedule1',
                userId: 'driver1',
                dayOfWeek: 1,
                toCampusMins: 480,
                availableSeats: 3
            };
            userMock.findUnique.resolves(mockDriver);
            scheduleEntryMock.findFirst.resolves(mockSchedule);
            await matchingController.getDriverAvailability(req, res);
            (0, chai_1.expect)(res.json.called).to.be.true;
            const jsonResponse = res.json.getCall(0).args[0];
            (0, chai_1.expect)(jsonResponse).to.have.property('success', true);
            (0, chai_1.expect)(jsonResponse).to.have.property('data');
        });
    });
});
//# sourceMappingURL=matchingController.test.js.map