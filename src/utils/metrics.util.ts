import { Request, Response, NextFunction } from 'express';
import promClient from 'prom-client';

// Dessai Platform Metrics - Comprehensive monitoring instrumentation
// Persona: Technical Strategy Advisor (@cto-advisor)

// Create a Registry to register metrics
const register = new promClient.Registry();

// Add default metrics (CPU, memory, etc.)
promClient.collectDefaultMetrics({
  register,
  prefix: 'dessai_',
  gcDurationBuckets: [0.001, 0.01, 0.1, 1, 2, 5],
});

// Custom Business Metrics
export const metrics = {
  // HTTP Request Metrics
  httpRequestDuration: new promClient.Histogram({
    name: 'dessai_http_request_duration_seconds',
    help: 'Duration of HTTP requests in seconds',
    labelNames: ['method', 'route', 'status_code', 'user_type'],
    registers: [register],
    buckets: [0.1, 0.3, 0.5, 0.7, 1, 3, 5, 7, 10],
  }),

  httpRequestsTotal: new promClient.Counter({
    name: 'dessai_http_requests_total',
    help: 'Total number of HTTP requests',
    labelNames: ['method', 'route', 'status_code', 'user_type'],
    registers: [register],
  }),

  // Authentication Metrics
  authAttempts: new promClient.Counter({
    name: 'dessai_auth_attempts_total',
    help: 'Total authentication attempts',
    labelNames: ['type', 'result', 'user_type'],
    registers: [register],
  }),

  authFailures: new promClient.Counter({
    name: 'dessai_auth_failures_total',
    help: 'Total authentication failures',
    labelNames: ['type', 'reason', 'user_type'],
    registers: [register],
  }),

  sessionDuration: new promClient.Histogram({
    name: 'dessai_session_duration_seconds',
    help: 'Duration of user sessions in seconds',
    labelNames: ['user_type', 'role'],
    registers: [register],
    buckets: [60, 300, 600, 1800, 3600, 7200, 14400],
  }),

  // Assessment Metrics
  assessmentCreated: new promClient.Counter({
    name: 'dessai_assessments_created_total',
    help: 'Total assessments created',
    labelNames: ['type', 'difficulty', 'creator_type'],
    registers: [register],
  }),

  assessmentCompleted: new promClient.Counter({
    name: 'dessai_assessments_completed_total',
    help: 'Total assessments completed',
    labelNames: ['type', 'result', 'user_type'],
    registers: [register],
  }),

  assessmentDuration: new promClient.Histogram({
    name: 'dessai_assessment_duration_seconds',
    help: 'Duration of assessments in seconds',
    labelNames: ['type', 'difficulty', 'result'],
    registers: [register],
    buckets: [300, 600, 1200, 1800, 2700, 3600, 5400, 7200],
  }),

  assessmentScore: new promClient.Histogram({
    name: 'dessai_assessment_score',
    help: 'Assessment scores distribution',
    labelNames: ['type', 'difficulty', 'user_type'],
    registers: [register],
    buckets: [0, 10, 20, 30, 40, 50, 60, 70, 80, 90, 100],
  }),

  // Code Execution Metrics
  codeExecutions: new promClient.Counter({
    name: 'dessai_code_executions_total',
    help: 'Total code executions',
    labelNames: ['language', 'result', 'execution_type'],
    registers: [register],
  }),

  codeExecutionDuration: new promClient.Histogram({
    name: 'dessai_code_execution_duration_seconds',
    help: 'Duration of code executions in seconds',
    labelNames: ['language', 'result'],
    registers: [register],
    buckets: [0.1, 0.5, 1, 2, 5, 10, 30, 60],
  }),

  codeExecutionMemory: new promClient.Histogram({
    name: 'dessai_code_execution_memory_bytes',
    help: 'Memory usage during code execution',
    labelNames: ['language', 'result'],
    registers: [register],
    buckets: [1024, 10240, 102400, 1048576, 10485760, 104857600, 1073741824],
  }),

  // Proctoring Metrics
  proctoringViolations: new promClient.Counter({
    name: 'dessai_proctoring_violations_total',
    help: 'Total proctoring violations detected',
    labelNames: ['type', 'severity', 'assessment_type'],
    registers: [register],
  }),

  proctoringSessionDuration: new promClient.Histogram({
    name: 'dessai_proctoring_session_duration_seconds',
    help: 'Duration of proctoring sessions in seconds',
    labelNames: ['assessment_type', 'violations_detected'],
    registers: [register],
    buckets: [300, 600, 1200, 1800, 2700, 3600, 5400, 7200],
  }),

  // Database Metrics
  dbOperations: new promClient.Counter({
    name: 'dessai_db_operations_total',
    help: 'Total database operations',
    labelNames: ['operation', 'table', 'result'],
    registers: [register],
  }),

  dbOperationDuration: new promClient.Histogram({
    name: 'dessai_db_operation_duration_seconds',
    help: 'Duration of database operations in seconds',
    labelNames: ['operation', 'table'],
    registers: [register],
    buckets: [0.001, 0.005, 0.01, 0.05, 0.1, 0.5, 1, 5],
  }),

  dbConnectionPool: new promClient.Gauge({
    name: 'dessai_db_connection_pool_active',
    help: 'Active database connections in pool',
    registers: [register],
  }),

  // Cache Metrics
  cacheOperations: new promClient.Counter({
    name: 'dessai_cache_operations_total',
    help: 'Total cache operations',
    labelNames: ['operation', 'result'],
    registers: [register],
  }),

  cacheHitRate: new promClient.Gauge({
    name: 'dessai_cache_hit_rate',
    help: 'Cache hit rate percentage',
    registers: [register],
  }),

  // Business Metrics
  activeUsers: new promClient.Gauge({
    name: 'dessai_active_users',
    help: 'Number of active users',
    labelNames: ['time_window', 'user_type'],
    registers: [register],
  }),

  concurrentSessions: new promClient.Gauge({
    name: 'dessai_concurrent_sessions',
    help: 'Number of concurrent user sessions',
    registers: [register],
  }),

  // Integration Metrics
  integrationRequests: new promClient.Counter({
    name: 'dessai_integration_requests_total',
    help: 'Total integration API requests',
    labelNames: ['integration', 'method', 'status'],
    registers: [register],
  }),

  integrationLatency: new promClient.Histogram({
    name: 'dessai_integration_latency_seconds',
    help: 'Latency of integration requests',
    labelNames: ['integration', 'method'],
    registers: [register],
    buckets: [0.1, 0.5, 1, 2, 5, 10, 30],
  }),

  // Error Metrics
  errorRate: new promClient.Counter({
    name: 'dessai_errors_total',
    help: 'Total application errors',
    labelNames: ['type', 'severity', 'component'],
    registers: [register],
  }),

  // Performance Metrics
  memoryUsage: new promClient.Gauge({
    name: 'dessai_memory_usage_bytes',
    help: 'Application memory usage in bytes',
    labelNames: ['type'],
    registers: [register],
  }),

  cpuUsage: new promClient.Gauge({
    name: 'dessai_cpu_usage_percent',
    help: 'Application CPU usage percentage',
    registers: [register],
  }),
};

