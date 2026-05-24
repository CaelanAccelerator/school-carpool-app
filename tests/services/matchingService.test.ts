import { expect } from 'chai';
import sinon from 'sinon';
import { AppError } from '../../lib/AppError';
import { prisma } from '../../lib/prisma';
import { matchingService } from '../../services/matchingService';

describe('matchingService', () => {
  let sandbox: sinon.SinonSandbox;

  beforeEach(() => {
    sandbox = sinon.createSandbox();
  });

  afterEach(() => {
    sandbox.restore();
  });

  describe('matchByTimeField', () => {
    it('should throw AppError(404) when requester not found', async () => {
      sandbox.stub(prisma, 'user').value({
        findUnique: sinon.stub().resolves(null)
      });

      try {
        await matchingService.matchByTimeField({
          userId: 'nonexistent',
          dayOfWeek: 1,
          timeValue: '08:00',
          flexibilityMins: 15,
          timeField: 'toCampusMins',
          targetRoleGroup: 'DRIVER'
        });
        expect.fail('should have thrown');
      } catch (err: any) {
        expect(err).to.be.instanceOf(AppError);
        expect(err.statusCode).to.equal(404);
        expect(err.message).to.include('User not found');
      }
    });

    it('should skip geo filtering and include geoNote when requester has no home coords', async () => {
      sandbox.stub(prisma, 'user').value({
        findUnique: sinon.stub().resolves({
          campus: 'UBC Campus',
          homeArea: 'Vancouver',
          homeLat: null,
          homeLng: null
        })
      });
      sandbox.stub(prisma, 'scheduleEntry').value({
        findMany: sinon.stub().resolves([
          {
            id: 'e1', toCampusMins: 480, goHomeMins: 1020,
            user: { id: 'driver1', name: 'Driver 1', homeLat: 49.2, homeLng: -123.1 }
          }
        ])
      });

      const result = await matchingService.matchByTimeField({
        userId: 'user1',
        dayOfWeek: 1,
        timeValue: '08:00',
        flexibilityMins: 15,
        timeField: 'toCampusMins',
        targetRoleGroup: 'DRIVER'
      });

      expect(result.geoNote).to.be.a('string');
      expect(result.geoNote).to.include('missing');
      expect(result.results).to.have.length(1);
    });

    it('should sort results by timeDifference when geo is skipped', async () => {
      sandbox.stub(prisma, 'user').value({
        findUnique: sinon.stub().resolves({
          campus: 'UBC Campus',
          homeArea: 'Vancouver',
          homeLat: null,
          homeLng: null
        })
      });
      // toCampusMins: 08:00 = 480 min. entries at 470 (10 min diff) and 490 (10 min diff) and 460 (20 min diff)
      sandbox.stub(prisma, 'scheduleEntry').value({
        findMany: sinon.stub().resolves([
          { id: 'e1', toCampusMins: 460, goHomeMins: 1020, user: { id: 'd1' } },
          { id: 'e2', toCampusMins: 490, goHomeMins: 1020, user: { id: 'd2' } },
          { id: 'e3', toCampusMins: 470, goHomeMins: 1020, user: { id: 'd3' } }
        ])
      });

      const result = await matchingService.matchByTimeField({
        userId: 'user1', dayOfWeek: 1, timeValue: '08:00', flexibilityMins: 30,
        timeField: 'toCampusMins', targetRoleGroup: 'DRIVER'
      });

      const diffs = result.results.map((r: any) => r.matchingScore.timeDifference);
      for (let i = 1; i < diffs.length; i++) {
        expect(diffs[i]).to.be.gte(diffs[i - 1]);
      }
    });
  });

  describe('getDriverAvailability', () => {
    it('should throw AppError(404) when driver not found or not a driver role', async () => {
      sandbox.stub(prisma, 'user').value({
        findUnique: sinon.stub().resolves(null)
      });

      try {
        await matchingService.getDriverAvailability('nonexistent', 1);
        expect.fail('should have thrown');
      } catch (err: any) {
        expect(err).to.be.instanceOf(AppError);
        expect(err.statusCode).to.equal(404);
        expect(err.message).to.include('Driver not found');
      }
    });

    it('should throw AppError(404) when driver has no schedule for that day', async () => {
      sandbox.stub(prisma, 'user').value({
        findUnique: sinon.stub().resolves({ id: 'driver1', name: 'Driver', role: 'DRIVER' })
      });
      sandbox.stub(prisma, 'scheduleEntry').value({
        findFirst: sinon.stub().resolves(null)
      });

      try {
        await matchingService.getDriverAvailability('driver1', 3);
        expect.fail('should have thrown');
      } catch (err: any) {
        expect(err).to.be.instanceOf(AppError);
        expect(err.statusCode).to.equal(404);
        expect(err.message).to.include('not available');
      }
    });

    it('should return driver and formatted schedule on success', async () => {
      const mockDriver = { id: 'driver1', name: 'Driver', role: 'DRIVER', campus: 'UBC' };
      const mockSchedule = { id: 'sched1', dayOfWeek: 1, toCampusMins: 480, goHomeMins: 1020 };
      sandbox.stub(prisma, 'user').value({
        findUnique: sinon.stub().resolves(mockDriver)
      });
      sandbox.stub(prisma, 'scheduleEntry').value({
        findFirst: sinon.stub().resolves(mockSchedule)
      });

      const result = await matchingService.getDriverAvailability('driver1', 1);

      expect(result.driver).to.deep.equal(mockDriver);
      expect(result.schedule.toCampusTimeFormatted).to.equal('08:00');
      expect(result.schedule.goHomeTimeFormatted).to.equal('17:00');
    });
  });
});
