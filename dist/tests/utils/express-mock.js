"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.mockReq = exports.mockRes = void 0;
const sinon_1 = __importDefault(require("sinon"));
/**
 * Creates a mock Express Response object with common methods stubbed
 */
const mockRes = () => {
    const res = {
        status: sinon_1.default.stub(),
        json: sinon_1.default.stub(),
        send: sinon_1.default.stub()
    };
    // Chain status().json() calls
    res.status.returnsThis();
    res.json.returnsThis();
    return res;
};
exports.mockRes = mockRes;
/**
 * Creates a mock Express Request object with common properties
 */
const mockReq = (overrides = {}) => ({
    params: {},
    query: {},
    body: {},
    ...overrides
});
exports.mockReq = mockReq;
//# sourceMappingURL=express-mock.js.map