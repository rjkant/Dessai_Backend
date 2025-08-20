import { PrismaClient } from '@prisma/client';
import { config } from '@/config';

/**
 * Database Service
 * Manages Prisma database connections and health checks
 */
class DatabaseService {
  private static instance: DatabaseService;
  private prisma: PrismaClient;
  private isConnected: boolean = false;

  constructor() {
    this.prisma = new PrismaClient({
      datasources: {
        db: {
          url: config.database.url,
        },
      },
      log: config.server.isDevelopment ? ['query', 'info', 'warn', 'error'] : ['warn', 'error'],
    });

    // Setup connection lifecycle handlers
    this.setupConnectionHandlers();
  }

  /**
   * Get singleton instance
   */
  public static getInstance(): DatabaseService {
    if (!DatabaseService.instance) {
      DatabaseService.instance = new DatabaseService();
    }
    return DatabaseService.instance;
  }

  /**
   * Get Prisma client instance
   */
  public getClient(): PrismaClient {
    return this.prisma;
  }

  /**
   * Connect to database
   */
  public async connect(): Promise<void> {
    try {
      await this.prisma.$connect();
      this.isConnected = true;
      console.log('✅ Database connection established');
    } catch (error) {
      console.error('❌ Database connection failed:', error);
      throw error;
    }
  }

  /**
   * Disconnect from database
   */
  public async disconnect(): Promise<void> {
    try {
      await this.prisma.$disconnect();
      this.isConnected = false;
      console.log('📴 Database connection closed');
    } catch (error) {
      console.error('❌ Database disconnection failed:', error);
      throw error;
    }
  }

  /**
   * Check database health
   */
  public async healthCheck(): Promise<{ status: string; latency: number; timestamp: string }> {
    try {
      const startTime = Date.now();
      await this.prisma.$queryRaw`SELECT 1`;
      const endTime = Date.now();
      const latency = endTime - startTime;

      return {
        status: 'healthy',
        latency,
        timestamp: new Date().toISOString(),
      };
    } catch (error) {
      console.error('Database health check failed:', error);
      return {
        status: 'unhealthy',
        latency: -1,
        timestamp: new Date().toISOString(),
      };
    }
  }

  /**
   * Check if database is connected
   */
  public isHealthy(): boolean {
    return this.isConnected;
  }

  /**
   * Get database statistics
   */
  public async getStats(): Promise<{
    connectionCount: number;
    activeTransactions: number;
    version: string;
  }> {
    try {
      // Get PostgreSQL version
      const versionResult = await this.prisma.$queryRaw<[{ version: string }]>`SELECT version()`;
      const version = versionResult[0]?.version || 'unknown';

      // Get connection count
      const connectionResult = await this.prisma.$queryRaw<[{ count: bigint }]>`
        SELECT count(*) FROM pg_stat_activity WHERE state = 'active'
      `;
      const connectionCount = Number(connectionResult[0]?.count || 0);

      // Get active transactions
      const transactionResult = await this.prisma.$queryRaw<[{ count: bigint }]>`
        SELECT count(*) FROM pg_stat_activity WHERE state IN ('active', 'idle in transaction')
      `;
      const activeTransactions = Number(transactionResult[0]?.count || 0);

      return {
        connectionCount,
        activeTransactions,
        version,
      };
    } catch (error) {
      console.error('Failed to get database stats:', error);
      return {
        connectionCount: -1,
        activeTransactions: -1,
        version: 'unknown',
      };
    }
  }

  /**
   * Execute raw SQL query (for migrations, seeds, etc.)
   */
  public async executeRaw(sql: string, params: any[] = []): Promise<any> {
    try {
      return await this.prisma.$executeRawUnsafe(sql, ...params);
    } catch (error) {
      console.error('Raw SQL execution failed:', error);
      throw error;
    }
  }

  /**
   * Setup connection event handlers
   */
  private setupConnectionHandlers(): void {
    // Handle query errors in development
    if (config.server.isDevelopment) {
      // Note: Query logging is handled by Prisma log configuration
      console.log('� Database query logging enabled for development');
    }
  }

  /**
   * Transaction wrapper
   */
  public async transaction<T>(operation: (tx: any) => Promise<T>): Promise<T> {
    return await this.prisma.$transaction(operation, {
      timeout: config.database.timeout,
    });
  }

  /**
   * Batch operations
   */
  public async batchExecute(operations: any[]): Promise<any[]> {
    return await this.prisma.$transaction(operations);
  }
}

// Export singleton instance
export const database = DatabaseService.getInstance();
export default DatabaseService;
