import { expect } from 'chai';
import sinon from 'sinon';
import { AppError } from '../../lib/AppError';
import { prisma } from '../../lib/prisma';
import { scheduleService } from '../../services/scheduleService';

describe('scheduleService', () => {
  let sandbox: sinon.SinonSandbox;

  beforeEach(() => {
    sandbox = sinon.createSandbox();
  });

  afterEach(() => {
    sandbox.restore();
  });

  describe('createEntry', () => {
    it('should throw AppError(404) when user not found', async () => {
      sandbox.stub(prisma, 'user').value({
        findUnique: sinon.stub().resolves(null)
      });

      try {
        await scheduleService.createEntry('nonexistent', { dayOfWeek: 1, toCampusMins: 480, goHomeMins: 1020 });
        expect.fail('should have thrown');
      } catch (err: any) {
        expect(err).to.be.instanceOf(AppError);
        expect(err.statusCode).to.equal(404);
        expect(err.message).to.include('User not found');
      }
    });

    it('should create entry when user exists', async () => {
      const mockEntry = { id: 'entry-id', userId: 'user-id', dayOfWeek: 1, toCampusMins: 480, goHomeMins: 1020 };
      sandbox.stub(prisma, 'user').value({
        findUnique: sinon.stub().resolves({ id: 'user-id' })
      });
      sandbox.stub(prisma, 'scheduleEntry').value({
        create: sinon.stub().resolves(mockEntry)
      });

      const result = await scheduleService.createEntry('user-id', { dayOfWeek: 1, toCampusMins: 480, goHomeMins: 1020 });
      expect(result).to.deep.equal(mockEntry);
    });
  });

  describe('getEntryByDay', () => {
    it('should throw AppError(404) when entry not found', async () => {
      sandbox.stub(prisma, 'scheduleEntry').value({
        findUnique: sinon.stub().resolves(null)
      });

      try {
        await scheduleService.getEntryByDay('user-id', 3);
        expect.fail('should have thrown');
      } catch (err: any) {
        expect(err).to.be.instanceOf(AppError);
        expect(err.statusCode).to.equal(404);
        expect(err.message).to.include('not found for this day');
      }
    });

    it('should return entry when found', async () => {
      const mockEntry = { id: 'entry-id', userId: 'user-id', dayOfWeek: 3 };
      sandbox.stub(prisma, 'scheduleEntry').value({
        findUnique: sinon.stub().resolves(mockEntry)
      });

      const result = await scheduleService.getEntryByDay('user-id', 3);
      expect(result).to.deep.equal(mockEntry);
    });
  });

  describe('updateEntry', () => {
    it('should throw AppError(404) when entry not found', async () => {
      sandbox.stub(prisma, 'scheduleEntry').value({
        findUnique: sinon.stub().resolves(null)
      });

      try {
        await scheduleService.updateEntry('nonexistent', { toCampusMins: 500 });
        expect.fail('should have thrown');
      } catch (err: any) {
        expect(err).to.be.instanceOf(AppError);
        expect(err.statusCode).to.equal(404);
      }
    });

    it('should update and return entry when found', async () => {
      const mockEntry = { id: 'entry-id', toCampusMins: 500 };
      const scheduleEntryStub = {
        findUnique: sinon.stub().resolves({ id: 'entry-id' }),
        update: sinon.stub().resolves(mockEntry)
      };
      sandbox.stub(prisma, 'scheduleEntry').value(scheduleEntryStub);

      const result = await scheduleService.updateEntry('entry-id', { toCampusMins: 500 });
      expect(result).to.deep.equal(mockEntry);
    });
  });

  describe('deleteEntry', () => {
    it('should throw AppError(404) when entry not found', async () => {
      sandbox.stub(prisma, 'scheduleEntry').value({
        findUnique: sinon.stub().resolves(null)
      });

      try {
        await scheduleService.deleteEntry('nonexistent');
        expect.fail('should have thrown');
      } catch (err: any) {
        expect(err).to.be.instanceOf(AppError);
        expect(err.statusCode).to.equal(404);
      }
    });

    it('should delete entry when found', async () => {
      const scheduleEntryStub = {
        findUnique: sinon.stub().resolves({ id: 'entry-id' }),
        delete: sinon.stub().resolves()
      };
      sandbox.stub(prisma, 'scheduleEntry').value(scheduleEntryStub);

      await scheduleService.deleteEntry('entry-id');
      expect(scheduleEntryStub.delete.calledOnce).to.be.true;
    });
  });

  describe('upsertWeeklySchedule', () => {
    it('should throw AppError(404) when user not found', async () => {
      sandbox.stub(prisma, 'user').value({
        findUnique: sinon.stub().resolves(null)
      });

      try {
        await scheduleService.upsertWeeklySchedule('nonexistent', [{ dayOfWeek: 1, toCampusMins: 480, goHomeMins: 1020 }]);
        expect.fail('should have thrown');
      } catch (err: any) {
        expect(err).to.be.instanceOf(AppError);
        expect(err.statusCode).to.equal(404);
      }
    });

  });
});
