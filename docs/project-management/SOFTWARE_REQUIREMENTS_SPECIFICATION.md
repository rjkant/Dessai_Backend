
# Software Requirements Specification (SRS)
## Dessai AI-Native Technical Hiring Platform - Backend Services

**Document Version:** 1.0  
**Date:** August 12, 2025  
**Author:** Technical Strategy Advisor (CTO)  
**Project:** Dessai Backend Services  

---

## 1. Introduction

### 1.1 Purpose
This Software Requirements Specification defines the functional and non-functional requirements for the Dessai backend services. It serves as the primary reference for developers, testers, and stakeholders during implementation and validation.

### 1.2 Scope
The Dessai backend encompasses six core microservices supporting an AI-native technical hiring platform with advanced proctoring, real-time collaboration, and enterprise integrations.

### 1.3 Definitions and Acronyms
- **ATS**: Applicant Tracking System
- **mTLS**: Mutual Transport Layer Security
- **RBAC**: Role-Based Access Control
- **SLA**: Service Level Agreement
- **API**: Application Programming Interface
- **WebRTC**: Web Real-Time Communication

### 1.4 References
- `docs/system/architecture/system-architecture.md`
- `docs/system/data/data-models.md`
- `docs/system/security/security-compliance.md`
- `docs/backend/BACKEND_SPECIFICATION.md`

---

## 2. Overall Description

### 2.1 Product Perspective
Dessai backend is a cloud-native microservices platform that provides:
- Secure user and organization management
- AI-powered technical assessments
- Real-time code execution and collaboration
- Multi-modal proctoring capabilities
- Advanced analytics and reporting
- Enterprise system integrations

### 2.2 Product Functions
1. **User Management**: Authentication, authorization, organization management
2. **Assessment Engine**: Question generation, scoring, collaboration
3. **Code Execution**: Sandboxed code running with security isolation
4. **Proctoring Service**: Real-time monitoring and anomaly detection
5. **Analytics Engine**: Performance insights and predictive analytics
6. **Notification System**: Multi-channel communication management

### 2.3 User Classes
- **Candidates**: Take assessments, collaborate on code
- **Interviewers**: Conduct assessments, review results
- **Hiring Managers**: Review analytics, manage hiring pipeline
- **System Administrators**: Manage platform configuration
- **Integration Partners**: ATS, calendar, identity systems

### 2.4 Operating Environment
- **Runtime**: Node.js 20+ LTS with TypeScript 5.x
- **Database**: PostgreSQL 15+, Redis 7+, InfluxDB 2.x
- **Infrastructure**: Kubernetes cluster with Istio service mesh
- **Monitoring**: Prometheus, Grafana, ELK stack

---

## 3. Functional Requirements

### 3.1 User Management Service

#### 3.1.1 Authentication Requirements
**REQ-AUTH-001**: The system SHALL implement JWT-based authentication with RS256 signing
- **Input**: User credentials (email/password, SSO token, MFA code)
- **Output**: JWT access token and refresh token
- **Validation**: Token expiry, signature verification, user status
- **Test Criteria**: Successful login returns valid tokens; invalid credentials rejected

**REQ-AUTH-002**: The system SHALL support Multi-Factor Authentication (MFA)
- **Input**: Primary authentication + TOTP/WebAuthn challenge
- **Output**: MFA-verified JWT tokens
- **Validation**: TOTP code validation, WebAuthn challenge verification
- **Test Criteria**: MFA required for privileged accounts; bypass attempts blocked

**REQ-AUTH-003**: The system SHALL implement automatic token refresh
- **Input**: Valid refresh token
- **Output**: New access token and optionally rotated refresh token
- **Validation**: Refresh token validity, user session status
- **Test Criteria**: Seamless token renewal; expired tokens rejected

#### 3.1.2 Authorization Requirements
**REQ-AUTHZ-001**: The system SHALL implement Role-Based Access Control (RBAC)
- **Roles**: SuperAdmin, OrgAdmin, Interviewer, Candidate
- **Permissions**: Resource-specific with CRUD granularity
- **Validation**: Role assignment, permission inheritance
- **Test Criteria**: Users can only access authorized resources

