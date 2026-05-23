import { expect } from 'chai';
import sinon from 'sinon';
import { AppError } from '../../lib/AppError';
import { userService } from '../../services/userService';
import {
  changePassword,
  createUser,
  deleteUser,
  getUserById
} from '../../controllers/userController';

const mockRes = () => {
  const res: any = {};
  res.status = sinon.stub().returns(res);
  res.json = sinon.stub().returns(res);
  return res;
};

const makeNext = (res: any) => (err?: any) => {
  if (!err) return;
  const status = (err instanceof AppError) ? err.statusCode : (err.status || 500);
  res.status(status).json({ success: false, error: err.message });
};

describe('userController', () => {
  let sandbox: sinon.SinonSandbox;

  beforeEach(() => {
    sandbox = sinon.createSandbox();
  });

  afterEach(() => {
    sandbox.restore();
  });

  describe('createUser', () => {
    it('should return 400 for validation errors', async () => {
      const req: any = { body: { email: 'invalid-email' } };
      const res = mockRes();
      await createUser(req, res, makeNext(res));
      expect(res.status.calledWith(400)).to.be.true;
      expect(res.json.calledWithMatch({ success: false, error: 'Validation error' })).to.be.true;
    });

    it('should return 409 if user already exists', async () => {
      const req: any = {
        body: {
          email: 'test@example.com', password: 'password123', name: 'Test User',
          contactType: 'EMAIL', contactValue: 'test@example.com',
          campus: 'UBC', homeArea: 'Vancouver'
        }
      };
      const res = mockRes();
      sandbox.stub(userService, 'createUser').rejects(new AppError(409, 'User with this email already exists'));
      await createUser(req, res, makeNext(res));
      expect(res.status.calledWith(409)).to.be.true;
      expect(res.json.calledWithMatch({ success: false, error: 'User with this email already exists' })).to.be.true;
    });

    it('should create user successfully', async () => {
      const req: any = {
        body: {
          email: 'test@example.com', password: 'password123', name: 'Test User',
          contactType: 'EMAIL', contactValue: 'test@example.com',
          campus: 'UBC', homeArea: 'Vancouver'
        }
      };
      const res = mockRes();
      const mockUser = { id: 'new-user-id', email: 'test@example.com', name: 'Test User', isActive: true };
      sandbox.stub(userService, 'createUser').resolves(mockUser as any);
      await createUser(req, res, makeNext(res));
      expect(res.status.calledWith(201)).to.be.true;
      expect(res.json.calledWithMatch({ success: true, data: mockUser, message: 'User created successfully' })).to.be.true;
    });
  });

  describe('getUserById', () => {
    it('should return 404 if user not found', async () => {
      const req: any = { params: { id: 'nonexistent-id' } };
      const res = mockRes();
      sandbox.stub(userService, 'getUserById').rejects(new AppError(404, 'User not found'));
      await getUserById(req, res, makeNext(res));
      expect(res.status.calledWith(404)).to.be.true;
      expect(res.json.calledWithMatch({ success: false, error: 'User not found' })).to.be.true;
    });

    it('should return user successfully', async () => {
      const req: any = { params: { id: 'user-id' } };
      const res = mockRes();
      const mockUser = { id: 'user-id', name: 'Test User', schedule: [], _count: { sentConnections: 0, receivedConnections: 0 } };
      sandbox.stub(userService, 'getUserById').resolves(mockUser as any);
      await getUserById(req, res, makeNext(res));
      expect(res.json.calledWithMatch({ success: true, data: mockUser })).to.be.true;
    });
  });

  describe('changePassword', () => {
    it('should return 400 for validation errors', async () => {
      const req: any = { params: { id: 'user-id' }, body: { currentPassword: 'short' } };
      const res = mockRes();
      await changePassword(req, res, makeNext(res));
      expect(res.status.calledWith(400)).to.be.true;
      expect(res.json.calledWithMatch({ success: false, error: 'Validation error' })).to.be.true;
    });

    it('should return 400 for incorrect current password', async () => {
      const req: any = {
        params: { id: 'user-id' },
        body: { currentPassword: 'wrongpassword', newPassword: 'newpass123' }
      };
      const res = mockRes();
      sandbox.stub(userService, 'changePassword').rejects(new AppError(400, 'Current password is incorrect'));
      await changePassword(req, res, makeNext(res));
      expect(res.status.calledWith(400)).to.be.true;
      expect(res.json.calledWithMatch({ success: false, error: 'Current password is incorrect' })).to.be.true;
    });

    it('should change password successfully', async () => {
      const req: any = {
        params: { id: 'user-id' },
        body: { currentPassword: 'current123', newPassword: 'newpass123' }
      };
      const res = mockRes();
      sandbox.stub(userService, 'changePassword').resolves();
      await changePassword(req, res, makeNext(res));
      expect(res.json.calledWithMatch({ success: true, message: 'Password changed successfully' })).to.be.true;
    });
  });

  describe('deleteUser', () => {
    it('should return 404 if user not found', async () => {
      const req: any = { params: { id: 'nonexistent-id' } };
      const res = mockRes();
      sandbox.stub(userService, 'deleteUser').rejects(new AppError(404, 'User not found'));
      await deleteUser(req, res, makeNext(res));
      expect(res.status.calledWith(404)).to.be.true;
      expect(res.json.calledWithMatch({ success: false, error: 'User not found' })).to.be.true;
    });

    it('should soft delete user successfully', async () => {
      const req: any = { params: { id: 'user-id' } };
      const res = mockRes();
      sandbox.stub(userService, 'deleteUser').resolves();
      await deleteUser(req, res, makeNext(res));
      expect(res.json.calledWithMatch({ success: true, message: 'User deactivated successfully' })).to.be.true;
    });
  });
});
