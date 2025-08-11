# AI-Assisted Development Guide
version: "1.0.0"
last_updated: "2025-08-08"

## Overview

This guide covers AI-assisted development practices for the Dessai platform. For comprehensive platform documentation including architecture, data models, security, and operational procedures, see the **[Complete Documentation Index](../README.md)**.

## Quick Start Guide

### Getting Started with AI Assistance
1. **Understand Your Task**: Clearly define what you want to accomplish
2. **Choose the Right Persona**: Select the appropriate AI persona for your task
3. **Provide Context**: Include relevant project context and constraints
4. **Be Specific**: Use precise language and include examples when possible
5. **Review Output**: Always review and test AI-generated code before integration

### Persona Selection Guide

| Task Type | Recommended Persona | When to Use |
|-----------|-------------------|-------------|
| Feature Implementation | Code Generator | Building new features, API endpoints, components |
| Bug Fixes | Code Generator | Debugging issues, fixing broken functionality |
| Code Improvement | Refactoring Architect | Optimizing performance, improving code structure |
| Writing Tests | QA Engineer | Creating unit tests, integration tests, test strategies |
| Documentation | Technical Writer | API docs, README files, code comments |
| Security Review | Security Specialist | Security analysis, vulnerability assessment |
| Architecture Decisions | CTO Advisor | Technical strategy, system design choices |
| Business Planning | CEO Advisor | Product strategy, resource allocation |
| Design & UX | Lead Designer | Design systems, UI/UX specifications, accessibility |

## Global Behavioral Requirements

All AI personas in the Dessai project must adhere to these core behavioral requirements:

1. **Always identify the persona being used** at the start of every response
2. **Always check existing documentation** before creating new documentation
3. **Always update existing documentation** when creating comprehensive new content
4. **Never create isolated documentation** without considering the broader context
5. **Always include a suggested git commit message** in the summary when completing any request - make it concise and follow conventional commit format

These requirements ensure consistency, prevent documentation fragmentation, and maintain proper development workflow standards across all AI-assisted tasks.

### 🔴 CRITICAL: Enforcement Instructions

**MANDATORY**: Before EVERY Copilot Chat conversation, you MUST:

1. **Copy the instructions** from `.ai/COPILOT_INSTRUCTIONS.md`
2. **Paste them as the FIRST message** in any new Copilot Chat conversation  
3. **Wait for AI confirmation** that it understands and will follow the requirements
4. **Then proceed** with your actual request

**Scripts available**:
- `npm run ai:instructions` - Display instruction reminder
- `npm run ai:validate-instructions` - Validate current config

**Why this is critical**: Without this step, the AI will not automatically follow our behavioral requirements, leading to inconsistent responses, missing documentation updates, and improper workflow standards.

**No exceptions**: This applies to ALL team members for ALL AI interactions in this project.

### 🚀 Platform Independence & Migration

**Don't get locked into one AI platform!** This project is designed for maximum flexibility:

- **[AI Migration Guide](../.ai/AI_MIGRATION_GUIDE.md)**: Complete guide for moving to any AI coding agent (ChatGPT, Claude, Cursor, Codeium, etc.)
- **[15-Minute Migration Checklist](../.ai/MIGRATION_CHECKLIST.md)**: Quick checklist to migrate to any platform while preserving behavioral standards
- **Universal Templates**: All our instructions work across different AI platforms

**Why this matters**: AI platforms change rapidly. Your workflow should be portable, your standards should be consistent, and your team should be able to adapt to new technologies without losing productivity.

## Effective Prompting Techniques

### Chain of Thought Prompting
Use for complex problems that require step-by-step reasoning:

```
I need to implement a secure user authentication system. Let me think through this step by step:

1. First, identify the authentication requirements: JWT tokens, password hashing, session management
2. Then, design the database schema for users and sessions
3. Next, implement the authentication middleware and routes
4. Finally, add proper error handling and security measures

Please help me implement each step with production-ready code.
```

### Few-Shot Prompting
Provide examples of what you want:

```
I need to create API error responses following this pattern:

Success response:
{
  "data": { "user": { "id": "123", "name": "John" } },
  "meta": { "timestamp": "2025-01-01T00:00:00Z" }
}

Error response:
{
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Invalid email format",
    "details": { "field": "email", "value": "invalid-email" }
  },
  "meta": { "timestamp": "2025-01-01T00:00:00Z" }
}

Please create similar responses for user creation endpoints.
```

### Tree of Thoughts
For architectural decisions or complex problem-solving:

```
I need to choose between three approaches for real-time features:

Approach A: WebSockets
- Pros: Real-time bidirectional communication
- Cons: Complex scaling, connection management

Approach B: Server-Sent Events (SSE)
- Pros: Simpler implementation, HTTP-based
- Cons: One-way communication only

Approach C: Polling
- Pros: Simple, reliable
- Cons: Not truly real-time, higher server load

Given our requirements for [specific needs], which approach would you recommend and why? Please provide implementation examples.
```

### Context Optimization
Provide just enough context to get accurate results:

```
Project: Online testing platform (React + Node.js + TypeScript)
Task: Create a code editor component for programming challenges
Requirements:
- Syntax highlighting for multiple languages
- Auto-save functionality
- Execution time limits
- Monaco Editor integration

Constraints:
- Must work with our existing React + MUI setup
- Should integrate with our WebSocket system for real-time collaboration
- Needs to handle large code files efficiently

Please provide a complete implementation.
```

## Prompt Templates by Task Type

### Feature Implementation
```
**Context**: [Project description and relevant technical details]

**Feature**: [Clear description of what needs to be built]

**Requirements**:
- [Functional requirement 1]
- [Functional requirement 2]
- [Performance requirement]
- [Security requirement]

**Technical Constraints**:
- Technology stack: [List technologies]
- Integration points: [List systems to integrate with]
- Design patterns: [Any specific patterns to follow]

**Acceptance Criteria**:
- [ ] [Criterion 1]
- [ ] [Criterion 2]
- [ ] [Criterion 3]

Please provide:
1. Complete implementation with error handling
2. Unit tests with good coverage
3. Documentation and usage examples
4. Integration considerations
```

### Code Review and Improvement
```
**Code to Review**: [Paste code here]

**Context**: [Explanation of what the code does and its purpose]

**Review Focus**:
- [ ] Code quality and readability
- [ ] Performance optimization
- [ ] Security considerations
- [ ] Error handling
- [ ] Test coverage
- [ ] Design patterns adherence

**Specific Concerns**: [Any particular areas of concern]

Please provide:
1. Detailed analysis of potential issues
2. Specific improvement suggestions with code examples
3. Refactored version if significant changes needed
4. Additional tests if coverage is insufficient
```

### Bug Investigation
```
**Bug Description**: [Clear description of the issue]

**Expected Behavior**: [What should happen]

**Actual Behavior**: [What actually happens]

**Reproduction Steps**:
1. [Step 1]
2. [Step 2]
3. [Step 3]

**Environment**:
- OS: [Operating system]
- Browser/Runtime: [Browser or Node.js version]
- Dependencies: [Relevant package versions]

**Error Messages/Logs**: [Any error messages or log output]

**Code Context**: [Relevant code sections]

Please help me:
1. Identify the root cause
2. Provide a fix with explanation
3. Suggest tests to prevent regression
4. Recommend any broader improvements
```

### Testing Strategy
```
**Component/Feature to Test**: [What needs testing]

**Testing Scope**:
- [ ] Unit tests
- [ ] Integration tests
- [ ] End-to-end tests
- [ ] Performance tests
- [ ] Security tests

**Test Requirements**:
- Coverage target: [X%]
- Testing framework: [Framework name]
- Mock requirements: [External dependencies to mock]

**Critical Scenarios**:
- [Happy path scenario 1]
- [Error scenario 1]
- [Edge case 1]

Please provide:
1. Comprehensive test strategy
2. Test implementation with examples
3. Test data setup and teardown
4. Mock configurations if needed
```

## Common Anti-Patterns to Avoid

### Vague Requests
❌ **Bad**: "Make this code better"
✅ **Good**: "Improve this function's performance and add proper error handling for the database operations"

