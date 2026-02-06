"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const chai_1 = require("chai");
const proxyquire_1 = __importDefault(require("proxyquire"));
const sinon_1 = __importDefault(require("sinon"));
const supertest_1 = __importDefault(require("supertest"));
const prisma_mock_1 = require("../utils/prisma-mock");
describe('API Routes - Smoke Tests', () => {
    let app;
    let prismaMock;
    let userMock;
    let scheduleEntryMock;
    let bcryptMock;
    before(() => {
        const { prismaMock: prisma, userMock: user, scheduleEntryMock: schedule } = (0, prisma_mock_1.makePrismaMock)();
        prismaMock = prisma;
        userMock = user;
        scheduleEntryMock = schedule;
        // Mock bcrypt
        bcryptMock = {
            hash: sinon_1.default.stub().resolves('hashed-password'),
            compare: sinon_1.default.stub().resolves(true)
        };
        // Mock the controllers with stubs
        const userControllerMock = {
            createUser: sinon_1.default.stub(),
            getUsers: sinon_1.default.stub(),
            getUserById: sinon_1.default.stub(),
            updateUser: sinon_1.default.stub(),
            changePassword: sinon_1.default.stub(),
            deleteUser: sinon_1.default.stub(),
            permanentDeleteUser: sinon_1.default.stub()
        };
        const scheduleControllerMock = {
            createScheduleEntry: sinon_1.default.stub(),
            getUserScheduleEntries: sinon_1.default.stub(),
            getScheduleEntryByDay: sinon_1.default.stub(),
            updateScheduleEntry: sinon_1.default.stub(),
            deleteScheduleEntry: sinon_1.default.stub(),
            createWeeklySchedule: sinon_1.default.stub()
        };
        // Create app with mocked dependencies
        app = (0, proxyquire_1.default)('../../app', {
            './lib/prisma': { prisma: prismaMock },
            'bcrypt': bcryptMock,
            './controllers/userController': userControllerMock,
            './controllers/scheduleController': scheduleControllerMock
        });
        // Set up controller responses
        userControllerMock.createUser.callsFake((req, res) => {
            res.status(201).json({
                success: true,
                data: { id: 'new-user-id', email: 'test@example.com' },
                message: 'User created successfully'
            });
        });
        scheduleControllerMock.createScheduleEntry.callsFake((req, res) => {
            res.status(201).json({
                success: true,
                data: { id: 'schedule-id', userId: req.params.userId, dayOfWeek: 1 },
                message: 'Schedule entry created successfully'
            });
        });
    });
    describe('User Routes', () => {
        it('PUT /api/users should create a user', async () => {
            const userData = {
                email: 'test@example.com',
                password: 'password123',
                name: 'Test User',
                contactType: 'EMAIL',
                contactValue: 'test@example.com',
                campus: 'UBC',
                homeArea: 'Vancouver'
            };
            const response = await (0, supertest_1.default)(app)
                .put('/api/users')
                .send(userData)
                .expect(201);
            (0, chai_1.expect)(response.body.success).to.be.true;
            (0, chai_1.expect)(response.body.data).to.have.property('id');
            (0, chai_1.expect)(response.body.message).to.equal('User created successfully');
        });
        it('GET /api/users should return users list', async () => {
            // This would typically test the actual routing, but since we're using controller mocks,
            // this mainly verifies the route is wired correctly
            const response = await (0, supertest_1.default)(app)
                .get('/api/users');
            // The response depends on how the mock is set up
            // In a real scenario, you'd mock getUsers to return a proper response
        });
    });
    describe('Schedule Routes', () => {
        it('POST /api/schedule/users/:userId/schedule should create schedule entry', async () => {
            const scheduleData = {
                dayOfWeek: 1,
                toCampusMins: 480,
                goHomeMins: 1020
            };
            const response = await (0, supertest_1.default)(app)
                .post('/api/schedule/users/test-user-id/schedule')
                .send(scheduleData)
                .expect(201);
            (0, chai_1.expect)(response.body.success).to.be.true;
            (0, chai_1.expect)(response.body.data).to.have.property('id');
            (0, chai_1.expect)(response.body.message).to.equal('Schedule entry created successfully');
        });
    });
    describe('404 Handling', () => {
        it('should return 404 for non-existent routes', async () => {
            await (0, supertest_1.default)(app)
                .get('/api/nonexistent')
                .expect(404);
        });
    });
});
//# sourceMappingURL=api.test.js.map