# Testing Prompt Templates
version: "1.0.0"
category: "testing"

## Template: Unit Test Generation
```
Generate comprehensive unit tests for [COMPONENT_NAME] with the following specifications:

Component Details:
- Location: [FILE_PATH]
- Language: [PROGRAMMING_LANGUAGE]
- Testing framework: [TEST_FRAMEWORK]
- Mocking library: [MOCKING_LIBRARY]

Function/Method to Test: [FUNCTION_NAME]
- Purpose: [FUNCTION_PURPOSE]
- Input parameters: [PARAMETERS_WITH_TYPES]
- Return value: [RETURN_TYPE_AND_DESCRIPTION]
- Side effects: [SIDE_EFFECTS]
- Dependencies: [EXTERNAL_DEPENDENCIES]

Test Coverage Requirements:
1. **Happy Path Tests**
   - Valid inputs with expected outputs
   - Boundary value testing
   - Different input combinations

2. **Error Handling Tests**
   - Invalid input validation
   - Exception scenarios
   - Edge cases and boundary conditions

3. **Integration Points**
   - Mock external dependencies
   - Verify interaction with collaborators
   - Test state changes and side effects

4. **Performance Tests** (if applicable)
   - Response time validation
   - Memory usage constraints
   - Concurrent execution scenarios

Requirements:
- Minimum 80% code coverage
- Clear, descriptive test names
- Arrange-Act-Assert pattern
- Independent, repeatable tests
- Appropriate setup and teardown
```

## Template: Integration Test Creation
```
Create integration tests for [INTEGRATION_SCENARIO] covering:

Integration Scope:
- Components involved: [COMPONENT_LIST]
- External systems: [EXTERNAL_DEPENDENCIES]
- Data flow: [DATA_FLOW_DESCRIPTION]
- Technology stack: [TECH_STACK]

Test Scenarios:
1. **End-to-End Workflows**
   - [WORKFLOW_1]: [DESCRIPTION]
   - [WORKFLOW_2]: [DESCRIPTION]
   - [WORKFLOW_3]: [DESCRIPTION]

2. **Error Scenarios**
   - Network failures and timeouts
   - Service unavailability
   - Data corruption and invalid responses
   - Authentication and authorization failures

3. **Performance Scenarios**
   - Load testing with typical usage patterns
   - Stress testing with peak loads
   - Concurrent user scenarios
   - Resource utilization monitoring

Test Environment Requirements:
- Database setup and test data
- External service mocking/stubbing
- Environment configuration
- Monitoring and logging setup

Success Criteria:
- All critical paths validated
- Error handling verified
- Performance benchmarks met
- Security controls validated

Testing Tools: [TESTING_FRAMEWORK_AND_TOOLS]
```

## Template: Test Strategy Development
```
Develop a comprehensive test strategy for [PROJECT/FEATURE] including:

Project Context:
- Application type: [WEB_APP/API/MOBILE/DESKTOP]
- Technology stack: [TECH_STACK]
- Team size and skills: [TEAM_CONTEXT]
- Timeline constraints: [TIMELINE]

Testing Scope:
- Features to test: [FEATURE_LIST]
- Quality requirements: [QUALITY_CRITERIA]
- Performance requirements: [PERFORMANCE_TARGETS]
- Security requirements: [SECURITY_STANDARDS]

Test Types and Coverage:
1. **Unit Testing** (Target: [COVERAGE_PERCENTAGE]%)
   - Framework and tools
   - Coverage requirements
   - Test data management

2. **Integration Testing**
   - Component integration points
   - External service integrations
   - Database integration testing

3. **End-to-End Testing**
   - Critical user journeys
   - Cross-browser/platform testing
   - User acceptance scenarios

4. **Performance Testing**
   - Load and stress testing
   - Response time requirements
   - Scalability validation

5. **Security Testing**
   - Authentication and authorization
   - Input validation and sanitization
   - Data protection compliance

Test Environment Strategy:
- Development testing approach
- Staging environment requirements
- Production monitoring and testing
- Test data management strategy

Automation Strategy:
- Automated test coverage goals
- CI/CD integration requirements
- Test maintenance procedures
- Tool selection and setup

Risk Assessment:
- High-risk areas requiring extra attention
- Dependencies and external factors
- Resource and timeline constraints
- Mitigation strategies
```

