"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const chai_1 = require("chai");
const sinon_1 = __importDefault(require("sinon"));
const express_mock_1 = require("../utils/express-mock");
const prisma_mock_1 = require("../utils/prisma-mock");
describe('scheduleController', () => {
    let sandbox;
    let prismaMock;
    let userMock;
    let scheduleEntryMock;
    let transactionMock;
    let scheduleController;
    beforeEach(() => {
        sandbox = sinon_1.default.createSandbox();
        const mockSetup = (0, prisma_mock_1.makePrismaMock)();
        prismaMock = mockSetup.prismaMock;
        userMock = mockSetup.userMock;
        scheduleEntryMock = mockSetup.scheduleEntryMock;
        transactionMock = mockSetup.transactionMock;
        // Clear module cache
        const moduleKeys = require.cache ? Object.keys(require.cache).filter(key => key.includes('scheduleController') || key.includes('lib/prisma')) : [];
        moduleKeys.forEach(key => delete require.cache[key]);
        // Mock the dependencies
        const Module = require('module');
        const originalRequire = Module.prototype.require;
        Module.prototype.require = function (id) {
            if (id === '../lib/prisma') {
                return { prisma: prismaMock };
            }
            return originalRequire.apply(this, arguments);
        };
        scheduleController = require('../../controllers/scheduleController');
        Module.prototype.require = originalRequire;
    });
    afterEach(() => {
        sandbox.restore();
    });
    describe('createScheduleEntry', () => {
        it('should return 400 for validation errors', async () => {
            const req = (0, express_mock_1.mockReq)({
                params: { userId: 'user-id' },
                body: { dayOfWeek: 8, toCampusMins: -1 } // Invalid values
            });
            const res = (0, express_mock_1.mockRes)();
            await scheduleController.createScheduleEntry(req, res);
            (0, chai_1.expect)(res.status.calledWith(400)).to.be.true;
            (0, chai_1.expect)(res.json.calledWithMatch({
                success: false,
                message: 'Validation error'
            })).to.be.true;
        });
        it('should return 404 if user not found', async () => {
            const req = (0, express_mock_1.mockReq)({
                params: { userId: 'nonexistent-user' },
                body: { dayOfWeek: 1, toCampusMins: 480, goHomeMins: 1020 }
            });
            const res = (0, express_mock_1.mockRes)();
            userMock.findUnique.resolves(null);
            await scheduleController.createScheduleEntry(req, res);
            (0, chai_1.expect)(res.status.calledWith(404)).to.be.true;
            (0, chai_1.expect)(res.json.calledWithMatch({
                success: false,
                message: 'User not found'
            })).to.be.true;
        });
        it('should handle P2002 unique constraint error', async () => {
            const req = (0, express_mock_1.mockReq)({
                params: { userId: 'user-id' },
                body: { dayOfWeek: 1, toCampusMins: 480, goHomeMins: 1020 }
            });
            const res = (0, express_mock_1.mockRes)();
            userMock.findUnique.resolves({ id: 'user-id' });
            const error = new Error('Unique constraint failed');
            error.code = 'P2002';
            scheduleEntryMock.create.rejects(error);
            await scheduleController.createScheduleEntry(req, res);
            (0, chai_1.expect)(res.status.calledWith(409)).to.be.true;
            (0, chai_1.expect)(res.json.calledWithMatch({
                success: false,
                message: 'Schedule entry for this day already exists'
            })).to.be.true;
        });
        it('should create schedule entry successfully', async () => {
            const req = (0, express_mock_1.mockReq)({
                params: { userId: 'user-id' },
                body: { dayOfWeek: 1, toCampusMins: 480, goHomeMins: 1020 }
            });
            const res = (0, express_mock_1.mockRes)();
            const mockScheduleEntry = {
                id: 'schedule-id',
                userId: 'user-id',
                dayOfWeek: 1,
                toCampusMins: 480,
                goHomeMins: 1020,
                user: { id: 'user-id', name: 'Test User' }
            };
            userMock.findUnique.resolves({ id: 'user-id' });
            scheduleEntryMock.create.resolves(mockScheduleEntry);
            await scheduleController.createScheduleEntry(req, res);
            (0, chai_1.expect)(res.status.calledWith(201)).to.be.true;
            (0, chai_1.expect)(res.json.calledWithMatch({
                success: true,
                message: 'Schedule entry created successfully',
                data: mockScheduleEntry
            })).to.be.true;
        });
    });
    describe('getScheduleEntryByDay', () => {
        it('should return 404 if entry not found', async () => {
            const req = (0, express_mock_1.mockReq)({
                params: { userId: 'user-id', dayOfWeek: '1' }
            });
            const res = (0, express_mock_1.mockRes)();
            scheduleEntryMock.findUnique.resolves(null);
            await scheduleController.getScheduleEntryByDay(req, res);
            (0, chai_1.expect)(res.status.calledWith(404)).to.be.true;
            (0, chai_1.expect)(res.json.calledWithMatch({
                success: false,
                message: 'Schedule entry not found for this day'
            })).to.be.true;
        });
        it('should return schedule entry by day', async () => {
            const req = (0, express_mock_1.mockReq)({
                params: { userId: 'user-id', dayOfWeek: '1' }
            });
            const res = (0, express_mock_1.mockRes)();
            const mockEntry = {
                id: 'entry-id',
                userId: 'user-id',
                dayOfWeek: 1,
                toCampusMins: 480
            };
            scheduleEntryMock.findUnique.resolves(mockEntry);
            await scheduleController.getScheduleEntryByDay(req, res);
            (0, chai_1.expect)(res.json.calledWithMatch({
                success: true,
                data: mockEntry
            })).to.be.true;
        });
    });
    describe('updateScheduleEntry', () => {
        it('should return 404 if entry not found', async () => {
            const req = (0, express_mock_1.mockReq)({
                params: { entryId: 'nonexistent-entry' },
                body: { toCampusMins: 500 }
            });
            const res = (0, express_mock_1.mockRes)();
            const error = new Error('Record not found');
            error.code = 'P2025';
            scheduleEntryMock.update.rejects(error);
            await scheduleController.updateScheduleEntry(req, res);
            (0, chai_1.expect)(res.status.calledWith(404)).to.be.true;
            (0, chai_1.expect)(res.json.calledWithMatch({
                success: false,
                message: 'Schedule entry not found'
            })).to.be.true;
        });
        it('should update schedule entry successfully', async () => {
            const req = (0, express_mock_1.mockReq)({
                params: { entryId: 'entry-id' },
                body: { toCampusMins: 500 }
            });
            const res = (0, express_mock_1.mockRes)();
            const mockUpdatedEntry = {
                id: 'entry-id',
                toCampusMins: 500
            };
            scheduleEntryMock.update.resolves(mockUpdatedEntry);
            await scheduleController.updateScheduleEntry(req, res);
            (0, chai_1.expect)(res.json.calledWithMatch({
                success: true,
                message: 'Schedule entry updated successfully',
                data: mockUpdatedEntry
            })).to.be.true;
        });
    });
    describe('deleteScheduleEntry', () => {
        it('should return 404 if entry not found', async () => {
            const req = (0, express_mock_1.mockReq)({ params: { entryId: 'nonexistent-entry' } });
            const res = (0, express_mock_1.mockRes)();
            const error = new Error('Record not found');
            error.code = 'P2025';
            scheduleEntryMock.delete.rejects(error);
            await scheduleController.deleteScheduleEntry(req, res);
            (0, chai_1.expect)(res.status.calledWith(404)).to.be.true;
            (0, chai_1.expect)(res.json.calledWithMatch({
                success: false,
                message: 'Schedule entry not found'
            })).to.be.true;
        });
        it('should delete schedule entry successfully', async () => {
            const req = (0, express_mock_1.mockReq)({ params: { entryId: 'entry-id' } });
            const res = (0, express_mock_1.mockRes)();
            scheduleEntryMock.delete.resolves({ id: 'entry-id' });
            await scheduleController.deleteScheduleEntry(req, res);
            (0, chai_1.expect)(res.json.calledWithMatch({
                success: true,
                message: 'Schedule entry deleted successfully'
            })).to.be.true;
        });
    });
    describe('createWeeklySchedule', () => {
        it('should return 404 if user not found', async () => {
            const req = (0, express_mock_1.mockReq)({
                params: { userId: 'nonexistent-user' },
                body: [
                    { dayOfWeek: 1, toCampusMins: 480, goHomeMins: 1020 }
                ]
            });
            const res = (0, express_mock_1.mockRes)();
            userMock.findUnique.resolves(null);
            await scheduleController.createWeeklySchedule(req, res);
            (0, chai_1.expect)(res.status.calledWith(404)).to.be.true;
            (0, chai_1.expect)(res.json.calledWithMatch({
                success: false,
                message: 'User not found'
            })).to.be.true;
        });
        it('should create weekly schedule successfully', async () => {
            const req = (0, express_mock_1.mockReq)({
                params: { userId: 'user-id' },
                body: [
                    { dayOfWeek: 1, toCampusMins: 480, goHomeMins: 1020 },
                    { dayOfWeek: 2, toCampusMins: 480, goHomeMins: 1020 }
                ]
            });
            const res = (0, express_mock_1.mockRes)();
            const mockScheduleEntries = [
                { id: 'entry1', dayOfWeek: 1, toCampusMins: 480 },
                { id: 'entry2', dayOfWeek: 2, toCampusMins: 480 }
            ];
            userMock.findUnique.resolves({ id: 'user-id' });
            // Mock transaction function that calls the callback with a transaction object
            transactionMock.callsFake(async (callback) => {
                const tx = { scheduleEntry: { upsert: sinon_1.default.stub() } };
                tx.scheduleEntry.upsert.resolves({ id: 'entry-id' });
                return await callback(tx);
            });
            await scheduleController.createWeeklySchedule(req, res);
            (0, chai_1.expect)(res.status.calledWith(200)).to.be.true;
            (0, chai_1.expect)(res.json.calledWithMatch({
                success: true,
                message: 'Weekly schedule created/updated successfully'
            })).to.be.true;
            (0, chai_1.expect)(transactionMock.called).to.be.true;
        });
    });
});
//# sourceMappingURL=scheduleController.test.js.map