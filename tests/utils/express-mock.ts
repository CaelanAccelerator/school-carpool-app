import sinon from 'sinon';

/**
 * Creates a mock Express Response object with common methods stubbed
 */
export const mockRes = () => {
  const res = {
    status: sinon.stub(),
    json: sinon.stub(),
    send: sinon.stub()
  };

  // Chain status().json() calls
  res.status.returnsThis();
  res.json.returnsThis();
  
  return res;
};

/**
 * Creates a mock Express Request object with common properties
 */
export const mockReq = (overrides = {}) => ({
  params: {},
  query: {},
  body: {},
  ...overrides
});