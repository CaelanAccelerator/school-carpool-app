"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.makePrismaMock = void 0;
const sinon_1 = __importDefault(require("sinon"));
/**
 * Creates a mock Prisma client with stubbed methods
 * Returns stubbed user, scheduleEntry, and $transaction operations
 */
const makePrismaMock = () => {
    const userMock = {
        create: sinon_1.default.stub(),
        findUnique: sinon_1.default.stub(),
        findMany: sinon_1.default.stub(),
        update: sinon_1.default.stub(),
        delete: sinon_1.default.stub(),
        count: sinon_1.default.stub()
    };
    const scheduleEntryMock = {
        create: sinon_1.default.stub(),
        findUnique: sinon_1.default.stub(),
        findMany: sinon_1.default.stub(),
        update: sinon_1.default.stub(),
        delete: sinon_1.default.stub(),
        upsert: sinon_1.default.stub()
    };
    const transactionMock = sinon_1.default.stub();
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
exports.makePrismaMock = makePrismaMock;
//# sourceMappingURL=prisma-mock.js.map