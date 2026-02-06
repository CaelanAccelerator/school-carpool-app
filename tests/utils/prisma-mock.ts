import sinon from 'sinon';

/**
 * Creates a mock Prisma client with stubbed methods
 * Returns stubbed user, scheduleEntry, and $transaction operations
 */
export const makePrismaMock = () => {
  const userMock = {
    create: sinon.stub(),
    findUnique: sinon.stub(),
    findMany: sinon.stub(),
    update: sinon.stub(),
    delete: sinon.stub(),
    count: sinon.stub()
  };

  const scheduleEntryMock = {
    create: sinon.stub(),
    findUnique: sinon.stub(),
    findFirst: sinon.stub(),
    findMany: sinon.stub(),
    update: sinon.stub(),
    delete: sinon.stub(),
    upsert: sinon.stub()
  };

  const transactionMock = sinon.stub();

  const prismaMock = {
    user: userMock,
    scheduleEntry: scheduleEntryMock,
    $transaction: transactionMock
  };

  return {
    prismaMock,
    userMock,
    scheduleEntryMock,
    transactionMock
  };
};