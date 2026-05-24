import { expect } from 'chai';
import sinon from 'sinon';
import { redis } from '../../lib/redis';
import { matchingRateLimit } from '../../middleware/rateLimit';

const makeCtx = () => {
  const headers: Record<string, string | number> = {};
  const res: any = {
    status: sinon.stub().returnsThis(),
    json: sinon.stub().returnsThis(),
    setHeader: (k: string, v: string | number) => { headers[k] = v; }
  };
  const next = sinon.stub();
  return { res, next, headers };
};

describe('matchingRateLimit middleware', () => {
  let sandbox: sinon.SinonSandbox;

  beforeEach(() => {
    sandbox = sinon.createSandbox();
  });

  afterEach(() => {
    sandbox.restore();
  });

  it('should call next() and set rate-limit headers when under the limit', async () => {
    sandbox.stub(redis, 'incr').resolves(1);
    sandbox.stub(redis, 'expire').resolves(1);

    const req: any = { user: { id: 'user1', role: 'PASSENGER' }, params: {} };
    const { res, next, headers } = makeCtx();

    await matchingRateLimit(req, res, next);

    expect(next.calledOnce).to.be.true;
    expect(next.firstCall.args[0]).to.be.undefined;   // no error passed
    expect(headers['X-RateLimit-Limit']).to.equal(10);
    expect(headers['X-RateLimit-Remaining']).to.equal(9);
  });

  it('should return 429 when count exceeds the limit', async () => {
    sandbox.stub(redis, 'incr').resolves(11);   // already at 11
    sandbox.stub(redis, 'expire').resolves(1);

    const req: any = { user: { id: 'user1', role: 'PASSENGER' }, params: {} };
    const { res, next } = makeCtx();

    await matchingRateLimit(req, res, next);

    expect(next.calledOnce).to.be.true;
    const err = next.firstCall.args[0];
    expect(err).to.exist;
    expect(err.statusCode).to.equal(429);
  });

  it('should only call EXPIRE on the first request in the window (count === 1)', async () => {
    const incrStub = sandbox.stub(redis, 'incr');
    const expireStub = sandbox.stub(redis, 'expire').resolves(1);

    const req: any = { user: { id: 'user1', role: 'PASSENGER' }, params: {} };

    // First request in window
    incrStub.resolves(1);
    const { res: r1, next: n1 } = makeCtx();
    await matchingRateLimit(req, r1, n1);
    expect(expireStub.calledOnce).to.be.true;   // TTL set

    // Second request — EXPIRE should NOT be called again
    incrStub.resolves(2);
    const { res: r2, next: n2 } = makeCtx();
    await matchingRateLimit(req, r2, n2);
    expect(expireStub.calledOnce).to.be.true;   // still only called once
  });

  it('should call next() without error when Redis is unreachable (graceful degradation)', async () => {
    sandbox.stub(redis, 'incr').rejects(new Error('ECONNREFUSED'));

    const req: any = { user: { id: 'user1', role: 'PASSENGER' }, params: {} };
    const { res, next } = makeCtx();

    await matchingRateLimit(req, res, next);

    // Should NOT block the request — core feature takes priority over rate limiting
    expect(next.calledOnce).to.be.true;
    expect(next.firstCall.args[0]).to.be.undefined;
  });
});
