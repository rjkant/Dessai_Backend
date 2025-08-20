# Integration Testing Standards

**Persona: Senior Software Engineer**  
**TASK-TEST-003: Phase 1 Standards Established**

## Dependency Injection Pattern for Integration Testing

### ✅ **Proven Approach**

This document establishes the standard pattern for integration testing in the Dessai Backend, based on the successful implementation of health endpoint tests with **25/25 tests passing**.

### 🎯 **Core Principles**

1. **Service Isolation**: Use dependency injection to isolate external services
2. **Mock-Based Testing**: Create comprehensive mocks for all service dependencies  
3. **Test Express Apps**: Build isolated Express applications for testing
4. **No Real Connections**: Tests must not depend on actual database/Redis connections
5. **Performance Validation**: Include response time and concurrency testing

### 📋 **Standard Test Structure**

```typescript
// 1. Create Mock Services
const createMockDatabase = () => ({
  healthCheck: jest.fn().mockResolvedValue({ status: 'healthy', latency: 15 }),
  getStats: jest.fn().mockResolvedValue({ connectionCount: 5 }),
  isHealthy: jest.fn().mockReturnValue(true)
});

// 2. Create Controller with Dependency Injection
const createTestController = (database: any, redis: any) => {
  // Controller accepts service dependencies
  // Return controller methods
};

// 3. Create Test Express App
const createTestApp = (database: any, redis: any) => {
  const app = express();
  const controller = createTestController(database, redis);
  
  // Setup middleware
  app.use(helmet());
  app.use(cors());
  app.use(express.json());
  
  // Setup routes with injected controller
  app.get('/api/endpoint', controller.method);
  
  return app;
};

// 4. Test Structure
describe('API Integration Tests', () => {
  let app: express.Application;
  let mockDatabase: any;
  let mockRedis: any;

  beforeEach(() => {
    mockDatabase = createMockDatabase();
    mockRedis = createMockRedis();
    app = createTestApp(mockDatabase, mockRedis);
  });

  // Tests here...
});
```

### 🚀 **Performance Requirements**

- **Response Times**: API endpoints <200ms, Health endpoints <100ms
- **Concurrency**: Handle 10+ simultaneous requests
- **Security**: Validate security headers (Helmet middleware)
- **Error Handling**: Test all failure scenarios

### ✅ **Quality Gates**

1. **All tests must pass** without external service dependencies
2. **Mock verification** - ensure service methods are called correctly
3. **Response format validation** - consistent JSON structure
4. **Security headers** - Helmet middleware validation
5. **Performance benchmarks** - response time requirements met

### 📁 **Test File Organization**

```
tests/
├── integration/
│   ├── health-endpoints.test.ts          ✅ Standard (25/25 passing)
│   ├── auth-registration.test.ts         🚧 Next Phase 2
│   ├── auth-login.test.ts                🚧 Next Phase 2
│   ├── auth-mfa.test.ts                  🚧 Next Phase 2
│   └── auth-workflows.test.ts            🚧 Next Phase 2
└── unit/                                 ✅ Complete (59/59 passing)
```

### 🔧 **Common Patterns**

#### Mock Service Creation
```typescript
const createMockAuthService = () => ({
  register: jest.fn(),
  login: jest.fn(),
  verifyMFA: jest.fn(),
  refreshToken: jest.fn(),
  logout: jest.fn()
});
```

#### Test Express App Setup
```typescript
const createAuthTestApp = (authService: any, database: any, redis: any) => {
  const app = express();
  const authController = createAuthController(authService, database, redis);
  
  // Middleware
  app.use(helmet());
  app.use(cors());
  app.use(express.json());
  
  // Routes
  app.post('/api/auth/register', authController.register);
  app.post('/api/auth/login', authController.login);
  
  return app;
};
```

#### Performance Testing
```typescript
it('should meet performance SLA', async () => {
  const startTime = Date.now();
  await request(app).post('/api/auth/login').send(validCredentials).expect(200);
  const duration = Date.now() - startTime;
  expect(duration).toBeLessThan(200);
});
```

### 🎯 **Success Criteria**

**Phase 1 Achievements**:
- ✅ Health endpoints: 25/25 tests passing
- ✅ Dependency injection pattern established
- ✅ Performance benchmarks exceeded (<100ms responses)
- ✅ Security validation implemented
- ✅ Concurrency testing validated

**Next: Apply this pattern to authentication APIs in Phase 2**

---

*This standard is based on the successful implementation in `tests/integration/health-endpoints.test.ts` and should be applied to all future integration tests.*