### Insufficient Context
❌ **Bad**: "Create a login function"
✅ **Good**: "Create a JWT-based login function for our React app that integrates with our Express API and handles validation errors gracefully"

### Asking for Too Much at Once
❌ **Bad**: "Build the entire user management system with authentication, authorization, CRUD operations, and admin panel"
✅ **Good**: "First, let's implement the user authentication service with JWT tokens. I'll ask for the authorization middleware in the next request."

### Not Specifying Quality Requirements
❌ **Bad**: "Write some tests for this function"
✅ **Good**: "Write comprehensive unit tests for this function covering happy paths, error cases, and edge cases with at least 90% code coverage"

## Advanced Techniques

### Iterative Refinement
Start with a basic request and refine based on the output:

1. **Initial Request**: "Create a basic user registration endpoint"
2. **Refinement 1**: "Add input validation and email verification to the registration"
3. **Refinement 2**: "Add rate limiting and security headers"
4. **Refinement 3**: "Add comprehensive logging and monitoring"

### Context Building
Build context progressively for complex features:

1. **Architecture Discussion**: Ask for architectural advice first
2. **Interface Design**: Define APIs and data structures
3. **Implementation**: Request specific implementations
4. **Testing**: Add comprehensive test coverage
5. **Documentation**: Generate user and technical documentation

### Multi-Persona Collaboration
Use different personas for different aspects of the same task:

1. **CTO Advisor**: "What's the best architecture for a real-time collaborative code editor?"
2. **Code Generator**: "Implement the WebSocket connection handling for the code editor"
3. **Security Specialist**: "Review this code editor implementation for security vulnerabilities"
4. **QA Engineer**: "Create a comprehensive test suite for the code editor"
5. **Technical Writer**: "Generate documentation for the code editor API"

## Token Optimization Strategies

### Use References Instead of Repeating Context
Instead of pasting the same code multiple times, use references:
```
"Referring to the UserService class we discussed earlier, please add a method for password reset functionality"
```

### Batch Related Requests
Instead of multiple small requests, combine related tasks:
```
"For the user authentication system, please provide:
1. Login endpoint implementation
2. JWT token validation middleware  
3. Password reset functionality
4. Unit tests for all three components"
```

### Use Templates and Shortcuts
Save commonly used prompts as templates and reference project patterns:
```
"Using the standard controller pattern from our project, create a new AssessmentController with CRUD operations"
```

### Leverage Context Caching
Build on previous conversations and reference earlier decisions:
```
"Based on the database schema we designed earlier, implement the repository layer for user management"
```

## Quality Assurance Checklist

Before integrating AI-generated code, ensure:

- [ ] Code follows project coding standards
- [ ] All inputs are validated and sanitized
- [ ] Error handling is comprehensive and appropriate
- [ ] Security best practices are implemented
- [ ] Performance considerations are addressed
- [ ] Tests are included and cover edge cases
- [ ] Documentation is clear and complete
- [ ] Integration points are properly handled
- [ ] Logging and monitoring are included
- [ ] Code is reviewed by at least one human developer

## Troubleshooting Common Issues

### AI Generated Non-Functional Code
- **Problem**: Code doesn't compile or run
- **Solution**: Provide more specific technical context, include dependency versions, and ask for complete implementations

### Inconsistent with Project Patterns
- **Problem**: Generated code doesn't match project conventions
- **Solution**: Include specific examples from your codebase and reference your coding standards document

### Missing Error Handling
- **Problem**: AI generates happy-path-only code
- **Solution**: Explicitly request comprehensive error handling and provide examples of expected error scenarios

### Insufficient Test Coverage
- **Problem**: Tests don't cover edge cases or error conditions
- **Solution**: Specify coverage requirements and provide examples of edge cases specific to your domain

### Over-Engineering
- **Problem**: AI provides unnecessarily complex solutions
- **Solution**: Emphasize simplicity, provide constraints, and ask for the minimal viable implementation first

Remember: AI is a powerful assistant, but human judgment and review are essential for production-quality software.