**REQ-AUTHZ-002**: The system SHALL support organization-level data isolation
- **Input**: User request with organization context
- **Output**: Filtered data based on organization membership
- **Validation**: Cross-organization access prevention
- **Test Criteria**: Users cannot access other organizations' data

#### 3.1.3 User Profile Management
**REQ-USER-001**: The system SHALL support user profile CRUD operations
- **Required Fields**: email, firstName, lastName, role, organizationId
- **Optional Fields**: profileImage, timezone, preferences
- **Validation**: Email uniqueness, role validity, organization membership
- **Test Criteria**: Profile updates persist correctly; validation errors handled

### 3.2 Assessment Engine Service

#### 3.2.1 Assessment Management
**REQ-ASSESS-001**: The system SHALL support assessment creation and configuration
- **Input**: Assessment metadata, questions, configuration settings
- **Output**: Created assessment with unique identifier
- **Validation**: Question validity, time limits, scoring criteria
- **Test Criteria**: Assessments created with correct configuration

**REQ-ASSESS-002**: The system SHALL support real-time collaborative assessments
- **Input**: Multiple user sessions on same assessment
- **Output**: Synchronized code changes and cursor positions
- **Validation**: Conflict resolution, session management
- **Test Criteria**: Changes visible to all participants in real-time

#### 3.2.2 Question Management
**REQ-QUESTION-001**: The system SHALL support multiple question types
- **Types**: Coding, Multiple Choice, System Design, Database
- **Languages**: JavaScript, Python, Java, Go, C++, Rust
- **Validation**: Syntax checking, test case validation
- **Test Criteria**: Each question type renders and evaluates correctly

**REQ-QUESTION-002**: The system SHALL implement AI-powered question generation
- **Input**: Difficulty level, technology stack, role requirements
- **Output**: Generated questions with test cases and solutions
- **Validation**: Question relevance, difficulty calibration
- **Test Criteria**: Generated questions meet specified criteria

#### 3.2.3 Scoring and Evaluation
**REQ-SCORING-001**: The system SHALL implement automated code scoring
- **Criteria**: Correctness, efficiency, code quality, test coverage
- **Weights**: Configurable per assessment
- **Output**: Numerical score with detailed breakdown
- **Test Criteria**: Scores correlate with expected performance

### 3.3 Code Execution Service

#### 3.3.1 Sandbox Execution
**REQ-EXEC-001**: The system SHALL execute code in isolated sandboxes
- **Isolation**: Docker containers with gVisor runtime
- **Limits**: CPU (2 cores), Memory (512MB), Time (30s), Network (blocked)
- **Languages**: Node.js, Python, Java, Go, C++, Rust
- **Test Criteria**: Code executes safely without system access

**REQ-EXEC-002**: The system SHALL capture execution results and metrics
- **Output**: stdout, stderr, exit code, execution time, memory usage
- **Validation**: Result accuracy, resource monitoring
- **Test Criteria**: All execution data captured correctly

#### 3.3.2 Security Requirements
**REQ-EXEC-SEC-001**: The system SHALL prevent malicious code execution
- **Protections**: File system restrictions, network isolation, syscall filtering
- **Monitoring**: Resource usage, suspicious activity detection
- **Response**: Immediate termination of violating processes
- **Test Criteria**: Malicious code attempts are blocked and logged

### 3.4 Proctoring Service

#### 3.4.1 Multi-Modal Monitoring
**REQ-PROC-001**: The system SHALL capture video, audio, and screen data
- **Video**: Face detection, gaze tracking, multiple person detection
- **Audio**: Voice analysis, background noise detection
- **Screen**: Application monitoring, tab switching detection
- **Test Criteria**: All monitoring streams function simultaneously

**REQ-PROC-002**: The system SHALL implement real-time anomaly detection
- **AI Models**: Face recognition, behavioral analysis, audio classification
- **Thresholds**: Configurable per assessment type
- **Alerts**: Real-time notifications to proctors
- **Test Criteria**: Anomalies detected and reported within 2 seconds

