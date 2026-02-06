import { expect } from 'chai';
import sinon from 'sinon';
import { mockReq, mockRes } from '../utils/express-mock';
import { makePrismaMock } from '../utils/prisma-mock';

describe('userController', () => {
  let sandbox: sinon.SinonSandbox;
  let prismaMock: any;
  let userMock: any;
  let bcryptMock: any;
  let userController: any;

  beforeEach(() => {
    sandbox = sinon.createSandbox();
    
    const mockSetup = makePrismaMock();
    prismaMock = mockSetup.prismaMock;
    userMock = mockSetup.userMock;

    // Create bcrypt mock
    bcryptMock = {
      hash: sandbox.stub(),
      compare: sandbox.stub()
    };

    // Clear module cache to allow fresh imports
    const moduleKeys = require.cache ? Object.keys(require.cache).filter(key => 
      key.includes('userController') || key.includes('lib/prisma')
    ) : [];
    moduleKeys.forEach(key => delete require.cache[key]);

    // Mock the dependencies directly
    const Module = require('module');
    const originalRequire = Module.prototype.require;
    
    Module.prototype.require = function(id: string) {
      if (id === '../lib/prisma') {
        return { prisma: prismaMock };
      }
      if (id === 'bcrypt') {
        return bcryptMock;
      }
      return originalRequire.apply(this, arguments);
    };

    // Import controller after setting up mocks
    userController = require('../../controllers/userController');
    
    // Restore original require
    Module.prototype.require = originalRequire;
  });

  afterEach(() => {
    sandbox.restore();
  });

  describe('createUser', () => {
    it('should return 400 for validation errors', async () => {
      const req = mockReq({
        body: { email: 'invalid-email' } // Missing required fields
      });
      const res = mockRes();

      await userController.createUser(req, res);

      expect(res.status.calledWith(400)).to.be.true;
      expect(res.json.calledWithMatch({
        success: false,
        error: 'Validation error'
      })).to.be.true;
    });

    it('should return 409 if user already exists', async () => {
      const req = mockReq({
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
      const res = mockRes();

      // Mock existing user found
      userMock.findUnique.resolves({ id: 'existing-user-id' });

      await userController.createUser(req, res);

      expect(res.status.calledWith(409)).to.be.true;
      expect(res.json.calledWithMatch({
        success: false,
        error: 'User with this email already exists'
      })).to.be.true;
    });

    it('should create user successfully', async () => {
      const req = mockReq({
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
      const res = mockRes();

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

      expect(res.status.calledWith(201)).to.be.true;
      expect(res.json.calledWithMatch({
        success: true,
        data: mockUser,
        message: 'User created successfully'
      })).to.be.true;
    });
  });

  describe('getUserById', () => {
    it('should return 404 if user not found', async () => {
      const req = mockReq({ params: { id: 'nonexistent-id' } });
      const res = mockRes();

      userMock.findUnique.resolves(null);

      await userController.getUserById(req, res);

      expect(res.status.calledWith(404)).to.be.true;
      expect(res.json.calledWithMatch({
        success: false,
        error: 'User not found'
      })).to.be.true;
    });

    it('should return user successfully', async () => {
      const req = mockReq({ params: { id: 'user-id' } });
      const res = mockRes();

      const mockUser = {
        id: 'user-id',
        name: 'Test User',
        schedule: [],
        _count: { sentConnections: 0, receivedConnections: 0 }
      };

      userMock.findUnique.resolves(mockUser);

      await userController.getUserById(req, res);

      expect(res.json.calledWithMatch({
        success: true,
        data: mockUser
      })).to.be.true;
    });
  });

  describe('changePassword', () => {
    it('should return 400 for validation errors', async () => {
      const req = mockReq({
        params: { id: 'user-id' },
        body: { currentPassword: 'short' } // Missing newPassword
      });
      const res = mockRes();

      await userController.changePassword(req, res);

      expect(res.status.calledWith(400)).to.be.true;
      expect(res.json.calledWithMatch({
        success: false,
        error: 'Validation error'
      })).to.be.true;
    });

    it('should return 400 for incorrect current password', async () => {
      const req = mockReq({
        params: { id: 'user-id' },
        body: { currentPassword: 'wrongpassword', newPassword: 'newpass123' }
      });
      const res = mockRes();

      userMock.findUnique.resolves({ id: 'user-id', passwordHash: 'stored-hash' });
      bcryptMock.compare.resolves(false); // Password comparison fails

      await userController.changePassword(req, res);

      expect(res.status.calledWith(400)).to.be.true;
      expect(res.json.calledWithMatch({
        success: false,
        error: 'Current password is incorrect'
      })).to.be.true;
    });

    it('should change password successfully', async () => {
      const req = mockReq({
        params: { id: 'user-id' },
        body: { currentPassword: 'current123', newPassword: 'newpass123' }
      });
      const res = mockRes();

      userMock.findUnique.resolves({ id: 'user-id', passwordHash: 'stored-hash' });
      bcryptMock.compare.resolves(true); // Password comparison succeeds
      bcryptMock.hash.resolves('new-hashed-password');
      userMock.update.resolves({ id: 'user-id' });

      await userController.changePassword(req, res);

      expect(res.json.calledWithMatch({
        success: true,
        message: 'Password changed successfully'
      })).to.be.true;
    });
  });

  describe('deleteUser', () => {
    it('should return 404 if user not found', async () => {
      const req = mockReq({ params: { id: 'nonexistent-id' } });
      const res = mockRes();

      userMock.findUnique.resolves(null);

      await userController.deleteUser(req, res);

      expect(res.status.calledWith(404)).to.be.true;
      expect(res.json.calledWithMatch({
        success: false,
        error: 'User not found'
      })).to.be.true;
    });

    it('should soft delete user successfully', async () => {
      const req = mockReq({ params: { id: 'user-id' } });
      const res = mockRes();

      userMock.findUnique.resolves({ id: 'user-id' });
      userMock.update.resolves({ id: 'user-id', isActive: false });

      await userController.deleteUser(req, res);

      expect(res.json.calledWithMatch({
        success: true,
        message: 'User deactivated successfully'
      })).to.be.true;
      expect(userMock.update.calledWithMatch({
        where: { id: 'user-id' },
        data: { isActive: false }
      })).to.be.true;
    });
  });
});