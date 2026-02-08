"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const chai_1 = require("chai");
const sinon_1 = __importDefault(require("sinon"));
describe('Test Infrastructure', () => {
    it('should work with basic chai assertions', () => {
        (0, chai_1.expect)(true).to.be.true;
        (0, chai_1.expect)(1 + 1).to.equal(2);
    });
    it('should work with sinon stubs', () => {
        const stub = sinon_1.default.stub();
        stub.returns('test');
        (0, chai_1.expect)(stub()).to.equal('test');
        (0, chai_1.expect)(stub.called).to.be.true;
    });
});
//# sourceMappingURL=basic.test.js.map