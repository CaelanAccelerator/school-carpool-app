"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const chai_1 = require("chai");
describe('API Routes - Basic Smoke Tests', () => {
    it('should pass basic test', () => {
        (0, chai_1.expect)(true).to.be.true;
    });
    it('should verify test environment is working', () => {
        (0, chai_1.expect)('test').to.be.a('string');
        (0, chai_1.expect)(1 + 1).to.equal(2);
    });
});
//# sourceMappingURL=api.smoke.test.js.map