## Template: Test Data Generation
```
Generate test data for [TESTING_SCENARIO] with the following requirements:

Data Requirements:
- Entity types: [ENTITY_LIST]
- Data volume: [RECORD_COUNTS]
- Data relationships: [RELATIONSHIP_DESCRIPTIONS]
- Business constraints: [BUSINESS_RULES]

Test Scenarios:
1. **Positive Test Cases**
   - Valid data combinations
   - Boundary value scenarios
   - Typical usage patterns

2. **Negative Test Cases**
   - Invalid data formats
   - Constraint violations
   - Edge cases and extremes

3. **Performance Test Cases**
   - Large dataset scenarios
   - Complex query patterns
   - Concurrent access scenarios

Data Generation Requirements:
- Realistic and meaningful data
- Privacy-compliant (no real PII)
- Consistent with domain rules
- Reproducible for test reliability

Output Format:
- Database insert statements
- JSON/XML test files
- API request payloads
- Configuration files

Tools and Constraints:
- Data generation tools: [TOOL_PREFERENCES]
- Format requirements: [DATA_FORMATS]
- Size limitations: [SIZE_CONSTRAINTS]
- Performance considerations: [PERFORMANCE_NEEDS]
```

## Template: Test Automation Framework
```
Design a test automation framework for [PROJECT_TYPE] with these specifications:

Framework Requirements:
- Testing levels: [UNIT/INTEGRATION/E2E]
- Technology stack: [TECH_STACK]
- Team skill level: [TEAM_EXPERTISE]
- Maintenance budget: [MAINTENANCE_CAPACITY]

Framework Components:
1. **Test Runner and Execution**
   - Test discovery and execution
   - Parallel test execution
   - Test result reporting
   - CI/CD integration

2. **Test Data Management**
   - Test data creation and cleanup
   - Data isolation between tests
   - External data dependencies
   - Environment-specific configurations

3. **Object/Service Abstractions**
   - Page object models (for UI tests)
   - Service layer abstractions (for API tests)
   - Database access layers
   - External service mocking

4. **Utilities and Helpers**
   - Common test utilities
   - Assertion libraries
   - Logging and debugging support
   - Screenshot and video capture

5. **Reporting and Analytics**
   - Test execution reports
   - Coverage analysis
   - Trend analysis and metrics
   - Integration with test management tools

Framework Features:
- Cross-browser/platform support
- Retry mechanisms for flaky tests
- Test categorization and tagging
- Configuration management
- Maintenance and debugging tools

Implementation Plan:
- Framework setup and configuration
- Example test implementations
- Documentation and training materials
- Migration strategy for existing tests

Tools and Technologies: [PREFERRED_TOOLS]
```

## Template: Performance Test Design
```
Design performance tests for [SYSTEM/FEATURE] covering:

Performance Requirements:
- Response time targets: [TIME_REQUIREMENTS]
- Throughput requirements: [THROUGHPUT_TARGETS]
- Concurrent user limits: [CONCURRENCY_LIMITS]
- Resource utilization limits: [RESOURCE_CONSTRAINTS]

Test Scenarios:
1. **Load Testing**
   - Normal usage patterns
   - Expected user volumes
   - Typical transaction mixes
   - Duration: [TEST_DURATION]

2. **Stress Testing**
   - Peak load conditions
   - System breaking points
   - Recovery behavior
   - Resource exhaustion scenarios

3. **Endurance Testing**
   - Extended operation periods
   - Memory leak detection
   - Performance degradation over time
   - Resource cleanup validation

4. **Spike Testing**
   - Sudden load increases
   - System responsiveness
   - Auto-scaling behavior
   - Recovery time measurement

Test Environment:
- Infrastructure specifications
- Network configuration
- Monitoring and instrumentation
- Test data requirements

Metrics to Collect:
- Response times (average, percentiles)
- Throughput and transaction rates
- Error rates and types
- Resource utilization (CPU, memory, network)
- System capacity and limits

Tools and Setup:
- Performance testing tools: [TOOL_SELECTION]
- Monitoring tools: [MONITORING_STACK]
- Test environment provisioning
- Results analysis and reporting

Success Criteria:
- Performance benchmarks met
- No critical errors under load
- System stability maintained
- Acceptable resource utilization
```

## Best Practices for Testing Templates

### Test Design Principles
- Write tests that are independent and repeatable
- Use descriptive test names that explain the scenario
- Follow the Arrange-Act-Assert pattern
- Keep tests focused on single responsibilities
- Include both positive and negative test cases

### Test Maintenance
- Keep tests simple and maintainable
- Use appropriate abstractions and page objects
- Implement robust error handling and retry logic
- Regular test review and cleanup
- Monitor test execution times and flakiness

### Test Data Management
- Use realistic but safe test data
- Implement proper test data cleanup
- Isolate tests from each other's data
- Consider data privacy and security requirements
- Use factories and builders for test data creation