#### 3.4.2 Privacy and Compliance
**REQ-PROC-PRIV-001**: The system SHALL implement configurable proctoring levels
- **Levels**: None, Basic (screen only), Standard (screen + camera), Full (all modalities)
- **Consent**: Explicit user consent for each monitoring type
- **Data Handling**: Encrypted storage, configurable retention
- **Test Criteria**: Proctoring level enforced; data handled per policy

### 3.5 Analytics Engine Service

#### 3.5.1 Performance Analytics
**REQ-ANALYTICS-001**: The system SHALL generate candidate performance insights
- **Metrics**: Score trends, time allocation, error patterns, collaboration effectiveness
- **Aggregation**: Individual, team, organization levels
- **Visualization**: Charts, heatmaps, performance dashboards
- **Test Criteria**: Analytics accurately reflect assessment data

**REQ-ANALYTICS-002**: The system SHALL detect hiring bias patterns
- **Analysis**: Score distribution by demographics, interview feedback correlation
- **Alerts**: Statistical significance of bias indicators
- **Reporting**: Bias reports with actionable recommendations
- **Test Criteria**: Bias detection algorithms validated against known patterns

#### 3.5.2 Predictive Analytics
**REQ-PREDICT-001**: The system SHALL predict hiring success probability
- **Input**: Assessment scores, interview feedback, historical data
- **Model**: Machine learning with continuous retraining
- **Output**: Success probability with confidence intervals
- **Test Criteria**: Predictions validated against actual hiring outcomes

### 3.6 Notification Service

#### 3.6.1 Multi-Channel Notifications
**REQ-NOTIF-001**: The system SHALL support multiple notification channels
- **Channels**: Email, SMS, Push notifications, In-app notifications, Webhooks
- **Templates**: Customizable with organization branding
- **Scheduling**: Immediate and scheduled delivery
- **Test Criteria**: All channels deliver notifications successfully

**REQ-NOTIF-002**: The system SHALL implement notification preferences
- **User Controls**: Channel selection, frequency limits, content filtering
- **Compliance**: Unsubscribe mechanisms, consent management
- **Validation**: Preference enforcement, delivery confirmation
- **Test Criteria**: User preferences respected; compliance maintained

---

## 4. Non-Functional Requirements

### 4.1 Performance Requirements

**REQ-PERF-001**: API Response Times
- **Target**: 95th percentile < 200ms for read operations, < 500ms for write operations
- **Load**: Support 1000 concurrent users per service
- **Measurement**: Response time monitoring with Prometheus
- **Test Criteria**: Performance targets met under specified load

**REQ-PERF-002**: Code Execution Performance
- **Target**: Code execution startup < 2 seconds, total runtime < 30 seconds
- **Throughput**: 100 concurrent executions per node
- **Resource Limits**: CPU (2 cores), Memory (512MB) per execution
- **Test Criteria**: Execution times within limits; resource usage monitored

**REQ-PERF-003**: Real-Time Features
- **WebSocket Latency**: < 100ms for collaboration updates
- **Proctoring Latency**: < 2 seconds for anomaly detection
- **Video Streaming**: < 3 seconds end-to-end latency
- **Test Criteria**: Real-time features perform within latency limits

### 4.2 Scalability Requirements

**REQ-SCALE-001**: Horizontal Scaling
- **Auto-scaling**: CPU/memory-based scaling with Kubernetes HPA
- **Load Distribution**: Even distribution across service instances
- **State Management**: Stateless services with external state storage
- **Test Criteria**: Services scale automatically under load

**REQ-SCALE-002**: Database Scaling
- **Read Replicas**: Automatic read query distribution
- **Connection Pooling**: PgBouncer with connection limits
- **Partitioning**: Time-based partitioning for analytics data
- **Test Criteria**: Database performance maintained under scale

### 4.3 Security Requirements

**REQ-SEC-001**: Data Encryption
- **At Rest**: AES-256-GCM for all stored data
- **In Transit**: TLS 1.3 for all external communications, mTLS for internal
- **Key Management**: Automated key rotation every 90 days
- **Test Criteria**: All data encrypted; keys rotated automatically

**REQ-SEC-002**: Access Control
- **Authentication**: JWT with RS256, MFA for privileged accounts
- **Authorization**: RBAC with principle of least privilege
- **Session Management**: Secure session handling with timeout
- **Test Criteria**: Unauthorized access prevented; sessions secure

