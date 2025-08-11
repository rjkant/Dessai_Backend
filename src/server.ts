import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import compression from 'compression';
import { config } from '@/config';
import { database } from '@/services/database.service';
import { redis } from '@/services/redis.service';
import healthRoutes from '@/routes/health.routes';

/**
 * Dessai Backend Server
 * AI-native technical hiring platform
 */
class DessaiServer {
  private app: express.Application;

  constructor() {
    this.app = express();
    this.setupMiddleware();
    this.setupRoutes();
    this.setupErrorHandling();
  }

  /**
   * Configure Express middleware
   */
  private setupMiddleware(): void {
    // Security middleware
    this.app.use(helmet());
    
    // CORS configuration
    this.app.use(cors({
      origin: config.security.corsOrigin,
      credentials: true,
    }));

    // Request parsing
    this.app.use(express.json({ limit: '10mb' }));
    this.app.use(express.urlencoded({ extended: true, limit: '10mb' }));

    // Compression
    this.app.use(compression());

    // Logging
    if (config.server.isDevelopment) {
      this.app.use(morgan('dev'));
    }

    // Trust proxy if configured
    if (config.security.trustProxy) {
      this.app.set('trust proxy', 1);
    }
  }

  /**
   * Setup application routes
   */
  private setupRoutes(): void {
    // Health check routes
    this.app.use('/health', healthRoutes);

    // API routes placeholder
    this.app.use('/api', (req, res) => {
      res.status(200).json({
        message: 'Dessai Backend API',
        version: '1.0.0',
        documentation: config.development.enableApiDocs ? `${req.protocol}://${req.get('host')}/api/docs` : undefined,
      });
    });

    // 404 handler
    this.app.use('*', (req, res) => {
      res.status(404).json({
        error: 'Route not found',
        path: req.originalUrl,
        method: req.method,
      });
    });
  }

  /**
   * Setup error handling middleware
   */
  private setupErrorHandling(): void {
    // Global error handler
    this.app.use((err: Error, _req: express.Request, res: express.Response, next: express.NextFunction) => {
      console.error('Global error handler:', err);

      const statusCode = (err as any).statusCode || 500;
      const message = config.server.isProduction ? 'Internal server error' : err.message;

      res.status(statusCode).json({
        error: message,
        ...(config.server.isDevelopment && { stack: err.stack }),
      });

      next();
    });
  }

  /**
   * Start the server
   */
  public async start(): Promise<void> {
    try {
      // Initialize database connection
      console.log('🔌 Connecting to database...');
      await database.connect();

      // Initialize Redis connection
      console.log('🔌 Connecting to Redis...');
      await redis.connect();

      const server = this.app.listen(config.server.port, config.server.host, () => {
        console.log(`🚀 Dessai Backend Server started successfully!`);
        console.log(`📡 Server running at http://${config.server.host}:${config.server.port}`);
        console.log(`🌍 Environment: ${config.server.env}`);
        console.log(`💾 Database: ${config.database.url.split('@')[1] || 'configured'}`);
        console.log(`🔄 Redis: ${config.redis.url}`);
        
        if (config.development.enableApiDocs) {
          console.log(`📚 API Documentation: http://${config.server.host}:${config.server.port}/api/docs`);
        }
        
        console.log('🎯 Health endpoints:');
        console.log(`   - Overall health: http://${config.server.host}:${config.server.port}/health`);
        console.log(`   - Database health: http://${config.server.host}:${config.server.port}/health/database`);
        console.log(`   - Redis health: http://${config.server.host}:${config.server.port}/health/redis`);
        console.log(`   - Readiness probe: http://${config.server.host}:${config.server.port}/health/ready`);
        console.log(`   - Liveness probe: http://${config.server.host}:${config.server.port}/health/live`);
      });

      // Graceful shutdown handlers
      const shutdown = async (signal: string) => {
        console.log(`${signal} received, shutting down gracefully...`);
        
        server.close(async () => {
          console.log('📴 HTTP server closed');
          
          try {
            // Close database connection
            await database.disconnect();
            console.log('💾 Database connection closed');
            
            // Close Redis connection
            await redis.disconnect();
            console.log('🔄 Redis connection closed');
            
            console.log('✅ Graceful shutdown completed');
            process.exit(0);
          } catch (error) {
            console.error('❌ Error during shutdown:', error);
            process.exit(1);
          }
        });

        // Force shutdown after 10 seconds
        setTimeout(() => {
          console.error('⚠️ Forcing shutdown after timeout');
          process.exit(1);
        }, 10000);
      };

      process.on('SIGTERM', () => shutdown('SIGTERM'));
      process.on('SIGINT', () => shutdown('SIGINT'));

    } catch (error) {
      console.error('❌ Failed to start server:', error);
      
      // Cleanup on startup failure
      try {
        await database.disconnect();
        await redis.disconnect();
      } catch (cleanupError) {
        console.error('❌ Error during cleanup:', cleanupError);
      }
      
      process.exit(1);
    }
  }

  /**
   * Get Express application instance
   */
  public getApp(): express.Application {
    return this.app;
  }

  /**
   * Build the Express application without starting it (for testing)
   */
  public static build(): express.Application {
    const server = new DessaiServer();
    return server.getApp();
  }
}

// Export the build function for testing
export const build = DessaiServer.build;

// Start server if this file is executed directly
if (require.main === module) {
  const server = new DessaiServer();
  server.start().catch(console.error);
}

export default DessaiServer;