// Middleware to automatically track HTTP metrics
export const metricsMiddleware = (req: Request, res: Response, next: NextFunction) => {
  const start = Date.now();
  
  // Track request start
  const route = req.route?.path || req.path;
  const userType = (req as any).user?.role || 'anonymous';

  res.on('finish', () => {
    const duration = (Date.now() - start) / 1000;
    const statusCode = res.statusCode.toString();
    
    // Record metrics
    metrics.httpRequestDuration
      .labels(req.method, route, statusCode, userType)
      .observe(duration);
    
    metrics.httpRequestsTotal
      .labels(req.method, route, statusCode, userType)
      .inc();
  });

  next();
};

// Custom metric tracking functions
export const trackAuthAttempt = (type: string, result: string, userType: string = 'unknown') => {
  metrics.authAttempts.labels(type, result, userType).inc();
  
  if (result === 'failure') {
    metrics.authFailures.labels(type, 'invalid_credentials', userType).inc();
  }
};

export const trackSessionDuration = (durationSeconds: number, userType: string, role: string) => {
  metrics.sessionDuration.labels(userType, role).observe(durationSeconds);
};

export const trackAssessmentCreated = (type: string, difficulty: string, creatorType: string) => {
  metrics.assessmentCreated.labels(type, difficulty, creatorType).inc();
};