**REQ-SEC-003**: Audit and Compliance
- **Audit Logging**: All user actions and system events logged
- **Retention**: 7 years for compliance, configurable by organization
- **Privacy**: GDPR-compliant data handling and deletion
- **Test Criteria**: Complete audit trail; compliance requirements met

### 4.4 Reliability Requirements

**REQ-REL-001**: High Availability
- **Uptime**: 99.9% availability (8.76 hours downtime/year)
- **Redundancy**: Multiple instances of each service
- **Failover**: Automatic failover within 30 seconds
- **Test Criteria**: Availability targets met; failover times verified

**REQ-REL-002**: Data Integrity
- **Backups**: Daily automated backups with 30-day retention
- **Validation**: Data integrity checks and corruption detection
- **Recovery**: RTO < 4 hours, RPO < 1 hour
- **Test Criteria**: Data integrity maintained; recovery times met

**REQ-REL-003**: Fault Tolerance
- **Circuit Breakers**: Automatic failure detection and isolation
- **Retry Logic**: Exponential backoff for transient failures
- **Graceful Degradation**: Reduced functionality vs. complete failure
- **Test Criteria**: System handles failures gracefully

### 4.5 Monitoring Requirements

**REQ-MON-001**: Application Monitoring
- **Metrics**: Response times, error rates, throughput, resource usage
- **Alerting**: Configurable thresholds with escalation policies
- **Dashboards**: Real-time operational dashboards
- **Test Criteria**: All metrics collected; alerts fire correctly

**REQ-MON-002**: Business Monitoring
- **KPIs**: Assessment completion rates, user engagement, system utilization
- **Analytics**: Trend analysis and capacity planning
- **Reporting**: Automated reports for stakeholders
- **Test Criteria**: Business metrics accurately tracked

---

## 5. Integration Requirements

### 5.1 External System Integrations

**REQ-INT-001**: ATS Integration
- **Systems**: Greenhouse, Workday, BambooHR, Lever
- **Protocols**: REST APIs with OAuth 2.0 authentication
- **Data Sync**: Bidirectional candidate and job data synchronization
- **Test Criteria**: All supported ATS systems integrate successfully

**REQ-INT-002**: Calendar Integration
- **Systems**: Google Calendar, Microsoft Exchange, CalDAV
- **Features**: Meeting scheduling, availability checking, reminders
- **Sync**: Real-time calendar updates and conflict detection
- **Test Criteria**: Calendar operations work across all systems

**REQ-INT-003**: Identity Provider Integration
- **Protocols**: SAML 2.0, OpenID Connect
- **Providers**: Active Directory, Okta, Auth0, Google Workspace
- **Features**: SSO, user provisioning, group synchronization
- **Test Criteria**: SSO works with all supported providers

### 5.2 Webhook System

**REQ-WEBHOOK-001**: Outbound Webhooks
- **Events**: Assessment completion, candidate updates, proctoring alerts
- **Delivery**: Reliable delivery with retry and dead letter queues
- **Security**: HMAC signature verification, IP allowlists
- **Test Criteria**: Webhooks deliver reliably; security enforced

**REQ-WEBHOOK-002**: Inbound Webhooks
- **Sources**: ATS systems, calendar providers, payment processors
- **Processing**: Event validation, transformation, and routing
- **Error Handling**: Invalid webhooks logged and rejected
- **Test Criteria**: Inbound webhooks processed correctly

---

## 6. Data Requirements

### 6.1 Data Models

**REQ-DATA-001**: Core Entity Models
- **User**: Authentication, profile, preferences, audit trail
- **Organization**: Configuration, billing, integrations, compliance
- **Assessment**: Questions, configuration, results, analytics
- **Test Criteria**: All entity relationships maintained; data consistency enforced

**REQ-DATA-002**: Analytics Data Models
- **Events**: User actions, system events, performance metrics
- **Aggregations**: Time-series data for dashboards and reporting
- **Retention**: Configurable data retention policies
- **Test Criteria**: Analytics data accurate and performant

### 6.2 Data Validation

