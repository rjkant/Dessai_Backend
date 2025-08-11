# Coding Standards and Conventions
version: "1.0.0"
last_updated: "2025-08-08"

## General Principles

### Clean Code Principles
- **Meaningful Names**: Use descriptive, searchable names for variables, functions, and classes
- **Single Responsibility**: Each function/class should have one clear purpose
- **DRY (Don't Repeat Yourself)**: Extract common functionality into reusable components
- **YAGNI (You Aren't Gonna Need It)**: Don't implement features before they're needed
- **KISS (Keep It Simple, Stupid)**: Prefer simple, readable solutions over complex ones

### SOLID Principles
- **S**ingle Responsibility Principle
- **O**pen/Closed Principle (open for extension, closed for modification)
- **L**iskov Substitution Principle
- **I**nterface Segregation Principle
- **D**ependency Inversion Principle

## TypeScript/JavaScript Standards

### Naming Conventions
```typescript
// Variables and functions: camelCase
const userName = 'john_doe';
const getUserById = (id: string) => { /* ... */ };

// Classes: PascalCase
class UserService {
  private readonly apiClient: ApiClient;
}

// Interfaces: PascalCase with 'I' prefix (optional)
interface IUserRepository {
  findById(id: string): Promise<User | null>;
}

// Types: PascalCase
type UserRole = 'admin' | 'user' | 'interviewer';

// Constants: UPPER_SNAKE_CASE
const MAX_RETRY_ATTEMPTS = 3;
const API_ENDPOINTS = {
  USERS: '/api/users',
  ASSESSMENTS: '/api/assessments'
} as const;

// Files and directories: kebab-case
// user-service.ts, assessment-controller.ts
```

### Code Structure
```typescript
// File structure order:
// 1. Imports (external libraries first, then internal)
// 2. Types and interfaces
// 3. Constants
// 4. Main implementation
// 5. Export statements

import express from 'express';
import { z } from 'zod';

import { UserService } from '../services/user-service';
import { validateRequest } from '../middleware/validation';

// Types
interface CreateUserRequest {
  email: string;
  name: string;
  role: UserRole;
}

// Constants
const USER_VALIDATION_SCHEMA = z.object({
  email: z.string().email(),
  name: z.string().min(1),
  role: z.enum(['admin', 'user', 'interviewer'])
});

// Implementation
export class UserController {
  constructor(private readonly userService: UserService) {}

  async createUser(req: express.Request, res: express.Response) {
    // Implementation
  }
}
```

### Error Handling
```typescript
// Use custom error classes
export class ValidationError extends Error {
  constructor(
    message: string,
    public readonly field: string,
    public readonly code = 'VALIDATION_ERROR'
  ) {
    super(message);
    this.name = 'ValidationError';
  }
}

// Result pattern for error handling
type Result<T, E = Error> = 
  | { success: true; data: T }
  | { success: false; error: E };

// Async error handling
async function safeAsyncOperation(): Promise<Result<User, ValidationError>> {
  try {
    const user = await userService.create(userData);
    return { success: true, data: user };
  } catch (error) {
    if (error instanceof ValidationError) {
      return { success: false, error };
    }
    // Re-throw unexpected errors
    throw error;
  }
}
```

### Function Guidelines
```typescript
// Functions should be pure when possible
const calculateTotalScore = (submissions: Submission[]): number => {
  return submissions.reduce((total, sub) => total + sub.score, 0);
};

// Use type guards for runtime type checking
const isValidEmail = (email: unknown): email is string => {
  return typeof email === 'string' && /\S+@\S+\.\S+/.test(email);
};

// Async functions should always return Promise
async function fetchUserData(id: string): Promise<User | null> {
  // Always handle errors appropriately
  try {
    return await userRepository.findById(id);
  } catch (error) {
    logger.error('Failed to fetch user', { id, error });
    return null;
  }
}
```

## React/Frontend Standards

### Component Structure
```tsx
// Component file structure
import React, { useState, useEffect } from 'react';
import { Box, Button, Typography } from '@mui/material';

import { User } from '../types/user';
import { useUserApi } from '../hooks/use-user-api';

// Props interface
interface UserProfileProps {
  userId: string;
  onUserUpdate?: (user: User) => void;
}

// Component implementation
export const UserProfile: React.FC<UserProfileProps> = ({
  userId,
  onUserUpdate
}) => {
  // State declarations
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  // Custom hooks
  const { fetchUser, updateUser } = useUserApi();
  
  // Effects
  useEffect(() => {
    // Effect logic
  }, [userId]);
  
  // Event handlers
  const handleUpdateClick = async () => {
    // Handler logic
  };
  
  // Render logic
  if (loading) return <div>Loading...</div>;
  if (error) return <div>Error: {error}</div>;
  
  return (
    <Box>
      {/* Component JSX */}
    </Box>
  );
};
```

### State Management
```typescript
// Use Redux Toolkit for complex state
// Use React Query for server state
// Use local state for UI state only

// Custom hooks for business logic
export const useAssessment = (assessmentId: string) => {
  const [assessment, setAssessment] = useState<Assessment | null>(null);
  const [loading, setLoading] = useState(true);
  
  const loadAssessment = async () => {
    try {
      setLoading(true);
      const data = await assessmentApi.getById(assessmentId);
      setAssessment(data);
    } catch (error) {
      // Handle error
    } finally {
      setLoading(false);
    }
  };
  
  return { assessment, loading, loadAssessment };
};
```

## Backend/API Standards

### API Design
```typescript
// RESTful route structure
// GET    /api/users              - List users
// GET    /api/users/:id          - Get user by ID
// POST   /api/users              - Create user
// PUT    /api/users/:id          - Update user
// DELETE /api/users/:id          - Delete user

// Controller structure
export class UserController {
  constructor(
    private readonly userService: UserService,
    private readonly logger: Logger
  ) {}

  async getUsers(req: Request, res: Response) {
    try {
      const { page = 1, limit = 10 } = req.query;
      const result = await this.userService.getUsers({
        page: Number(page),
        limit: Number(limit)
      });
      
      res.json({
        data: result.users,
        meta: {
          total: result.total,
          page: Number(page),
          limit: Number(limit)
        }
      });
    } catch (error) {
      this.logger.error('Failed to get users', error);
      res.status(500).json({
        error: 'Internal server error',
        message: 'Failed to retrieve users'
      });
    }
  }
}
```

### Database/ORM Standards
```typescript
// Entity definitions with Prisma
model User {
  id        String   @id @default(cuid())
  email     String   @unique
  name      String
  role      UserRole
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt
  
  assessments Assessment[]
  
  @@map("users")
}

// Repository pattern
export class UserRepository {
  constructor(private readonly prisma: PrismaClient) {}
  
  async findById(id: string): Promise<User | null> {
    return this.prisma.user.findUnique({
      where: { id },
      include: { assessments: true }
    });
  }
  
  async create(data: CreateUserData): Promise<User> {
    return this.prisma.user.create({
      data,
      include: { assessments: true }
    });
  }
}
```

## Testing Standards

### Unit Test Structure
```typescript
// Use describe/it structure
describe('UserService', () => {
  let userService: UserService;
  let mockRepository: jest.Mocked<UserRepository>;
  
  beforeEach(() => {
    mockRepository = createMockUserRepository();
    userService = new UserService(mockRepository);
  });
  
  describe('createUser', () => {
    it('should create user with valid data', async () => {
      // Arrange
      const userData = {
        email: 'test@example.com',
        name: 'Test User',
        role: 'user' as const
      };
      
      mockRepository.create.mockResolvedValue(mockUser);
      
      // Act
      const result = await userService.createUser(userData);
      
      // Assert
      expect(result).toEqual(mockUser);
      expect(mockRepository.create).toHaveBeenCalledWith(userData);
    });
    
    it('should throw validation error for invalid email', async () => {
      // Arrange
      const invalidData = { email: 'invalid', name: 'Test', role: 'user' };
      
      // Act & Assert
      await expect(userService.createUser(invalidData))
        .rejects
        .toThrow(ValidationError);
    });
  });
});
```

## Documentation Standards

### Code Comments
```typescript
/**
 * Calculates the total score for an assessment based on all submissions.
 * 
 * @param submissions - Array of user submissions to evaluate
 * @param weights - Optional weights for different question types
 * @returns The calculated total score (0-100)
 * 
 * @example
 * ```typescript
 * const score = calculateAssessmentScore(submissions, {
 *   mcq: 0.3,
 *   debugging: 0.3,
 *   coding: 0.4
 * });
 * ```
 */
export function calculateAssessmentScore(
  submissions: Submission[],
  weights?: ScoreWeights
): number {
  // Implementation details...
}

// Inline comments for complex logic
const processSubmission = (submission: Submission) => {
  // Convert ISO timestamp to Date object for comparison
  const submittedAt = new Date(submission.timestamp);
  
  // Check if submission was made within the allowed time window
  if (submittedAt > assessment.endTime) {
    throw new ValidationError('Submission after deadline');
  }
};
```

### README and Documentation
- Every module should have a clear README
- API endpoints documented with OpenAPI/Swagger
- Architecture decisions documented in ADRs
- Setup and deployment instructions included
- Code examples for complex features

## Security Standards

### Input Validation
```typescript
// Always validate and sanitize input
const createUserSchema = z.object({
  email: z.string().email().max(255),
  name: z.string().min(1).max(100).trim(),
  role: z.enum(['admin', 'user', 'interviewer'])
});

export const validateCreateUser = (data: unknown) => {
  return createUserSchema.parse(data);
};
```

### Authentication/Authorization
```typescript
// JWT token validation middleware
export const requireAuth = (req: Request, res: Response, next: NextFunction) => {
  const token = req.headers.authorization?.replace('Bearer ', '');
  
  if (!token) {
    return res.status(401).json({ error: 'Authentication required' });
  }
  
  try {
    const payload = jwt.verify(token, JWT_SECRET) as JwtPayload;
    req.user = payload;
    next();
  } catch (error) {
    return res.status(401).json({ error: 'Invalid token' });
  }
};
```

## Performance Standards

### Optimization Guidelines
- Use appropriate data structures and algorithms
- Implement caching where beneficial
- Optimize database queries (avoid N+1 problems)
- Use connection pooling for database connections
- Implement proper error boundaries and fallbacks
- Monitor and profile performance regularly

These standards ensure consistent, maintainable, and high-quality code across the entire project.
