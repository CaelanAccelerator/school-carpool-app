import bcrypt from 'bcrypt';
import { expect } from 'chai';
import sinon from 'sinon';
import { AppError } from '../../lib/AppError';
import { prisma } from '../../lib/prisma';
import { authService } from '../../services/authService';

describe('authService', () => {
  let sandbox: sinon.SinonSandbox;

  beforeEach(() => {
    sandbox = sinon.createSandbox();
  });

  afterEach(() => {
    sandbox.restore();
  });

  describe('login', () => {
    it('should throw AppError(401) when user not found', async () => {
      sandbox.stub(prisma, 'user').value({
        findUnique: sinon.stub().resolves(null)
      });

      try {
        await authService.login('nobody@example.com', 'pass');
        expect.fail('should have thrown');
      } catch (err: any) {
        expect(err).to.be.instanceOf(AppError);
        expect(err.statusCode).to.equal(401);
        expect(err.message).to.equal('Invalid email or password');
      }
    });

    it('should throw AppError(401) when user is inactive', async () => {
      sandbox.stub(prisma, 'user').value({
        findUnique: sinon.stub().resolves({ id: 'u1', isActive: false, passwordHash: 'hash' })
      });

      try {
        await authService.login('inactive@example.com', 'pass');
        expect.fail('should have thrown');
      } catch (err: any) {
        expect(err).to.be.instanceOf(AppError);
        expect(err.statusCode).to.equal(401);
      }
    });

    it('should throw AppError(401) when password is wrong', async () => {
      sandbox.stub(prisma, 'user').value({
        findUnique: sinon.stub().resolves({ id: 'u1', isActive: true, passwordHash: 'hash', role: 'PASSENGER' })
      });
      sandbox.stub(bcrypt, 'compare').resolves(false);

      try {
        await authService.login('user@example.com', 'wrongpass');
        expect.fail('should have thrown');
      } catch (err: any) {
        expect(err).to.be.instanceOf(AppError);
        expect(err.statusCode).to.equal(401);
        expect(err.message).to.equal('Invalid email or password');
      }
    });

    it('should return user and tokens on successful login', async () => {
      const mockUser = {
        id: 'u1', email: 'user@example.com', name: 'Test', isActive: true,
        passwordHash: 'hash', role: 'PASSENGER', photoUrl: null,
        contactType: 'EMAIL', contactValue: 'user@example.com',
        campus: 'UBC', homeArea: 'Vancouver', timeZone: 'UTC',
        homeAddress: null, homeLat: null, homeLng: null,
        createdAt: new Date(), updatedAt: new Date()
      };
      const refreshTokenStub = {
        create: sinon.stub().resolves()
      };
      sandbox.stub(prisma, 'user').value({
        findUnique: sinon.stub().resolves(mockUser)
      });
      sandbox.stub(prisma, 'refreshToken').value(refreshTokenStub);
      sandbox.stub(bcrypt, 'compare').resolves(true);

      const result = await authService.login('user@example.com', 'correctpass');

      expect(result).to.have.property('accessToken').that.is.a('string');
      expect(result).to.have.property('refreshToken').that.is.a('string');
      expect(result.user).to.not.have.property('passwordHash');
      expect(result.user.id).to.equal('u1');
      expect(refreshTokenStub.create.calledOnce).to.be.true;
    });
  });

  describe('refreshAccessToken', () => {
    it('should throw AppError(401) for invalid token signature', async () => {
      try {
        await authService.refreshAccessToken('invalid.token.here');
        expect.fail('should have thrown');
      } catch (err: any) {
        expect(err).to.be.instanceOf(AppError);
        expect(err.statusCode).to.equal(401);
        expect(err.message).to.include('Invalid refresh token');
      }
    });

    it('should throw AppError(401) when token not in DB', async () => {
      // Sign a valid token using the dev secret so verifyRefreshToken passes
      const jwt = require('jsonwebtoken');
      const validToken = jwt.sign({ userId: 'u1', role: 'PASSENGER' }, 'dev-refresh-secret-change-in-prod', { expiresIn: '7d' });

      sandbox.stub(prisma, 'refreshToken').value({
        findUnique: sinon.stub().resolves(null)
      });

      try {
        await authService.refreshAccessToken(validToken);
        expect.fail('should have thrown');
      } catch (err: any) {
        expect(err).to.be.instanceOf(AppError);
        expect(err.statusCode).to.equal(401);
        expect(err.message).to.include('expired or revoked');
      }
    });

    it('should throw AppError(401) when stored token is expired', async () => {
      const jwt = require('jsonwebtoken');
      const validToken = jwt.sign({ userId: 'u1', role: 'PASSENGER' }, 'dev-refresh-secret-change-in-prod', { expiresIn: '7d' });

      sandbox.stub(prisma, 'refreshToken').value({
        findUnique: sinon.stub().resolves({
          token: validToken,
          expiresAt: new Date(Date.now() - 1000)
        })
      });

      try {
        await authService.refreshAccessToken(validToken);
        expect.fail('should have thrown');
      } catch (err: any) {
        expect(err).to.be.instanceOf(AppError);
        expect(err.statusCode).to.equal(401);
      }
    });

    it('should return new accessToken for valid non-expired token', async () => {
      const jwt = require('jsonwebtoken');
      const validToken = jwt.sign({ userId: 'u1', role: 'PASSENGER' }, 'dev-refresh-secret-change-in-prod', { expiresIn: '7d' });

      sandbox.stub(prisma, 'refreshToken').value({
        findUnique: sinon.stub().resolves({
          token: validToken,
          expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)
        })
      });

      const result = await authService.refreshAccessToken(validToken);
      expect(result).to.have.property('accessToken').that.is.a('string');
    });
  });

  describe('getMe', () => {
    it('should throw AppError(401) when user not found', async () => {
      sandbox.stub(prisma, 'user').value({
        findUnique: sinon.stub().resolves(null)
      });

      try {
        await authService.getMe('nonexistent');
        expect.fail('should have thrown');
      } catch (err: any) {
        expect(err).to.be.instanceOf(AppError);
        expect(err.statusCode).to.equal(401);
      }
    });

    it('should throw AppError(401) when user is inactive', async () => {
      sandbox.stub(prisma, 'user').value({
        findUnique: sinon.stub().resolves({ id: 'u1', isActive: false })
      });

      try {
        await authService.getMe('u1');
        expect.fail('should have thrown');
      } catch (err: any) {
        expect(err).to.be.instanceOf(AppError);
        expect(err.statusCode).to.equal(401);
      }
    });

    it('should return user when active', async () => {
      const mockUser = { id: 'u1', name: 'Test', isActive: true };
      sandbox.stub(prisma, 'user').value({
        findUnique: sinon.stub().resolves(mockUser)
      });

      const result = await authService.getMe('u1');
      expect(result).to.deep.equal(mockUser);
    });
  });
});
