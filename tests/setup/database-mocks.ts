// @ts-nocheck - Jest mock typing compatibility
import { beforeEach, jest } from '@jest/globals';

// Mock Prisma Client with proper Jest mock methods
const createMockMethod = () => {
  const fn = jest.fn();
  (fn as any).mockResolvedValue = jest.fn().mockReturnValue(fn);
  (fn as any).mockResolvedValueOnce = jest.fn().mockReturnValue(fn);
  (fn as any).mockRejectedValue = jest.fn().mockReturnValue(fn);
  (fn as any).mockReturnValue = jest.fn().mockReturnValue(fn);
  return fn;
};

const mockPrismaClient: any = {
  $connect: createMockMethod(),
  $disconnect: createMockMethod(),
  $queryRaw: createMockMethod(),
  $executeRawUnsafe: createMockMethod(),
  $transaction: jest.fn().mockImplementation((fn: any) => fn(mockPrismaClient)),
  // User model with proper Jest mock methods
  user: {
    create: createMockMethod(),
    findUnique: createMockMethod(),
    findMany: createMockMethod(),
    update: createMockMethod(),
    delete: createMockMethod(),
    upsert: createMockMethod(),
    count: createMockMethod(),
  },
  // Auth session model
  authSession: {
    create: createMockMethod(),
    findUnique: createMockMethod(),
    findMany: createMockMethod(),
    update: createMockMethod(),
    delete: createMockMethod(),
    deleteMany: createMockMethod(),
  },
  // MFA secret model
  mfaSecret: {
    create: createMockMethod(),
    findUnique: createMockMethod(),
    update: createMockMethod(),
    delete: createMockMethod(),
  },
  // Password reset token model
  passwordResetToken: {
    create: createMockMethod(),
    findUnique: createMockMethod(),
    update: createMockMethod(),
    delete: createMockMethod(),
    deleteMany: createMockMethod(),
  },
};

// Mock Redis Client
const mockRedisClient: any = {
  connect: jest.fn().mockResolvedValue(undefined),
  disconnect: jest.fn().mockResolvedValue(undefined),
  ping: jest.fn().mockResolvedValue('PONG'),
  info: jest.fn().mockResolvedValue(`
redis_version:7.0.0
used_memory_human:1.5M
connected_clients:2
  `),
  set: jest.fn().mockResolvedValue('OK'),
  get: jest.fn().mockResolvedValue(null),
  del: jest.fn().mockResolvedValue(1),
  exists: jest.fn().mockResolvedValue(0),
  setex: jest.fn().mockResolvedValue('OK'),
  expire: jest.fn().mockResolvedValue(1),
  incr: jest.fn().mockResolvedValue(1),
  keys: jest.fn().mockResolvedValue([]),
  publish: jest.fn().mockResolvedValue(1),
  subscribe: jest.fn().mockResolvedValue(undefined),
  duplicate: jest.fn().mockReturnValue({
    subscribe: jest.fn().mockResolvedValue(undefined),
    on: jest.fn(),
  }),
  on: jest.fn(),
  status: 'ready',
};

// Mock database service
jest.mock('@/services/database.service', () => ({
  database: {
    connect: jest.fn().mockResolvedValue(undefined),
    disconnect: jest.fn().mockResolvedValue(undefined),
    healthCheck: jest.fn().mockResolvedValue({
      status: 'healthy',
      latency: 5,
      timestamp: new Date().toISOString(),
    }),
    isHealthy: jest.fn().mockReturnValue(true),
    getStats: jest.fn().mockResolvedValue({
      connectionCount: 2,
      activeTransactions: 0,
      version: 'PostgreSQL 15.0',
    }),
    executeRaw: jest.fn().mockResolvedValue([{ result: 'test' }]),
    transaction: jest.fn().mockImplementation((fn: any) => fn(mockPrismaClient)),
    batchExecute: jest.fn().mockResolvedValue([{ result1: 'test' }, { result2: 'test' }]),
    getClient: jest.fn().mockReturnValue(mockPrismaClient),
  },
}));

// Mock Redis service
const redisService = {
  connect: jest.fn(),
  disconnect: jest.fn(),
  healthCheck: jest.fn(),
  isHealthy: jest.fn(),
  getInfo: jest.fn(),
  set: jest.fn(),
  get: jest.fn(),
  delete: jest.fn(),
  exists: jest.fn(),
  expire: jest.fn(),
  setSession: jest.fn(),
  getSession: jest.fn(),
  deleteSession: jest.fn(),
  incrementRateLimit: jest.fn(),
  getRateLimit: jest.fn(),
  publish: jest.fn(),
  subscribe: jest.fn(),
  clearPattern: jest.fn(),
  getClient: jest.fn().mockReturnValue(mockRedisClient),
};

jest.mock('@/services/redis.service', () => ({
  redis: redisService,
}));

// Add Prisma mock
jest.mock('@/lib/database', () => ({
  prisma: mockPrismaClient,
}));

// Mock configuration
jest.mock('@/config', () => ({
  config: {
    database: {
      url: 'postgresql://test:test@localhost:5432/test',
      timeout: 10000,
    },
    redis: {
      url: 'redis://localhost:6379',
      timeout: 5000,
    },
    server: {
      isDevelopment: true,
      port: 3000,
      host: 'localhost',
    },
  },
}));

// Setup global test environment
beforeEach(() => {
  jest.clearAllMocks();
});

// Export mocks for use in tests
export { mockPrismaClient, mockRedisClient };
