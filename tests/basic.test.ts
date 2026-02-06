import { expect } from 'chai';
import sinon from 'sinon';

describe('Test Infrastructure', () => {
  it('should work with basic chai assertions', () => {
    expect(true).to.be.true;
    expect(1 + 1).to.equal(2);
  });

  it('should work with sinon stubs', () => {
    const stub = sinon.stub();
    stub.returns('test');
    
    expect(stub()).to.equal('test');
    expect(stub.called).to.be.true;
  });
});