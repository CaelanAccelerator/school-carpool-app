import sinon from 'sinon';
/**
 * Creates a mock Prisma client with stubbed methods
 * Returns stubbed user, scheduleEntry, and $transaction operations
 */
export declare const makePrismaMock: () => {
    prismaMock: {
        user: {
            create: sinon.SinonStub<any[], any>;
            findUnique: sinon.SinonStub<any[], any>;
            findMany: sinon.SinonStub<any[], any>;
            update: sinon.SinonStub<any[], any>;
            delete: sinon.SinonStub<any[], any>;
            count: sinon.SinonStub<any[], any>;
        };
        scheduleEntry: {
            create: sinon.SinonStub<any[], any>;
            findUnique: sinon.SinonStub<any[], any>;
            findMany: sinon.SinonStub<any[], any>;
            update: sinon.SinonStub<any[], any>;
            delete: sinon.SinonStub<any[], any>;
            upsert: sinon.SinonStub<any[], any>;
        };
        $transaction: sinon.SinonStub<any[], any>;
    };
    userMock: {
        create: sinon.SinonStub<any[], any>;
        findUnique: sinon.SinonStub<any[], any>;
        findMany: sinon.SinonStub<any[], any>;
        update: sinon.SinonStub<any[], any>;
        delete: sinon.SinonStub<any[], any>;
        count: sinon.SinonStub<any[], any>;
    };
    scheduleEntryMock: {
        create: sinon.SinonStub<any[], any>;
        findUnique: sinon.SinonStub<any[], any>;
        findMany: sinon.SinonStub<any[], any>;
        update: sinon.SinonStub<any[], any>;
        delete: sinon.SinonStub<any[], any>;
        upsert: sinon.SinonStub<any[], any>;
    };
    transactionMock: sinon.SinonStub<any[], any>;
};
//# sourceMappingURL=prisma-mock.d.ts.map