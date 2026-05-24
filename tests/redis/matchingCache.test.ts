import { expect } from 'chai';
import sinon from 'sinon';
import { redis } from '../../lib/redis';
import { prisma } from '../../lib/prisma';
import { matchingService } from '../../services/matchingService';

const BASE_PARAMS = {
  userId: 'user1',
  dayOfWeek: 1,
  timeValue: '08:00',
  flexibilityMins: 30,
  timeField: 'toCampusMins' as const,
  targetRoleGroup: 'DRIVER' as const
};

// Requester without home coords → geo skipped, simpler result shape
const MOCK_USER = { campus: 'UBC Campus', homeArea: 'Vancouver', homeLat: null, homeLng: null };

describe('matchingService — Redis cache-aside', () => {
  let sandbox: sinon.SinonSandbox;

  beforeEach(() => {
    sandbox = sinon.createSandbox();
    // Stub prisma so no DB needed
    sandbox.stub(prisma, 'user').value({ findUnique: sinon.stub().resolves(MOCK_USER) });
    sandbox.stub(prisma, 'scheduleEntry').value({ findMany: sinon.stub().resolves([]) });
  });

  afterEach(() => {
    sandbox.restore();
  });

  it('cache miss: GET returns null → runs matching logic → SET is called', async () => {
    const getStub = sandbox.stub(redis, 'get').resolves(null);  // cache miss
    const setStub = sandbox.stub(redis, 'set').resolves('OK');

    const result = await matchingService.matchByTimeField(BASE_PARAMS);

    expect(getStub.calledOnce).to.be.true;
    expect(setStub.calledOnce).to.be.true;

    // SET is called with (key, json, 'EX', ttl)
    const args = setStub.firstCall.args as unknown as [string, string, string, number];
    const [key, value, ex, ttl] = args;
    expect(key).to.include('user1');           // key contains userId
    expect(key).to.include('toCampusMins');    // key contains timeField
    expect(ex).to.equal('EX');
    expect(ttl).to.equal(300);
    expect(JSON.parse(value)).to.deep.equal(result);
  });

  it('cache hit: GET returns JSON → returns parsed result without running matching', async () => {
    const cachedResult = { results: [{ id: 'driver1' }], geoNote: 'cached' };
    const getStub = sandbox.stub(redis, 'get').resolves(JSON.stringify(cachedResult));
    const setStub = sandbox.stub(redis, 'set').resolves('OK');

    const result = await matchingService.matchByTimeField(BASE_PARAMS);

    expect(getStub.calledOnce).to.be.true;
    expect(setStub.called).to.be.false;          // no write on hit
    expect(result).to.deep.equal(cachedResult);
  });

  it('cache key encodes all params so different queries never collide', async () => {
    const getStub = sandbox.stub(redis, 'get').resolves(null);
    sandbox.stub(redis, 'set').resolves('OK');

    // Two calls with different dayOfWeek
    await matchingService.matchByTimeField({ ...BASE_PARAMS, dayOfWeek: 1 });
    await matchingService.matchByTimeField({ ...BASE_PARAMS, dayOfWeek: 2 });

    const key1 = getStub.firstCall.args[0] as string;
    const key2 = getStub.secondCall.args[0] as string;
    expect(key1).to.not.equal(key2);
  });

  it('graceful degradation: Redis GET failure → computes fresh, still returns result', async () => {
    sandbox.stub(redis, 'get').rejects(new Error('ECONNREFUSED'));
    sandbox.stub(redis, 'set').rejects(new Error('ECONNREFUSED'));

    // Should not throw — result comes from the matching logic
    const result = await matchingService.matchByTimeField(BASE_PARAMS);
    expect(result).to.have.property('results').that.is.an('array');
  });
});
