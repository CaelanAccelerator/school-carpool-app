import sinon from 'sinon';
/**
 * Creates a mock Express Response object with common methods stubbed
 */
export declare const mockRes: () => {
    status: sinon.SinonStub<any[], any>;
    json: sinon.SinonStub<any[], any>;
    send: sinon.SinonStub<any[], any>;
};
/**
 * Creates a mock Express Request object with common properties
 */
export declare const mockReq: (overrides?: {}) => {
    params: {};
    query: {};
    body: {};
};
//# sourceMappingURL=express-mock.d.ts.map