import { Response } from 'express';
import sinon from 'sinon';
/**
 * Creates a mock Express Response object with common methods stubbed
 */
export declare const mockRes: () => Partial<Response> & {
    status: sinon.SinonStub;
    json: sinon.SinonStub;
    send: sinon.SinonStub;
};
/**
 * Creates a mock Express Request object with common properties
 */
export declare const mockReq: (overrides?: any) => any;
//# sourceMappingURL=express-mock.d.ts.map