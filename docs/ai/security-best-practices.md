# Security Best Practices for AI-Assisted Development
version: "1.0.0"
last_updated: "2025-08-08"

## Overview
This document outlines security best practices when using AI assistance for software development, ensuring that AI-generated code meets the highest security standards and doesn't introduce vulnerabilities.

## General Security Principles

### Zero Trust Approach
- Never assume AI-generated code is secure by default
- All AI output must undergo security review before production
- Implement automated security scanning for all code changes
- Apply the principle of least privilege to all AI-generated functionality

### Security by Design
- Include security requirements in all AI prompts
- Request security-focused code reviews from AI
- Implement defense-in-depth strategies
- Plan for security testing and validation

## Secure Prompting Practices

### Sensitive Information Handling

#### ❌ Don't Include Sensitive Data in Prompts
```
// BAD: Including real credentials
"Help me connect to the database using username 'admin' and password 'MyRealPassword123'"

// BAD: Including real API keys
"Fix this API call: curl -H 'Authorization: Bearer sk-1234567890abcdef'"
```

#### ✅ Use Placeholders and Examples
```
// GOOD: Using placeholders
"Help me connect to the database using environment variables for credentials"

// GOOD: Using example patterns
"Fix this API call pattern: curl -H 'Authorization: Bearer $API_TOKEN'"
```

### Data Privacy Considerations

#### Personal Information
- Never include real user data in prompts
- Use synthetic test data for examples
- Sanitize logs and error messages
- Implement proper data anonymization

#### Example Safe Prompt:
```
"Create a user registration system with the following test data structure:
{
  'email': 'user@example.com',
  'name': 'Test User',
  'phone': '+1-555-0123'
}

Ensure all PII is properly encrypted and follows GDPR compliance."
```

## Security-Focused Prompt Templates

### Input Validation Template
```
Create [FUNCTION_NAME] with comprehensive input validation:

Requirements:
- Validate all input parameters against expected types and formats
- Sanitize inputs to prevent injection attacks
- Implement rate limiting for API endpoints
- Add comprehensive error handling that doesn't expose sensitive information
- Follow OWASP input validation guidelines

Security Considerations:
- SQL injection prevention
- XSS prevention
- Command injection prevention
- Path traversal prevention
- LDAP injection prevention

Please include security tests that validate protection against common attacks.
```

### Authentication Template
```
Implement secure authentication for [COMPONENT] with these requirements:

Security Features:
- Strong password policy enforcement
- Secure password hashing (bcrypt, scrypt, or Argon2)
- JWT token implementation with proper expiration
- Multi-factor authentication support
- Account lockout after failed attempts
- Secure session management

Compliance:
- Follow OWASP authentication guidelines
- Implement proper token refresh mechanisms
- Include audit logging for authentication events
- Handle authentication errors securely

Please provide implementation with security tests and documentation.
```

### Authorization Template
```
Create authorization system for [RESOURCE] with:

Access Control:
- Role-based access control (RBAC)
- Principle of least privilege
- Resource-level permissions
- Time-based access restrictions

Security Implementation:
- Secure token validation
- Authorization bypass prevention
- Proper error handling
- Audit logging for access attempts

Testing Requirements:
- Test privilege escalation prevention
- Validate access control enforcement
- Test unauthorized access scenarios
- Include security regression tests
```

## Common Security Vulnerabilities to Address

### OWASP Top 10 Prevention

#### 1. Injection Attacks
```
Prompt Template:
"Implement [DATABASE_OPERATION] with complete protection against SQL injection:
- Use parameterized queries or prepared statements
- Validate and sanitize all inputs
- Implement input length restrictions
- Add query timeout limitations
- Include comprehensive error handling"
```

#### 2. Broken Authentication
```
Prompt Template:
"Create authentication system that prevents:
- Weak password policies
- Session fixation attacks
- Credential stuffing
- Brute force attacks
- Insecure password recovery

Include implementation of:
- Secure session management
- Multi-factor authentication
- Account lockout mechanisms
- Secure password reset flows"
```

#### 3. Sensitive Data Exposure
```
Prompt Template:
"Implement data handling for [SENSITIVE_DATA] with:
- Encryption at rest using AES-256
- Encryption in transit using TLS 1.3
- Secure key management
- Data masking in logs
- Proper data retention policies
- GDPR/CCPA compliance measures"
```

#### 4. Security Misconfiguration
```
Prompt Template:
"Create secure configuration for [COMPONENT] including:
- Secure default settings
- Unnecessary services disabled
- Security headers implementation
- Error handling that doesn't expose information
- Regular security updates process
- Configuration validation"
```

## Secure Code Review Prompts

### Security Analysis Template
```
Please perform a security analysis of this code:

[CODE_TO_REVIEW]

Focus Areas:
1. Input validation and sanitization
2. Authentication and authorization
3. Data encryption and protection
4. Error handling and information disclosure
5. Logging and monitoring
6. Dependencies and third-party libraries

Provide:
- Specific vulnerability identification
- Risk assessment (Critical/High/Medium/Low)
- Detailed remediation steps
- Security test recommendations
- Compliance considerations
```

