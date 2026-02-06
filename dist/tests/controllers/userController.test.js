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
describe('userController', () => {
    let userController;
    let prismaMock;
    let userMock;
    let bcryptMock;
    beforeEach(() => {
        const { prismaMock: prisma, userMock: user } = (0, prisma_mock_1.makePrismaMock)();
        prismaMock = prisma;
        userMock = user;
        // Mock bcrypt
        bcryptMock = {
            hash: sinon_1.default.stub(),
            compare: sinon_1.default.stub()
        };
        // Use proxyquire to inject mocks
        userController = (0, proxyquire_1.default)('../../controllers/userController', {
            '../lib/prisma': { prisma: prismaMock },
            'bcrypt': bcryptMock
        });
    });
    afterEach(() => {
        sinon_1.default.restore();
    });
    describe('createUser', () => {
        it('should return 400 for validation errors', async () => {
            const req = (0, express_mock_1.mockReq)({
                body: { email: 'invalid-email' } // Missing required fields
            });
            const res = (0, express_mock_1.mockRes)();
            await userController.createUser(req, res);
            (0, chai_1.expect)(res.status.calledWith(400)).to.be.true;
            (0, chai_1.expect)(res.json.calledWithMatch({
                success: false,
                error: 'Validation error'
            })).to.be.true;
        });
        it('should return 409 if user already exists', async () => {
            const req = (0, express_mock_1.mockReq)({
                body: {
                    email: 'test@example.com',
                    password: 'password123',
                    name: 'Test User',
                    contactType: 'EMAIL',
                    contactValue: 'test@example.com',
                    campus: 'UBC',
                    homeArea: 'Vancouver'
                }
            });
            const res = (0, express_mock_1.mockRes)();
            // Mock existing user found
            userMock.findUnique.resolves({ id: 'existing-user-id' });
            await userController.createUser(req, res);
            (0, chai_1.expect)(res.status.calledWith(409)).to.be.true;
            (0, chai_1.expect)(res.json.calledWithMatch({
                success: false,
                error: 'User with this email already exists'
            })).to.be.true;
        });
        it('should create user successfully', async () => {
            const req = (0, express_mock_1.mockReq)({
                body: {
                    email: 'test@example.com',
                    password: 'password123',
                    name: 'Test User',
                    contactType: 'EMAIL',
                    contactValue: 'test@example.com',
                    campus: 'UBC',
                    homeArea: 'Vancouver'
                }
            });
            const res = (0, express_mock_1.mockRes)();
            const mockUser = {
                id: 'new-user-id',
                email: 'test@example.com',
                name: 'Test User',
                isActive: true
            };
            // Mock no existing user
            userMock.findUnique.resolves(null);
            // Mock password hashing
            bcryptMock.hash.resolves('hashed-password');
            // Mock user creation
            userMock.create.resolves(mockUser);
            await userController.createUser(req, res);
            (0, chai_1.expect)(res.status.calledWith(201)).to.be.true;
            (0, chai_1.expect)(res.json.calledWithMatch({
                success: true,
                data: mockUser,
                message: 'User created successfully'
            })).to.be.true;
        });
    });
    describe('getUsers', () => {
        it('should return users with pagination', async () => {
            const req = (0, express_mock_1.mockReq)({
                query: { page: '1', limit: '5', campus: 'UBC' }
            });
            const res = (0, express_mock_1.mockRes)();
            const mockUsers = [
                { id: 'user1', name: 'User 1', campus: 'UBC' },
                { id: 'user2', name: 'User 2', campus: 'UBC' }
            ];
            userMock.findMany.resolves(mockUsers);
            userMock.count.resolves(10);
            await userController.getUsers(req, res);
            (0, chai_1.expect)(res.json.calledWithMatch({
                success: true,
                data: mockUsers,
                pagination: {
                    page: 1,
                    limit: 5,
                    total: 10,
                    totalPages: 2
                }
            })).to.be.true;
        });
    });
    describe('getUserById', () => {
        it('should return 404 if user not found', async () => {
            const req = (0, express_mock_1.mockReq)({ params: { id: 'nonexistent-id' } });
            const res = (0, express_mock_1.mockRes)();
            userMock.findUnique.resolves(null);
            await userController.getUserById(req, res);
            (0, chai_1.expect)(res.status.calledWith(404)).to.be.true;
            (0, chai_1.expect)(res.json.calledWithMatch({
                success: false,
                error: 'User not found'
            })).to.be.true;
        });
        it('should return user successfully', async () => {
            const req = (0, express_mock_1.mockReq)({ params: { id: 'user-id' } });
            const res = (0, express_mock_1.mockRes)();
            const mockUser = {
                id: 'user-id',
                name: 'Test User',
                schedule: [],
                _count: { sentConnections: 0, receivedConnections: 0 }
            };
            userMock.findUnique.resolves(mockUser);
            await userController.getUserById(req, res);
            (0, chai_1.expect)(res.json.calledWithMatch({
                success: true,
                data: mockUser
            })).to.be.true;
        });
    });
    describe('changePassword', () => {
        it('should return 400 for validation errors', async () => {
            const req = (0, express_mock_1.mockReq)({
                params: { id: 'user-id' },
                body: { currentPassword: 'short' } // Missing newPassword, currentPassword too short
            });
            const res = (0, express_mock_1.mockRes)();
            await userController.changePassword(req, res);
            (0, chai_1.expect)(res.status.calledWith(400)).to.be.true;
            (0, chai_1.expect)(res.json.calledWithMatch({
                success: false,
                error: 'Validation error'
            })).to.be.true;
        });
        it('should return 404 if user not found', async () => {
            const req = (0, express_mock_1.mockReq)({
                params: { id: 'nonexistent-id' },
                body: { currentPassword: 'current123', newPassword: 'newpass123' }
            });
            const res = (0, express_mock_1.mockRes)();
            userMock.findUnique.resolves(null);
            await userController.changePassword(req, res);
            (0, chai_1.expect)(res.status.calledWith(404)).to.be.true;
            (0, chai_1.expect)(res.json.calledWithMatch({
                success: false,
                error: 'User not found'
            })).to.be.true;
        });
        it('should return 400 for incorrect current password', async () => {
            const req = (0, express_mock_1.mockReq)({
                params: { id: 'user-id' },
                body: { currentPassword: 'wrongpassword', newPassword: 'newpass123' }
            });
            const res = (0, express_mock_1.mockRes)();
            userMock.findUnique.resolves({ id: 'user-id', passwordHash: 'stored-hash' });
            bcryptMock.compare.resolves(false); // Password comparison fails
            await userController.changePassword(req, res);
            (0, chai_1.expect)(res.status.calledWith(400)).to.be.true;
            (0, chai_1.expect)(res.json.calledWithMatch({
                success: false,
                error: 'Current password is incorrect'
            })).to.be.true;
        });
        it('should change password successfully', async () => {
            const req = (0, express_mock_1.mockReq)({
                params: { id: 'user-id' },
                body: { currentPassword: 'current123', newPassword: 'newpass123' }
            });
            const res = (0, express_mock_1.mockRes)();
            userMock.findUnique.resolves({ id: 'user-id', passwordHash: 'stored-hash' });
            bcryptMock.compare.resolves(true); // Password comparison succeeds
            bcryptMock.hash.resolves('new-hashed-password');
            userMock.update.resolves({ id: 'user-id' });
            await userController.changePassword(req, res);
            (0, chai_1.expect)(res.json.calledWithMatch({
                success: true,
                message: 'Password changed successfully'
            })).to.be.true;
        });
    });
    describe('deleteUser', () => {
        it('should return 404 if user not found', async () => {
            const req = (0, express_mock_1.mockReq)({ params: { id: 'nonexistent-id' } });
            const res = (0, express_mock_1.mockRes)();
            userMock.findUnique.resolves(null);
            await userController.deleteUser(req, res);
            (0, chai_1.expect)(res.status.calledWith(404)).to.be.true;
            (0, chai_1.expect)(res.json.calledWithMatch({
                success: false,
                error: 'User not found'
            })).to.be.true;
        });
        it('should soft delete user successfully', async () => {
            const req = (0, express_mock_1.mockReq)({ params: { id: 'user-id' } });
            const res = (0, express_mock_1.mockRes)();
            userMock.findUnique.resolves({ id: 'user-id' });
            userMock.update.resolves({ id: 'user-id', isActive: false });
            await userController.deleteUser(req, res);
            (0, chai_1.expect)(res.json.calledWithMatch({
                success: true,
                message: 'User deactivated successfully'
            })).to.be.true;
            (0, chai_1.expect)(userMock.update.calledWithMatch({
                where: { id: 'user-id' },
                data: { isActive: false }
            })).to.be.true;
        });
    });
});
//# sourceMappingURL=userController.test.js.map