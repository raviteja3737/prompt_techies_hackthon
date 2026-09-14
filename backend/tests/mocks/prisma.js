/**
 * Offline Prisma Mock for Promptothon Backend
 * Mocks all Prisma Client models and methods without requiring a live database connection.
 */

function createModelMock() {
  const mock = {
    findUnique: jest.fn().mockResolvedValue(null),
    findUniqueOrThrow: jest.fn().mockResolvedValue(null),
    findFirst: jest.fn().mockResolvedValue(null),
    findFirstOrThrow: jest.fn().mockResolvedValue(null),
    findMany: jest.fn().mockResolvedValue([]),
    create: jest.fn().mockImplementation(async ({ data }) => ({ id: "mock-id-1", ...data, createdAt: new Date(), updatedAt: new Date() })),
    createMany: jest.fn().mockResolvedValue({ count: 1 }),
    update: jest.fn().mockImplementation(async ({ data }) => ({ id: "mock-id-1", ...data, updatedAt: new Date() })),
    updateMany: jest.fn().mockResolvedValue({ count: 1 }),
    upsert: jest.fn().mockImplementation(async ({ create: cData, update: uData }) => ({ id: "mock-id-1", ...(cData || uData), updatedAt: new Date() })),
    delete: jest.fn().mockResolvedValue({ id: "mock-id-1" }),
    deleteMany: jest.fn().mockResolvedValue({ count: 1 }),
    count: jest.fn().mockResolvedValue(0),
    aggregate: jest.fn().mockResolvedValue({ _avg: {}, _count: {}, _sum: {}, _min: {}, _max: {} }),
    groupBy: jest.fn().mockResolvedValue([]),
  };
  return mock;
}

const models = [
  "user",
  "team",
  "teamMember",
  "track",
  "submission",
  "juryAssignment",
  "evaluation",
  "systemSetting",
  "auditLog",
  "announcement",
  "notification",
  "connection",
  "magicLinkToken",
];

const mockPrisma = {};

for (const model of models) {
  mockPrisma[model] = createModelMock();
}

mockPrisma.$queryRaw = jest.fn().mockResolvedValue([{ 1: 1 }]);
mockPrisma.$queryRawUnsafe = jest.fn().mockResolvedValue([{ 1: 1 }]);
mockPrisma.$executeRaw = jest.fn().mockResolvedValue(1);
mockPrisma.$executeRawUnsafe = jest.fn().mockResolvedValue(1);
mockPrisma.$connect = jest.fn().mockResolvedValue(undefined);
mockPrisma.$disconnect = jest.fn().mockResolvedValue(undefined);
mockPrisma.$use = jest.fn();
mockPrisma.$on = jest.fn();

mockPrisma.$transaction = jest.fn(async (arg) => {
  if (typeof arg === "function") {
    return arg(mockPrisma);
  }
  if (Array.isArray(arg)) {
    return Promise.all(arg);
  }
  return arg;
});

mockPrisma.resetAll = function () {
  for (const model of models) {
    const modelMock = mockPrisma[model];
    for (const key of Object.keys(modelMock)) {
      if (typeof modelMock[key]?.mockReset === "function") {
        modelMock[key].mockReset();
      }
    }
    // Re-apply defaults
    modelMock.findUnique.mockResolvedValue(null);
    modelMock.findUniqueOrThrow.mockResolvedValue(null);
    modelMock.findFirst.mockResolvedValue(null);
    modelMock.findFirstOrThrow.mockResolvedValue(null);
    modelMock.findMany.mockResolvedValue([]);
    modelMock.create.mockImplementation(async ({ data }) => ({ id: "mock-id-1", ...data, createdAt: new Date(), updatedAt: new Date() }));
    modelMock.createMany.mockResolvedValue({ count: 1 });
    modelMock.update.mockImplementation(async ({ data }) => ({ id: "mock-id-1", ...data, updatedAt: new Date() }));
    modelMock.updateMany.mockResolvedValue({ count: 1 });
    modelMock.upsert.mockImplementation(async ({ create: cData, update: uData }) => ({ id: "mock-id-1", ...(cData || uData), updatedAt: new Date() }));
    modelMock.delete.mockResolvedValue({ id: "mock-id-1" });
    modelMock.deleteMany.mockResolvedValue({ count: 1 });
    modelMock.count.mockResolvedValue(0);
    modelMock.aggregate.mockResolvedValue({ _avg: {}, _count: {}, _sum: {}, _min: {}, _max: {} });
    modelMock.groupBy.mockResolvedValue([]);
  }

  mockPrisma.$queryRaw.mockReset();
  mockPrisma.$queryRaw.mockResolvedValue([{ 1: 1 }]);
  mockPrisma.$queryRawUnsafe.mockReset();
  mockPrisma.$queryRawUnsafe.mockResolvedValue([{ 1: 1 }]);
  mockPrisma.$executeRaw.mockReset();
  mockPrisma.$executeRaw.mockResolvedValue(1);
  mockPrisma.$executeRawUnsafe.mockReset();
  mockPrisma.$executeRawUnsafe.mockResolvedValue(1);
  mockPrisma.$connect.mockReset();
  mockPrisma.$connect.mockResolvedValue(undefined);
  mockPrisma.$disconnect.mockReset();
  mockPrisma.$disconnect.mockResolvedValue(undefined);
  mockPrisma.$transaction.mockReset();
  mockPrisma.$transaction.mockImplementation(async (arg) => {
    if (typeof arg === "function") return arg(mockPrisma);
    if (Array.isArray(arg)) return Promise.all(arg);
    return arg;
  });
};

module.exports = mockPrisma;