### Penetration Testing Prompts
```
Create security tests for [COMPONENT] that validate protection against:

Attack Vectors:
- SQL injection attempts
- XSS payloads
- CSRF attacks
- Authentication bypass
- Authorization escalation
- Input fuzzing
- Rate limit testing

Test Implementation:
- Automated security test suite
- Integration with CI/CD pipeline
- Security regression tests
- Performance impact assessment
- False positive handling
```

## Environment-Specific Security

### Development Environment
```
Secure Development Setup:
- Use environment variables for secrets
- Implement local security scanning
- Set up secure Git hooks
- Configure development VPN access
- Enable security logging

Request AI help with:
"Set up secure local development environment for [PROJECT] including secret management, security scanning, and secure communication protocols."
```

### Production Environment  
```
Production Security Checklist:
- Enable comprehensive audit logging
- Implement intrusion detection
- Configure security monitoring
- Set up automated vulnerability scanning
- Enable real-time threat detection

Request AI help with:
"Create production security monitoring setup for [APPLICATION] including threat detection, incident response automation, and compliance reporting."
```

## Security Testing Integration

### Automated Security Testing
```
"Implement automated security testing pipeline that includes:

Static Analysis:
- Code vulnerability scanning
- Dependency vulnerability checks
- Configuration security validation
- Secrets detection in code

Dynamic Analysis:
- Runtime vulnerability testing
- API security testing
- Authentication testing
- Authorization testing

Integration:
- CI/CD pipeline integration
- Automated reporting
- Failure threshold configuration
- Security gate enforcement"
```

### Manual Security Testing
```
"Create manual security testing procedures for:

Security Test Cases:
- Authentication mechanism testing
- Authorization boundary testing
- Input validation testing
- Session management testing
- Business logic security testing

Documentation:
- Test procedures and checklists
- Expected results and pass criteria
- Reporting templates
- Remediation tracking"
```

## Incident Response and Monitoring

### Security Monitoring Template
```
"Implement security monitoring for [APPLICATION] including:

Monitoring Capabilities:
- Real-time threat detection
- Anomaly detection
- Failed authentication tracking
- Privilege escalation attempts
- Data access monitoring

Alerting:
- Critical security event alerts
- Threshold-based notifications
- Integration with incident response
- Automated response triggers

Compliance:
- Audit log generation
- Compliance reporting
- Data retention policies
- Regular security assessments"
```

### Incident Response Template
```
"Create incident response procedures for security events:

Response Procedures:
- Incident classification and prioritization
- Automated containment procedures
- Evidence collection and preservation
- Communication protocols
- Recovery and lessons learned

Implementation:
- Automated response triggers
- Integration with monitoring systems
- Documentation and reporting
- Regular testing and updates"
```

## Compliance and Regulatory Requirements

### GDPR Compliance Template
```
"Implement GDPR compliance features for [DATA_HANDLING]:

Privacy Requirements:
- Consent management
- Data subject rights (access, rectification, erasure)
- Data portability
- Privacy by design
- Data protection impact assessments

Technical Implementation:
- Data encryption and anonymization
- Audit logging and monitoring
- Data retention management
- Cross-border data transfer controls
- Breach notification procedures"
```

### Industry-Specific Compliance
```
"Implement [COMPLIANCE_STANDARD] compliance for:

Regulatory Requirements:
- [Specific requirement 1]
- [Specific requirement 2]
- [Specific requirement 3]

Technical Controls:
- Access controls and authentication
- Data encryption and protection
- Audit logging and monitoring
- Regular security assessments
- Incident response procedures

Documentation:
- Compliance mapping
- Control implementation evidence
- Regular compliance reporting
- Audit preparation materials"
```

## Security Documentation Requirements

### Security Architecture Documentation
```
"Create security architecture documentation for [SYSTEM]:

Documentation Sections:
1. Security architecture overview
2. Threat model and risk assessment
3. Security controls implementation
4. Authentication and authorization design
5. Data protection and encryption
6. Network security architecture
7. Monitoring and incident response
8. Compliance and regulatory mapping

Include:
- Architecture diagrams
- Data flow security analysis
- Security control matrices
- Risk assessment results
- Implementation guidelines"
```

## Continuous Security Improvement

### Security Metrics and KPIs
```
"Implement security metrics tracking for:

Metrics Categories:
- Vulnerability detection and remediation times
- Security test coverage and results
- Incident response effectiveness
- Compliance audit results
- Security training and awareness

Implementation:
- Automated metrics collection
- Dashboard and reporting
- Trend analysis and alerting
- Regular security reviews
- Continuous improvement processes"
```

Remember: Security is not a one-time implementation but an ongoing process that requires constant vigilance, regular updates, and continuous improvement. AI assistance should enhance, not replace, human security expertise and judgment.
