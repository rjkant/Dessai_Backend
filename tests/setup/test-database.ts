/**
 * Test Database Setup
 * Dessai Backend - Testing Infrastructure
 * @testing persona validation
 */

import { PrismaClient } from '@prisma/client';
import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

// Test database instance
let testPrisma: PrismaClient | null = null;

/**
 * Setup test database
 * Creates isolated test database for integration tests
 */
export async function setupTestDatabase(): Promise<PrismaClient> {
  try {
    // Create test database URL
    const testDatabaseUrl = process.env['DATABASE_URL']?.replace(
      /\/([^\/]+)$/, 
      '/dessai_test'
    ) || 'postgresql://localhost:5432/dessai_test';

    // Initialize Prisma client for test database
    testPrisma = new PrismaClient({
      datasources: {
        db: {
          url: testDatabaseUrl
        }
      },
      log: process.env['NODE_ENV'] === 'test' ? [] : ['error', 'warn']
    });

    // Connect to database
    await testPrisma.$connect();

    // Run database migrations
    await runMigrations();

    // Seed test data
    await seedTestData();

    console.log('Test database setup completed');
    return testPrisma;

  } catch (error) {
    console.error('Test database setup failed:', error);
    throw error;
  }
}

/**
 * Run database migrations for test environment
 */
async function runMigrations(): Promise<void> {
  try {
    // Set test database URL for migrations
    const testDatabaseUrl = process.env['DATABASE_URL']?.replace(
      /\/([^\/]+)$/, 
      '/dessai_test'
    ) || 'postgresql://localhost:5432/dessai_test';

    // Run Prisma migrations
    await execAsync('npx prisma migrate deploy', {
      env: {
        ...process.env,
        DATABASE_URL: testDatabaseUrl
      }
    });

    console.log('Test database migrations completed');
  } catch (error) {
    console.warn('Migration warning (may be expected in test environment):', error);
    // Don't throw here as migrations might not exist yet
  }
}

/**
 * Seed test database with initial data
 */
async function seedTestData(): Promise<void> {
  if (!testPrisma) {
    throw new Error('Test database not initialized');
  }

  try {
    // Create test roles
    await testPrisma.role.upsert({
      where: { name: 'user' },
      update: {},
      create: {
        id: 'test-role-id',
        name: 'user',
        description: 'Standard user role',
        permissions: ['read:profile', 'update:profile']
      }
    });

    await testPrisma.role.upsert({
      where: { name: 'admin' },
      update: {},
      create: {
        id: 'admin-role-id',
        name: 'admin',
        description: 'Administrator role',
        permissions: ['read:*', 'write:*', 'delete:*']
      }
    });

    // Create test organization
    await testPrisma.organization.upsert({
      where: { slug: 'test-org' },
      update: {},
      create: {
        id: 'test-org-id',
        name: 'Test Organization',
        slug: 'test-org',
        domain: 'testorg.com',
        settings: {
          allowSelfRegistration: true,
          requireEmailVerification: false
        }
      }
    });

    console.log('Test data seeding completed');
  } catch (error) {
    console.error('Test data seeding failed:', error);
    throw error;
  }
}

/**
 * Clean test database
 * Removes all test data while preserving schema
 */
export async function cleanTestDatabase(): Promise<void> {
  if (!testPrisma) {
    return;
  }

  try {
    // Delete test data in correct order (due to foreign key constraints)
    await testPrisma.auditLog.deleteMany({});
    await testPrisma.user.deleteMany({});
    await testPrisma.organization.deleteMany({});
    await testPrisma.role.deleteMany({});

    console.log('Test database cleaned');
  } catch (error) {
    console.error('Test database cleanup failed:', error);
    throw error;
  }
}

/**
 * Reset test database
 * Cleans and re-seeds database
 */
export async function resetTestDatabase(): Promise<void> {
  await cleanTestDatabase();
  await seedTestData();
  console.log('Test database reset completed');
}

/**
 * Close test database connection
 */
export async function closeTestDatabase(): Promise<void> {
  if (testPrisma) {
    await testPrisma.$disconnect();
    testPrisma = null;
    console.log('Test database connection closed');
  }
}

/**
 * Get test database instance
 */
export function getTestDatabase(): PrismaClient | null {
  return testPrisma;
}

/**
 * Create test user helper
 */
export async function createTestUser(userData: {
  email: string;
  password: string;
  firstName: string;
  lastName: string;
  roleId?: string;
  organizationId?: string;
}) {
  if (!testPrisma) {
    throw new Error('Test database not initialized');
  }

  const { PasswordUtil } = await import('../../src/utils/password.util');
  const passwordHash = await PasswordUtil.hashPassword(userData.password);

  return await testPrisma.user.create({
    data: {
      email: userData.email,
      passwordHash,
      firstName: userData.firstName,
      lastName: userData.lastName,
      roleId: userData.roleId || 'test-role-id',
      organizationId: userData.organizationId || 'test-org-id',
      isActive: true,
      emailVerified: true,
      createdAt: new Date(),
      updatedAt: new Date()
    },
    include: {
      role: true,
      organization: true
    }
  });
}

/**
 * Create test session helper
 * Since there's no userSession model, we'll update the user's refreshTokens
 */
export async function createTestSession(userId: string, refreshToken: string) {
  if (!testPrisma) {
    throw new Error('Test database not initialized');
  }

  // Update user's refreshTokens array
  return await testPrisma.user.update({
    where: { id: userId },
    data: {
      refreshTokens: {
        push: refreshToken
      }
    }
  });
}

/**
 * Database transaction helper for tests
 */
export async function withTransaction<T>(
  callback: (prisma: Omit<PrismaClient, '$connect' | '$disconnect' | '$on' | '$transaction' | '$use' | '$extends'>) => Promise<T>
): Promise<T> {
  if (!testPrisma) {
    throw new Error('Test database not initialized');
  }

  return await testPrisma.$transaction(callback);
}
