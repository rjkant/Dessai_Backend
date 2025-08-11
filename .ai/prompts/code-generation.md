# Code Generation Prompt Templates
version: "1.0.0"
category: "code-generation"

## Template: Feature Implementation
```
Context: I need to implement [FEATURE_NAME] for [PROJECT_CONTEXT]

Requirements:
- [REQUIREMENT_1]
- [REQUIREMENT_2]
- [REQUIREMENT_3]

Technical Constraints:
- Technology stack: [TECH_STACK]
- Performance requirements: [PERFORMANCE_REQS]
- Security considerations: [SECURITY_REQS]

Please provide:
1. Implementation code with comprehensive error handling
2. Unit tests with good coverage
3. Documentation and comments
4. Integration considerations

Additional context: [ADDITIONAL_CONTEXT]
```

## Template: API Endpoint Creation
```
Create a REST API endpoint for [OPERATION] with the following specifications:

Endpoint: [HTTP_METHOD] [ENDPOINT_PATH]
Purpose: [BRIEF_DESCRIPTION]

Request Format:
- Headers: [REQUIRED_HEADERS]
- Parameters: [PATH_PARAMS]
- Body: [REQUEST_SCHEMA]

Response Format:
- Success (200): [SUCCESS_SCHEMA]
- Error (4xx/5xx): [ERROR_SCHEMA]

Requirements:
- Input validation and sanitization
- Proper error handling and status codes
- Authentication/authorization checks
- Logging and monitoring hooks
- OpenAPI/Swagger documentation

Technology: [FRAMEWORK/LANGUAGE]
```

## Template: Database Schema Design
```
Design a database schema for [ENTITY/DOMAIN] with these requirements:

Entities:
- [ENTITY_1]: [DESCRIPTION and KEY ATTRIBUTES]
- [ENTITY_2]: [DESCRIPTION and KEY ATTRIBUTES]
- [ENTITY_3]: [DESCRIPTION and KEY ATTRIBUTES]

Relationships:
- [ENTITY_A] -> [ENTITY_B]: [RELATIONSHIP_TYPE and CARDINALITY]

Constraints:
- Business rules: [BUSINESS_CONSTRAINTS]
- Performance requirements: [PERFORMANCE_NEEDS]
- Data integrity rules: [INTEGRITY_CONSTRAINTS]

Please provide:
1. Database schema (DDL statements)
2. Indexes for optimal query performance
3. Sample data for testing
4. Migration scripts if updating existing schema

Database: [DATABASE_TYPE]
```

## Template: Component/Class Design
```
Create a [COMPONENT_TYPE] for [PURPOSE] with the following specifications:

Functionality:
- [FUNCTION_1]: [DESCRIPTION]
- [FUNCTION_2]: [DESCRIPTION]
- [FUNCTION_3]: [DESCRIPTION]

Interface Requirements:
- Input parameters: [INPUTS]
- Return values: [OUTPUTS]
- Error conditions: [ERROR_SCENARIOS]

Design Constraints:
- Design patterns: [APPLICABLE_PATTERNS]
- Performance considerations: [PERFORMANCE_REQS]
- Thread safety: [CONCURRENCY_REQS]

Please include:
1. Clean, well-documented implementation
2. Comprehensive unit tests
3. Usage examples
4. Error handling strategy

Language/Framework: [TECH_DETAILS]
```

## Template: Algorithm Implementation
```
Implement an algorithm for [PROBLEM_DESCRIPTION] with these specifications:

Problem Statement: [DETAILED_PROBLEM_DESCRIPTION]

Input: [INPUT_FORMAT_AND_CONSTRAINTS]
Output: [OUTPUT_FORMAT_AND_REQUIREMENTS]

Constraints:
- Time complexity: [TIME_REQUIREMENTS]
- Space complexity: [SPACE_REQUIREMENTS]
- Edge cases: [EDGE_CASE_SCENARIOS]

Please provide:
1. Optimized algorithm implementation
2. Explanation of approach and complexity analysis
3. Test cases covering edge cases
4. Alternative approaches if applicable

Language: [PROGRAMMING_LANGUAGE]
```

## Template: Integration Implementation
```
Implement integration with [EXTERNAL_SERVICE] for [PURPOSE]

Integration Requirements:
- Service endpoint: [API_ENDPOINT]
- Authentication: [AUTH_METHOD]
- Data format: [DATA_FORMAT]
- Rate limits: [RATE_LIMITING]

Implementation Needs:
- Connection handling and pooling
- Retry logic with exponential backoff
- Circuit breaker pattern for resilience
- Comprehensive error handling
- Monitoring and logging
- Configuration management

Success Criteria:
- [CRITERION_1]
- [CRITERION_2]
- [CRITERION_3]

Please include configuration, implementation, tests, and documentation.
```

## Best Practices for Using Templates

### Template Customization
1. Replace bracketed placeholders with specific values
2. Add project-specific context and constraints
3. Include relevant business logic requirements
4. Specify quality and performance standards

### Context Enhancement
- Include relevant code examples from the project
- Reference existing patterns and conventions
- Specify integration points with existing systems
- Provide domain-specific terminology and concepts

### Quality Requirements
- Always request comprehensive error handling
- Ask for appropriate logging and monitoring
- Require unit tests with good coverage
- Request documentation and code comments

### Token Optimization
- Use specific, concise language
- Reference existing project context when possible
- Focus on essential requirements and constraints
- Batch related requests when appropriate
