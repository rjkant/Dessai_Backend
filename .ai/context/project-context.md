# Project Context Template
version: "1.0.0"
project: "dessai"
last_updated: "2025-08-08"

## Project Overview
**Name**: Dessai - Online Testing Platform for Software Engineer Interviews
**Purpose**: Multistep online testing platform supporting MCQ, debugging, and DSA coding questions
**Domain**: EdTech / HR Tech / Technical Assessment
**Stage**: Initial Development

## Business Context
### Target Users
- **Primary**: HR teams and technical recruiters conducting software engineer interviews
- **Secondary**: Software engineering candidates taking technical assessments
- **Tertiary**: Technical interviewers and hiring managers

### Key Use Cases
1. **Multi-step Technical Assessment**: MCQ → Debugging → DSA coding progression
2. **Real-time Collaboration**: Live coding sessions between interviewer and candidate
3. **Automated Evaluation**: Code execution against test cases with instant feedback
4. **Interview Management**: Scheduling, monitoring, and reporting on technical interviews

### Business Goals
- Streamline technical interview processes
- Provide consistent and fair evaluation criteria
- Reduce time-to-hire for technical positions
- Scale technical interview capacity

## Technical Architecture

### System Architecture
```
Frontend (React/TypeScript) 
    ↓ 
API Gateway (Node.js/Express)
    ↓
Microservices Architecture:
    - Auth Service (JWT, OAuth)
    - Question Service (MCQ, Debugging, DSA)
    - Code Execution Service (Docker containers)
    - Assessment Service (Test management)
    - Analytics Service (Reporting, metrics)
    ↓
Database Layer:
    - PostgreSQL (Primary data)
    - Redis (Caching, sessions)
    - MongoDB (Logs, analytics)
```

### Technology Stack
**Frontend**:
- React 18+ with TypeScript
- Material-UI or Tailwind CSS
- Monaco Editor for code editing
- WebSocket for real-time collaboration

**Backend**:
- Node.js with Express/Fastify
- TypeScript for type safety
- Prisma/TypeORM for database ORM
- Docker for containerization

**Database**:
- PostgreSQL for structured data
- Redis for caching and sessions
- MongoDB for logs and analytics

**Infrastructure**:
- Docker & Docker Compose for local development
- Kubernetes for production deployment
- AWS/GCP for cloud infrastructure
- CI/CD with GitHub Actions

### Security Requirements
- End-to-end encryption for sensitive data
- Multi-factor authentication for admin users
- Code execution in sandboxed environments
- Audit logging for all assessment activities
- GDPR/CCPA compliance for candidate data

### Performance Requirements
- Sub-200ms response times for UI interactions
- Support for 1000+ concurrent users
- Code execution timeout limits (30 seconds max)
- 99.9% uptime during business hours

## Development Standards

### Code Quality
- TypeScript strict mode enabled
- ESLint + Prettier for code formatting
- Minimum 80% test coverage
- Comprehensive error handling
- Security-first development practices

### Git Workflow
- Feature branch workflow with PR reviews
- Conventional commit messages
- Automated CI/CD pipeline
- Security scanning on all commits

### Documentation Requirements
- API documentation with OpenAPI/Swagger
- Component documentation with Storybook
- Architecture decision records (ADRs)
- Deployment and operational runbooks

## Domain-Specific Concepts

### Assessment Types
1. **MCQ (Multiple Choice Questions)**
   - Single or multiple correct answers
   - Time limits per question
   - Randomized question order
   - Immediate or delayed feedback

2. **Debugging Challenges**
   - Buggy code snippets to fix
   - Multiple programming languages
   - Automated test validation
   - Explanation of fixes required

3. **DSA (Data Structures & Algorithms)**
   - Algorithmic problem solving
   - Code editor with syntax highlighting
   - Hidden and visible test cases
   - Time and space complexity analysis

### Key Entities
- **User**: Candidates, Interviewers, Admins
- **Assessment**: Test session with multiple sections
- **Question**: Individual test items (MCQ, Debug, DSA)
- **Submission**: Candidate answers and code
- **Report**: Evaluation results and analytics

### Business Rules
- Assessments must be completed in sequence (MCQ → Debug → DSA)
- Code submissions are auto-saved every 30 seconds
- Plagiarism detection runs on all code submissions
- Results are available immediately after completion
- Test sessions expire after 4 hours maximum

## Integration Requirements

### External Services
- **Code Execution**: Docker-based sandboxed environment
- **Video/Audio**: WebRTC for live interviews (optional)
- **Email**: Transactional emails for notifications
- **Analytics**: Integration with analytics platforms
- **Payment**: Subscription management (future)

### API Design Principles
- RESTful API design with consistent naming
- JSON:API or GraphQL for data exchange
- Rate limiting and authentication on all endpoints
- Comprehensive error responses with helpful messages
- API versioning strategy for backward compatibility

## Operational Requirements

### Monitoring & Observability
- Application performance monitoring (APM)
- Real-time error tracking and alerting
- Business metrics dashboard
- Infrastructure monitoring

### Deployment Strategy
- Blue-green deployments for zero downtime
- Feature flags for gradual rollouts
- Automated rollback procedures
- Environment parity (dev/staging/prod)

### Scalability Considerations
- Horizontal scaling for application servers
- Database read replicas for improved performance
- CDN for static assets and global distribution
- Auto-scaling policies based on load

This context should inform all AI interactions and code generation for this project.
