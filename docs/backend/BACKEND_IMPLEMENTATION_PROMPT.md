# Backend Development Prompt
version: "1.0.0"
created: "2025-08-12"
persona: "Technical Strategy Advisor"

## Project Initialization Prompt

Based on the comprehensive Dessai Backend documentation, use this prompt to initialize the backend implementation:

---

**🚀 Dessai Backend Implementation Request**

I need you to implement the Dessai AI-Native Technical Hiring Platform backend based on the comprehensive specification provided. This is an enterprise-grade microservices architecture with the following key requirements:

### 📋 Project Overview
- **Platform**: AI-Native Technical Hiring Platform
- **Architecture**: Microservices with API Gateway
- **Stack**: TypeScript/Node.js with PostgreSQL, Redis, Kafka
- **Security**: Zero-trust architecture with enterprise compliance
- **Services**: 6 core microservices + integration layer

### 🏗️ Core Services to Implement

1. **User Management Service**
   - Authentication (JWT, MFA, SSO)
   - Authorization (RBAC with policies)
   - User profiles and organizations
   - Complete audit logging

2. **Assessment Service**
   - Assessment creation and management
   - Question library with search
   - Session management with real-time tracking
   - Answer submission and scoring

3. **Code Execution Service**
   - Docker-based secure sandboxing
   - Multi-language support (JS, Python, Java, C++, Go, Rust)
   - Security-first execution with resource limits
   - Result processing and analysis

4. **Proctoring Service**
   - AI-powered video/audio analysis
   - Real-time behavioral monitoring
   - Integrity scoring and violation detection
   - WebRTC streaming with TensorFlow.js

5. **Analytics Service**
   - Performance metrics and insights
   - Real-time data processing
   - Bias detection and compliance reporting
   - Predictive scoring algorithms

6. **Notification Service**
   - Multi-channel notifications (Email, SMS, Webhook)
   - Template management and personalization
   - Delivery tracking and retry logic
   - Provider abstraction layer

### 🔧 Technical Requirements

**Core Technologies:**
```yaml
Runtime: Node.js 20+ LTS with TypeScript 5.x
Framework: Express.js with security middleware
Database: PostgreSQL 15+ with read replicas
Cache: Redis 7+ Cluster
Message Queue: Apache Kafka 3.6+
Container: Docker with security profiles
Orchestration: Kubernetes ready
```

**Security Implementation:**
- JWT authentication with RS256 signing
- RBAC authorization with context-aware policies
- AES-256-GCM encryption at rest
- TLS 1.3 for data in transit
- Comprehensive audit logging
- MFA support (TOTP/WebAuthn)

**Integration Requirements:**
- ATS Integration (Greenhouse, Workday, BambooHR)
- Calendar APIs (Google, Outlook, Calendly)
- Identity Providers (SAML, OAuth, LDAP)
- Webhook management with retry logic

### 📁 Project Structure
Follow the complete project structure defined in the specification with:
- Microservices in `/src/services/`
- Shared components in `/src/shared/`
- Integration layer in `/src/integrations/`
- Comprehensive testing in `/tests/`
- Infrastructure as Code in `/infrastructure/`
- Complete monitoring setup

### 🛡️ Security & Compliance
- Zero-trust security model
- GDPR, SOC 2, ISO 27001 compliance ready
- Comprehensive input validation
- Security scanning integration
- Audit trail for all operations

### 🧪 Quality Requirements
- 90%+ test coverage with unit, integration, E2E tests
- Performance: <200ms API response times
- Scalability: Horizontal auto-scaling ready
- Monitoring: Prometheus/Grafana/Jaeger integration
- Documentation: OpenAPI 3.0 specifications

### 📚 Reference Documentation
Use the existing documentation as reference:
- Complete system architecture diagrams
- Detailed database schemas with relationships
- Security implementation guidelines
- API specifications and service contracts
- Deployment and infrastructure configurations

### 🎯 Implementation Goals
1. Create a production-ready, enterprise-grade backend
2. Implement all security best practices
3. Ensure scalability and performance optimization
4. Include comprehensive testing strategy
5. Provide complete API documentation
6. Set up monitoring and observability
7. Include deployment automation

### 📝 Deliverables Expected
- Complete source code with TypeScript implementation
- Database migrations and seed data
- Docker containers with security configurations
- Kubernetes deployment manifests
- API documentation (OpenAPI/Swagger)
- Comprehensive test suites
- Monitoring and logging setup
- CI/CD pipeline configuration
- Security scanning and compliance checks

### 🔄 Development Approach
Follow the AI-native development methodology:
- Use structured development with clear separation of concerns
- Implement security-first design patterns
- Include comprehensive error handling
- Add extensive logging and monitoring
- Create reusable components and utilities
- Follow TypeScript best practices
- Implement proper dependency injection

Please implement this backend system following enterprise software development best practices, ensuring it's production-ready, secure, scalable, and maintainable.

---

**Additional Context:**
This backend will power a technical hiring platform used by enterprise customers for conducting secure, AI-monitored coding assessments. Security, reliability, and performance are critical requirements.

**Success Criteria:**
- All services successfully deployed and communicating
- Complete test coverage with passing CI/CD pipeline
- Security scanning shows no critical vulnerabilities
- Performance benchmarks meet requirements
- Documentation is comprehensive and up-to-date
- Code follows established patterns and standards

Use this prompt with any AI coding assistant to implement the complete Dessai backend system based on the architectural specifications and requirements outlined in this documentation.