export const trackAssessmentCompleted = (
  type: string,
  result: string,
  userType: string,
  durationSeconds: number,
  score: number,
  difficulty: string
) => {
  metrics.assessmentCompleted.labels(type, result, userType).inc();
  metrics.assessmentDuration.labels(type, difficulty, result).observe(durationSeconds);
  metrics.assessmentScore.labels(type, difficulty, userType).observe(score);
};

export const trackCodeExecution = (
  language: string,
  result: string,
  durationSeconds: number,
  memoryBytes: number,
  executionType: string = 'assessment'
) => {
  metrics.codeExecutions.labels(language, result, executionType).inc();
  metrics.codeExecutionDuration.labels(language, result).observe(durationSeconds);
  metrics.codeExecutionMemory.labels(language, result).observe(memoryBytes);
};

export const trackProctoringViolation = (
  type: string,
  severity: string,
  assessmentType: string
) => {
  metrics.proctoringViolations.labels(type, severity, assessmentType).inc();
};

export const trackDbOperation = (
  operation: string,
  table: string,
  result: string,
  durationSeconds: number
) => {
  metrics.dbOperations.labels(operation, table, result).inc();
  metrics.dbOperationDuration.labels(operation, table).observe(durationSeconds);
};

export const updateDbConnectionPool = (activeConnections: number) => {
  metrics.dbConnectionPool.set(activeConnections);
};

export const trackCacheOperation = (operation: string, result: string) => {
  metrics.cacheOperations.labels(operation, result).inc();
};

export const updateCacheHitRate = (hitRate: number) => {
  metrics.cacheHitRate.set(hitRate);
};

export const updateActiveUsers = (count: number, timeWindow: string, userType: string) => {
  metrics.activeUsers.labels(timeWindow, userType).set(count);
};

export const updateConcurrentSessions = (count: number) => {
  metrics.concurrentSessions.set(count);
};

export const trackIntegrationRequest = (
  integration: string,
  method: string,
  status: string,
  latencySeconds: number
) => {
  metrics.integrationRequests.labels(integration, method, status).inc();
  metrics.integrationLatency.labels(integration, method).observe(latencySeconds);
};

export const trackError = (type: string, severity: string, component: string) => {
  metrics.errorRate.labels(type, severity, component).inc();
};

export const updateSystemMetrics = (memoryBytes: number, cpuPercent: number) => {
  metrics.memoryUsage.labels('heap').set(memoryBytes);
  metrics.cpuUsage.set(cpuPercent);
};

// Metrics endpoint handler
export const getMetrics = async (_req: Request, res: Response) => {
  try {
    res.set('Content-Type', register.contentType);
    const metricsData = await register.metrics();
    res.end(metricsData);
  } catch (error) {
    res.status(500).json({ error: 'Failed to generate metrics' });
  }
};

// Health check with metrics
export const getHealthMetrics = async (_req: Request, res: Response) => {
  try {
    const memUsage = process.memoryUsage();
    
    // Update system metrics
    updateSystemMetrics(memUsage.heapUsed, 0); // CPU calculation would need more complex implementation
    
    res.json({
      status: 'healthy',
      timestamp: new Date().toISOString(),
      memory: {
        heapUsed: memUsage.heapUsed,
        heapTotal: memUsage.heapTotal,
        rss: memUsage.rss,
      },
      uptime: process.uptime(),
      metrics_endpoint: '/metrics',
    });
  } catch (error) {
    res.status(500).json({ 
      status: 'unhealthy', 
      error: 'Failed to get health metrics' 
    });
  }
};

export { register };
export default metrics;