**REQ-VALID-001**: Input Validation
- **API Requests**: Schema validation, type checking, range validation
- **File Uploads**: Size limits, type validation, virus scanning
- **Code Submissions**: Syntax validation, security scanning
- **Test Criteria**: Invalid inputs rejected with appropriate errors

**REQ-VALID-002**: Data Consistency
- **ACID Transactions**: Database consistency for critical operations
- **Eventual Consistency**: Acceptable for analytics and reporting
- **Conflict Resolution**: Last-write-wins for concurrent updates
- **Test Criteria**: Data consistency maintained across all operations

---

## 7. User Interface Requirements

### 7.1 API Design

**REQ-API-001**: RESTful API Standards
- **HTTP Methods**: Proper use of GET, POST, PUT, DELETE, PATCH
- **Status Codes**: Appropriate HTTP status codes for all responses
- **Resource Naming**: RESTful resource naming conventions
- **Test Criteria**: APIs follow REST principles consistently

**REQ-API-002**: API Documentation
- **OpenAPI**: Complete OpenAPI 3.0 specifications
- **Examples**: Request/response examples for all endpoints
- **Interactive Docs**: Swagger UI for API exploration
- **Test Criteria**: Documentation accurate and complete

### 7.2 GraphQL API

**REQ-GRAPHQL-001**: Schema Design
- **Types**: Strongly typed schema with proper relationships
- **Queries**: Efficient query resolution with data loader pattern
- **Mutations**: Proper mutation design with optimistic updates
- **Test Criteria**: GraphQL schema validates and performs efficiently

**REQ-GRAPHQL-002**: Real-Time Subscriptions
- **Events**: Real-time updates for assessments and proctoring
- **Filtering**: Subscription filtering and authentication
- **Performance**: Efficient subscription management
- **Test Criteria**: Subscriptions work reliably with proper filtering

---

## 8. Testing Requirements

### 8.1 Automated Testing

**REQ-TEST-001**: Unit Testing
- **Coverage**: Minimum 90% code coverage for all services
- **Framework**: Jest with comprehensive test suites
- **Mocking**: External dependencies mocked appropriately
- **Test Criteria**: All unit tests pass; coverage targets met

**REQ-TEST-002**: Integration Testing
- **Database**: Test with real database using test containers
- **Services**: Inter-service communication testing
- **External APIs**: Integration with mock external services
- **Test Criteria**: Integration tests verify end-to-end workflows

**REQ-TEST-003**: End-to-End Testing
- **User Workflows**: Complete user journeys automated
- **Cross-Browser**: Testing across supported browsers
- **Performance**: Load testing under realistic conditions
- **Test Criteria**: E2E tests cover all critical user paths

### 8.2 Security Testing

**REQ-SEC-TEST-001**: Vulnerability Testing
- **SAST**: Static analysis security testing in CI/CD
- **DAST**: Dynamic application security testing
- **Dependency Scanning**: Automated vulnerability scanning
- **Test Criteria**: No high/critical vulnerabilities in production

**REQ-SEC-TEST-002**: Penetration Testing
- **External Testing**: Quarterly penetration testing
- **Scope**: All public-facing services and APIs
- **Remediation**: Findings addressed within SLA
- **Test Criteria**: Penetration test findings resolved promptly

---

## 9. Deployment Requirements

### 9.1 Infrastructure

**REQ-DEPLOY-001**: Container Deployment
- **Technology**: Docker containers with Kubernetes orchestration
- **Environments**: Development, staging, production
- **Configuration**: Environment-specific configuration management
- **Test Criteria**: Consistent deployment across environments

**REQ-DEPLOY-002**: CI/CD Pipeline
- **Automation**: Fully automated build, test, and deployment
- **Quality Gates**: Code quality, security, and performance checks
- **Rollback**: Automated rollback capability
- **Test Criteria**: Deployments are reliable and reversible

### 9.2 Environment Management

**REQ-ENV-001**: Environment Isolation
- **Separation**: Isolated environments with separate resources
- **Data**: Anonymized production data for testing
- **Access**: Role-based access to different environments
- **Test Criteria**: Environments properly isolated and secured

