import { expect } from 'chai';
import sinon from 'sinon';
import { AppError } from '../../lib/AppError';
import { scheduleService } from '../../services/scheduleService';
import {
  createScheduleEntry,
  createWeeklySchedule,
  deleteScheduleEntry,
  getScheduleEntryByDay,
  updateScheduleEntry
} from '../../controllers/scheduleController';

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

describe('scheduleController', () => {
  let sandbox: sinon.SinonSandbox;

  beforeEach(() => {
    sandbox = sinon.createSandbox();
  });

  afterEach(() => {
    sandbox.restore();
  });

  describe('createScheduleEntry', () => {
    it('should return 400 for validation errors', async () => {
      const req: any = {
        params: { userId: 'user-id' },
        body: { dayOfWeek: 8, toCampusMins: -1 }
      };
      const res = mockRes();
      await createScheduleEntry(req, res, makeNext(res));
      expect(res.status.calledWith(400)).to.be.true;
      expect(res.json.calledWithMatch({ success: false, message: 'Validation error' })).to.be.true;
    });

    it('should return 404 if user not found', async () => {
      const req: any = {
        params: { userId: 'nonexistent-user' },
        body: { dayOfWeek: 1, toCampusMins: 480, goHomeMins: 1020 }
      };
      const res = mockRes();
      sandbox.stub(scheduleService, 'createEntry').rejects(new AppError(404, 'User not found'));
      await createScheduleEntry(req, res, makeNext(res));
      expect(res.status.calledWith(404)).to.be.true;
      expect(res.json.calledWithMatch({ success: false, error: 'User not found' })).to.be.true;
    });

    it('should handle P2002 unique constraint error', async () => {
      const req: any = {
        params: { userId: 'user-id' },
        body: { dayOfWeek: 1, toCampusMins: 480, goHomeMins: 1020 }
      };
      const res = mockRes();
      sandbox.stub(scheduleService, 'createEntry').rejects(
        new AppError(409, 'Schedule entry for this day already exists')
      );
      await createScheduleEntry(req, res, makeNext(res));
      expect(res.status.calledWith(409)).to.be.true;
      expect(res.json.calledWithMatch({ success: false, error: 'Schedule entry for this day already exists' })).to.be.true;
    });

    it('should create schedule entry successfully', async () => {
      const req: any = {
        params: { userId: 'user-id' },
        body: { dayOfWeek: 1, toCampusMins: 480, goHomeMins: 1020 }
      };
      const res = mockRes();
      const mockEntry = { id: 'schedule-id', userId: 'user-id', dayOfWeek: 1, toCampusMins: 480, goHomeMins: 1020 };
      sandbox.stub(scheduleService, 'createEntry').resolves(mockEntry as any);
      await createScheduleEntry(req, res, makeNext(res));
      expect(res.status.calledWith(201)).to.be.true;
      expect(res.json.calledWithMatch({ success: true, message: 'Schedule entry created successfully', data: mockEntry })).to.be.true;
    });
  });

  describe('getScheduleEntryByDay', () => {
    it('should return 404 if entry not found', async () => {
      const req: any = { params: { userId: 'user-id', dayOfWeek: '1' } };
      const res = mockRes();
      sandbox.stub(scheduleService, 'getEntryByDay').rejects(
        new AppError(404, 'Schedule entry not found for this day')
      );
      await getScheduleEntryByDay(req, res, makeNext(res));
      expect(res.status.calledWith(404)).to.be.true;
      expect(res.json.calledWithMatch({ success: false, error: 'Schedule entry not found for this day' })).to.be.true;
    });

    it('should return schedule entry by day', async () => {
      const req: any = { params: { userId: 'user-id', dayOfWeek: '1' } };
      const res = mockRes();
      const mockEntry = { id: 'entry-id', userId: 'user-id', dayOfWeek: 1, toCampusMins: 480 };
      sandbox.stub(scheduleService, 'getEntryByDay').resolves(mockEntry as any);
      await getScheduleEntryByDay(req, res, makeNext(res));
      expect(res.json.calledWithMatch({ success: true, data: mockEntry })).to.be.true;
    });
  });

  describe('updateScheduleEntry', () => {
    it('should return 404 if entry not found', async () => {
      const req: any = { params: { entryId: 'nonexistent-entry' }, body: { toCampusMins: 500 } };
      const res = mockRes();
      sandbox.stub(scheduleService, 'updateEntry').rejects(new AppError(404, 'Schedule entry not found'));
      await updateScheduleEntry(req, res, makeNext(res));
      expect(res.status.calledWith(404)).to.be.true;
      expect(res.json.calledWithMatch({ success: false, error: 'Schedule entry not found' })).to.be.true;
    });

    it('should update schedule entry successfully', async () => {
      const req: any = { params: { entryId: 'entry-id' }, body: { toCampusMins: 500 } };
      const res = mockRes();
      const mockEntry = { id: 'entry-id', toCampusMins: 500 };
      sandbox.stub(scheduleService, 'updateEntry').resolves(mockEntry as any);
      await updateScheduleEntry(req, res, makeNext(res));
      expect(res.json.calledWithMatch({ success: true, message: 'Schedule entry updated successfully', data: mockEntry })).to.be.true;
    });
  });

  describe('deleteScheduleEntry', () => {
    it('should return 404 if entry not found', async () => {
      const req: any = { params: { entryId: 'nonexistent-entry' } };
      const res = mockRes();
      sandbox.stub(scheduleService, 'deleteEntry').rejects(new AppError(404, 'Schedule entry not found'));
      await deleteScheduleEntry(req, res, makeNext(res));
      expect(res.status.calledWith(404)).to.be.true;
      expect(res.json.calledWithMatch({ success: false, error: 'Schedule entry not found' })).to.be.true;
    });

    it('should delete schedule entry successfully', async () => {
      const req: any = { params: { entryId: 'entry-id' } };
      const res = mockRes();
      sandbox.stub(scheduleService, 'deleteEntry').resolves();
      await deleteScheduleEntry(req, res, makeNext(res));
      expect(res.json.calledWithMatch({ success: true, message: 'Schedule entry deleted successfully' })).to.be.true;
    });
  });

  describe('createWeeklySchedule', () => {
    it('should return 404 if user not found', async () => {
      const req: any = {
        params: { userId: 'nonexistent-user' },
        body: [{ dayOfWeek: 1, toCampusMins: 480, goHomeMins: 1020 }]
      };
      const res = mockRes();
      sandbox.stub(scheduleService, 'upsertWeeklySchedule').rejects(new AppError(404, 'User not found'));
      await createWeeklySchedule(req, res, makeNext(res));
      expect(res.status.calledWith(404)).to.be.true;
      expect(res.json.calledWithMatch({ success: false, error: 'User not found' })).to.be.true;
    });

    it('should create weekly schedule successfully', async () => {
      const req: any = {
        params: { userId: 'user-id' },
        body: [
          { dayOfWeek: 1, toCampusMins: 480, goHomeMins: 1020 },
          { dayOfWeek: 2, toCampusMins: 480, goHomeMins: 1020 }
        ]
      };
      const res = mockRes();
      const mockResult = [{ id: 'entry1' }, { id: 'entry2' }];
      sandbox.stub(scheduleService, 'upsertWeeklySchedule').resolves(mockResult as any);
      await createWeeklySchedule(req, res, makeNext(res));
      expect(res.json.calledWithMatch({
        success: true,
        message: 'Weekly schedule created/updated successfully'
      })).to.be.true;
    });
  });
});
