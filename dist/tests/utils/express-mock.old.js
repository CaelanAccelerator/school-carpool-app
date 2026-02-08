"use strict";
const { Response } = require('express');
const sinon = require('sinon');
/**
 * Creates a mock Express Response object with common methods stubbed
 */
const mockRes = () => {
    status: sinon.SinonStub;
    json: sinon.SinonStub;
    send: sinon.SinonStub;
};
{
    const res = {
        status: sinon.stub(),
        json: sinon.stub(),
        send: sinon.stub()
    };
    // Chain status().json() calls
    res.status.returnsThis();
    res.json.returnsThis();
    return res;
}
;
/**
 * Creates a mock Express Request object with common properties
 */
const mockReq = (overrides = {}) => ({
    params: {},
    query: {},
    body: {},
    ...overrides
});
//# sourceMappingURL=express-mock.old.js.map