**REQ-ENV-002**: Configuration Management
- **Secrets**: Encrypted secret management with rotation
- **Environment Variables**: Proper configuration injection
- **Validation**: Configuration validation before deployment
- **Test Criteria**: Configuration managed securely and reliably

---

## 10. Maintenance Requirements

### 10.1 Monitoring and Alerting

**REQ-MAINT-001**: Operational Monitoring
- **Health Checks**: Service health monitoring with automatic recovery
- **Performance**: Continuous performance monitoring and optimization
- **Capacity**: Proactive capacity planning and scaling
- **Test Criteria**: Monitoring provides actionable insights

**REQ-MAINT-002**: Business Monitoring
- **Usage Analytics**: Platform usage and adoption metrics
- **Performance KPIs**: Assessment quality and user satisfaction
- **Financial Metrics**: Cost monitoring and optimization
- **Test Criteria**: Business metrics support decision making

### 10.2 Updates and Maintenance

**REQ-UPDATE-001**: Software Updates
- **Dependencies**: Regular dependency updates and security patches
- **Database**: Database migration with zero downtime
- **Compatibility**: Backward compatibility maintenance
- **Test Criteria**: Updates deployed without service disruption

**REQ-UPDATE-002**: Data Maintenance
- **Cleanup**: Automated cleanup of expired data
- **Archival**: Long-term data archival strategies
- **Backup Validation**: Regular backup restore testing
- **Test Criteria**: Data maintenance processes work reliably

---

## 11. Acceptance Criteria

### 11.1 Developer Acceptance Criteria

**DEV-AC-001**: Code Quality
- [ ] All code follows TypeScript and project coding standards
- [ ] Code coverage minimum 90% with meaningful tests
- [ ] No high or critical security vulnerabilities
- [ ] All code reviewed and approved by senior developer

**DEV-AC-002**: API Compliance
- [ ] All APIs documented with OpenAPI specifications
- [ ] Error handling consistent across all endpoints
- [ ] Rate limiting implemented and tested
- [ ] Authentication and authorization working correctly

**DEV-AC-003**: Integration Compliance
- [ ] All external integrations working with test accounts
- [ ] Webhook delivery reliable with proper error handling
- [ ] Real-time features performing within latency requirements
- [ ] Database migrations tested and reversible

### 11.2 Tester Acceptance Criteria

**TEST-AC-001**: Functional Testing
- [ ] All functional requirements tested and passing
- [ ] User workflows tested end-to-end
- [ ] Error scenarios handled gracefully
- [ ] Data validation working correctly

**TEST-AC-002**: Performance Testing
- [ ] Performance requirements met under specified load
- [ ] Auto-scaling working correctly
- [ ] Memory leaks and resource usage validated
- [ ] Stress testing completed successfully

**TEST-AC-003**: Security Testing
- [ ] Authentication and authorization tested thoroughly
- [ ] Data encryption verified at rest and in transit
- [ ] Vulnerability scanning completed with no critical issues
- [ ] Security audit requirements met

### 11.3 Production Readiness Criteria

**PROD-AC-001**: Operational Readiness
- [ ] Monitoring and alerting configured and tested
- [ ] Disaster recovery procedures validated
- [ ] Performance baselines established
- [ ] Documentation complete and up-to-date

**PROD-AC-002**: Compliance Readiness
- [ ] GDPR compliance validated
- [ ] SOC 2 requirements implemented
- [ ] Audit logging comprehensive and tested
- [ ] Data retention policies implemented

---

## 12. Appendices

### Appendix A: API Endpoint Summary
Reference: `docs/backend/API_ENDPOINTS.md`

### Appendix B: Database Schema
Reference: `docs/system/data/data-models.md`

### Appendix C: Security Implementation
Reference: `docs/system/security/security-compliance.md`

### Appendix D: Integration Specifications
Reference: `docs/system/integrations/integrations-external-systems.md`

---

**Document Control:**
- **Version**: 1.0
- **Approved By**: Technical Strategy Advisor (CTO)
- **Next Review**: 2025-09-12
- **Distribution**: Development Team, QA Team, Product Management

---

*This SRS provides comprehensive requirements for implementing and testing the Dessai backend services. All requirements include specific test criteria to ensure proper validation during development and testing phases.*
