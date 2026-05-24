import bcrypt from 'bcrypt';
import { expect } from 'chai';
import sinon from 'sinon';
import { AppError } from '../../lib/AppError';
import { prisma } from '../../lib/prisma';
import { userService } from '../../services/userService';

describe('userService', () => {
  let sandbox: sinon.SinonSandbox;

  beforeEach(() => {
    sandbox = sinon.createSandbox();
  });

  afterEach(() => {
    sandbox.restore();
  });

  describe('createUser', () => {
    it('should throw AppError(409) when email already exists', async () => {
      sandbox.stub(prisma, 'user').value({
        findUnique: sinon.stub().resolves({ id: 'existing-user' })
      });

      try {
        await userService.createUser({
          email: 'taken@example.com', password: 'pass123', name: 'Test',
          contactType: 'EMAIL', contactValue: 'taken@example.com',
          campus: 'UBC', homeArea: 'Vancouver'
        });
        expect.fail('should have thrown');
      } catch (err: any) {
        expect(err).to.be.instanceOf(AppError);
        expect(err.statusCode).to.equal(409);
        expect(err.message).to.include('already exists');
      }
    });

    it('should hash password and create user on success', async () => {
      const mockUser = { id: 'new-id', email: 'new@example.com', name: 'New User', isActive: true };
      const userStub = {
        findUnique: sinon.stub().resolves(null),
        create: sinon.stub().resolves(mockUser)
      };
      sandbox.stub(prisma, 'user').value(userStub);
      sandbox.stub(bcrypt, 'hash').resolves('hashed-password');

      const result = await userService.createUser({
        email: 'new@example.com', password: 'pass123', name: 'New User',
        contactType: 'EMAIL', contactValue: 'new@example.com',
        campus: 'UBC', homeArea: 'Vancouver'
      });

      expect(result).to.deep.equal(mockUser);
      const createCall = userStub.create.firstCall.args[0];
      expect(createCall.data).to.have.property('passwordHash', 'hashed-password');
      expect(createCall.data).to.not.have.property('password');
    });
  });

  describe('getUserById', () => {
    it('should throw AppError(404) when user not found', async () => {
      sandbox.stub(prisma, 'user').value({
        findUnique: sinon.stub().resolves(null)
      });

      try {
        await userService.getUserById('nonexistent');
        expect.fail('should have thrown');
      } catch (err: any) {
        expect(err).to.be.instanceOf(AppError);
        expect(err.statusCode).to.equal(404);
      }
    });

    it('should return user when found', async () => {
      const mockUser = { id: 'user-id', name: 'Test User', schedule: [], _count: { sentConnections: 0, receivedConnections: 0 } };
      sandbox.stub(prisma, 'user').value({
        findUnique: sinon.stub().resolves(mockUser)
      });

      const result = await userService.getUserById('user-id');
      expect(result).to.deep.equal(mockUser);
    });
  });

  describe('changePassword', () => {
    it('should throw AppError(404) when user not found', async () => {
      sandbox.stub(prisma, 'user').value({
        findUnique: sinon.stub().resolves(null)
      });

      try {
        await userService.changePassword('nonexistent', 'old', 'new');
        expect.fail('should have thrown');
      } catch (err: any) {
        expect(err).to.be.instanceOf(AppError);
        expect(err.statusCode).to.equal(404);
      }
    });

    it('should throw AppError(400) when current password is wrong', async () => {
      sandbox.stub(prisma, 'user').value({
        findUnique: sinon.stub().resolves({ id: 'user-id', passwordHash: 'stored-hash' })
      });
      sandbox.stub(bcrypt, 'compare').resolves(false);

      try {
        await userService.changePassword('user-id', 'wrongpass', 'newpass');
        expect.fail('should have thrown');
      } catch (err: any) {
        expect(err).to.be.instanceOf(AppError);
        expect(err.statusCode).to.equal(400);
        expect(err.message).to.include('incorrect');
      }
    });

    it('should update password hash on success', async () => {
      const userStub = {
        findUnique: sinon.stub().resolves({ id: 'user-id', passwordHash: 'old-hash' }),
        update: sinon.stub().resolves()
      };
      sandbox.stub(prisma, 'user').value(userStub);
      sandbox.stub(bcrypt, 'compare').resolves(true);
      sandbox.stub(bcrypt, 'hash').resolves('new-hash');

      await userService.changePassword('user-id', 'currentpass', 'newpass');

      expect(userStub.update.calledOnce).to.be.true;
      const updateArgs = userStub.update.firstCall.args[0];
      expect(updateArgs.data.passwordHash).to.equal('new-hash');
    });
  });

  describe('deleteUser', () => {
    it('should throw AppError(404) when user not found', async () => {
      sandbox.stub(prisma, 'user').value({
        findUnique: sinon.stub().resolves(null)
      });

      try {
        await userService.deleteUser('nonexistent');
        expect.fail('should have thrown');
      } catch (err: any) {
        expect(err).to.be.instanceOf(AppError);
        expect(err.statusCode).to.equal(404);
      }
    });

    it('should soft delete by setting isActive to false', async () => {
      const userStub = {
        findUnique: sinon.stub().resolves({ id: 'user-id', isActive: true }),
        update: sinon.stub().resolves()
      };
      sandbox.stub(prisma, 'user').value(userStub);

      await userService.deleteUser('user-id');

      expect(userStub.update.calledOnce).to.be.true;
      const updateArgs = userStub.update.firstCall.args[0];
      expect(updateArgs.data.isActive).to.equal(false);
    });
  });
});
