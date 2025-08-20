/**
 * Test Database Setup
 * Dessai Backend - Testing Infrastructure
 * @testing persona validation
 */

// Mock Prisma client for testing
export const mockPrismaClient = {
  $connect: jest.fn().mockResolvedValue(undefined),
  $disconnect: jest.fn().mockResolvedValue(undefined),
  user: {
    create: jest.fn(),
    findUnique: jest.fn(),
    findMany: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
    upsert: jest.fn(),
  },
  role: {
    create: jest.fn(),
    findUnique: jest.fn(),
    findMany: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
    upsert: jest.fn(),
  },
  session: {
    create: jest.fn(),
    findUnique: jest.fn(),
    findMany: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
    deleteMany: jest.fn(),
  },
  organization: {
    create: jest.fn(),
    findUnique: jest.fn(),
    findMany: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
    upsert: jest.fn(),
  },
  $transaction: jest.fn(),
};

// Test database instance
let testPrisma: any = mockPrismaClient;

/**
 * Setup test database
 * Creates isolated test database for integration tests
 */
export async function setupTestDatabase(): Promise<any> {
  try {
    // Reset all mocks before each test suite
    Object.values(mockPrismaClient).forEach(mockMethod => {
      if (typeof mockMethod === 'object' && mockMethod !== null) {
        Object.values(mockMethod).forEach(method => {
          if (jest.isMockFunction(method)) {
            method.mockClear();
          }
        });
      } else if (jest.isMockFunction(mockMethod)) {
        mockMethod.mockClear();
      }
    });

    // Seed test data (mock implementations)
    await seedTestData();

    console.log('Test database setup completed (mocked)');
    return testPrisma;

  } catch (error) {
    console.error('Test database setup failed:', error);
    throw error;
  }
}

/**
 * Seed test database with initial data
 */
async function seedTestData(): Promise<void> {
  try {
    // Mock default responses for test data
    
    // Test roles
    mockPrismaClient.role.upsert.mockImplementation(({ where }: any) => {
      if (where.name === 'user') {
        return Promise.resolve({
          id: 'test-role-id',
          name: 'user',
          description: 'Standard user role',
          permissions: ['read:profile', 'update:profile']
        });
      } else if (where.name === 'admin') {
        return Promise.resolve({
          id: 'admin-role-id', 
          name: 'admin',
          description: 'Administrator role',
          permissions: ['read:*', 'write:*', 'delete:*']
        });
      }
      return Promise.resolve(null);
    });

    // Test organization
    mockPrismaClient.organization?.upsert?.mockImplementation(({ where }: any) => {
      if (where.slug === 'test-org') {
        return Promise.resolve({
          id: 'test-org-id',
          name: 'Test Organization',
          slug: 'test-org',
          domain: 'testorg.com',
          settings: {
            allowSelfRegistration: true,
            requireEmailVerification: false
          }
        });
      }
      return Promise.resolve(null);
    });

    // Default user queries
    mockPrismaClient.user.findUnique.mockResolvedValue(null);
    mockPrismaClient.user.create.mockImplementation((data: any) => 
      Promise.resolve({ 
        id: 'test-user-id',
        ...data.data 
      })
    );

    console.log('Test data seeding completed (mocked)');
  } catch (error) {
    console.error('Test data seeding failed:', error);
    throw error;
  }
}

/**
 * Close test database connections
 */
export async function closeTestDatabase(): Promise<void> {
  try {
    if (testPrisma && testPrisma.$disconnect) {
      await testPrisma.$disconnect();
    }
    testPrisma = null;
    console.log('Test database connections closed');
  } catch (error) {
    console.error('Error closing test database:', error);
  }
}

/**
 * Get test Prisma client instance
 */
export function getTestPrisma(): any {
  return testPrisma || mockPrismaClient;
}

/**
 * Reset all test database mocks
 */
export function resetTestDatabase(): void {
  Object.values(mockPrismaClient).forEach(mockMethod => {
    if (typeof mockMethod === 'object' && mockMethod !== null) {
      Object.values(mockMethod).forEach(method => {
        if (jest.isMockFunction(method)) {
          method.mockReset();
        }
      });
    } else if (jest.isMockFunction(mockMethod)) {
      mockMethod.mockReset();
    }
  });
}

// Export the mock for external use
export { testPrisma };
export default mockPrismaClient;
