# Contribution Guidelines for AI-Native Development
version: "1.0.0"
last_updated: "2025-08-08"
 
## Overview
This document outlines the contribution guidelines for our AI-native development workflow. All contributors must follow these guidelines to ensure consistent code quality, security, and maintainability.

**📚 For comprehensive platform documentation including architecture, data models, security, and operational procedures, see the [Complete Documentation Index](docs/README.md).**

## AI-Assisted Development Workflow

### 🔴 MANDATORY FIRST STEP: AI Instruction Setup

**BEFORE ANY AI INTERACTION**, you MUST:

1. **Open** `.ai/COPILOT_INSTRUCTIONS.md`
2. **Copy** the instruction block (between the ``` marks)
3. **Paste** it as the FIRST message in EVERY new Copilot Chat conversation
4. **Wait** for AI confirmation it will follow the requirements
5. **Then proceed** with your actual development task

**This is NOT optional** - it ensures consistent AI behavior and prevents workflow violations.

### 1. Before You Start
- [ ] **🔴 CRITICAL**: Set up AI instructions (see above)
- [ ] Review the AI development guide (`docs/ai/ai-development-guide.md`)
- [ ] Understand the security best practices (`docs/ai/security-best-practices.md`)
- [ ] Familiarize yourself with the project context (`/.ai/context/project-context.md`)
- [ ] Choose the appropriate AI persona for your task

### 2. Development Process
1. **Create a Feature Branch**: Use descriptive branch names with prefixes
   ```bash
   git checkout -b feature/ai-real-time-collaboration
   git checkout -b bugfix/ai-authentication-issue
   git checkout -b docs/ai-update-user-guide
   ```

2. **Use AI Assistance Properly**:
   - Always provide sufficient context in your prompts
   - Use the appropriate AI persona for the task
   - Include relevant project information and constraints
   - Request comprehensive error handling and testing

3. **Human Review Process**:
   - All AI-generated code must be reviewed by a human before commit
   - Add `@human-reviewed` comment to AI-generated code
   - Ensure the code follows project standards and conventions
   - Test the functionality thoroughly

4. **Mandatory Pre-Commit Validation**:
   ```bash
   # Run before every commit to ensure compliance
   npm run ai:validate-personas
   npm run ai:validate-prompts
   npm run lint:check
   npm run test
   npm run pre-commit
   ```

4. **Commit Messages**:
   ```bash
   # For AI-assisted commits
   git commit -m "AI: Implement real-time collaboration feature [human-reviewed]"
   git commit -m "AI: Fix authentication bug with special characters [human-reviewed]"
   
   # For human-only commits
   git commit -m "feat: Add user profile validation"
   git commit -m "fix: Resolve memory leak in session management"
   ```

### 3. Quality Standards

#### Code Quality
- All code must pass ESLint and Prettier checks
- TypeScript strict mode must be enabled
- Minimum 80% test coverage for new code
- No security vulnerabilities in static analysis
- Comprehensive error handling and logging

#### AI-Generated Code Requirements
- Must be reviewed and approved by at least one human developer
- Should include comprehensive unit tests
- Must follow project coding standards exactly
- Should include detailed comments explaining complex logic
- Must pass all security scans and quality gates

#### Documentation Requirements
- All new features require updated documentation
- API changes must include OpenAPI/Swagger updates
- Complex algorithms need explanatory comments
- Architecture changes require ADR (Architecture Decision Record)

## Pull Request Process

### 1. PR Creation Checklist
- [ ] Branch is up to date with the target branch
- [ ] All tests pass locally
- [ ] Code has been formatted and linted
- [ ] Security scan passes
- [ ] Documentation is updated
- [ ] AI-generated code is marked and reviewed

### 2. PR Title and Description
```markdown
## PR Title Format
- `[AI Feature] Implement real-time collaboration system`
- `[AI Fix] Resolve JWT authentication with special characters`
- `[Human] Add user input validation helpers`

## PR Description Template
### Description
Brief description of the changes and why they're needed.

### AI Assistance Used
- [ ] AI-generated code (specify which persona)
- [ ] AI-assisted debugging
- [ ] AI-generated tests
- [ ] AI-generated documentation
- [ ] Human review completed
- [ ] Persona identified in all responses
- [ ] Validation checklist completed

### Changes Made
- List of specific changes
- Files modified or added
- Features added or bugs fixed

### Testing
- [ ] Unit tests added/updated
- [ ] Integration tests added/updated
- [ ] Manual testing completed
- [ ] Performance impact assessed

### Security Review
- [ ] Input validation implemented
- [ ] Authentication/authorization verified
- [ ] Data protection measures in place
- [ ] Security scan passed

### Documentation
- [ ] API documentation updated
- [ ] README updated if needed
- [ ] Code comments added for complex logic
- [ ] ADR created for architectural changes
```

### 3. Review Process

#### For AI-Generated Code
1. **Technical Review**: Code functionality, performance, and integration
2. **Security Review**: Vulnerability assessment and compliance check
3. **Quality Review**: Adherence to coding standards and best practices
4. **Testing Review**: Test coverage and quality validation

#### Review Checklist
- [ ] Code follows project conventions and standards
- [ ] Security requirements are met
- [ ] Performance impact is acceptable
- [ ] Error handling is comprehensive
- [ ] Tests provide adequate coverage
- [ ] Documentation is clear and complete
- [ ] Integration points are properly handled
- [ ] Persona identified in all AI interactions
- [ ] Validation checklist completed for all changes
- [ ] Pre-commit validation scripts pass

## AI Persona Usage Guidelines

### When to Use Each Persona

#### Code Generator
- **Use for**: Feature implementation, API development, component creation
- **Prompt pattern**: "Implement [feature] with [requirements] following our coding standards"
- **Review focus**: Logic correctness, error handling, integration

#### Documentation Writer
- **Use for**: API docs, user guides, code comments, README updates
- **Prompt pattern**: "Create documentation for [component] targeting [audience]"
- **Review focus**: Accuracy, completeness, clarity

#### QA Engineer
- **Use for**: Test creation, test strategy, quality validation
- **Prompt pattern**: "Create comprehensive tests for [component] covering [scenarios]"
- **Review focus**: Test coverage, edge cases, maintainability

#### Security Specialist
- **Use for**: Security reviews, vulnerability assessment, secure coding
- **Prompt pattern**: "Review [code] for security vulnerabilities and provide fixes"
- **Review focus**: Security best practices, compliance, risk assessment

#### Refactoring Architect
- **Use for**: Code optimization, architecture improvements, tech debt
- **Prompt pattern**: "Refactor [component] to improve [aspect] while maintaining [constraints]"
- **Review focus**: Performance impact, maintainability, backward compatibility

#### CTO/CEO Advisors
- **Use for**: Strategic decisions, architecture choices, business alignment
- **Prompt pattern**: "Analyze [decision] considering [business context] and provide recommendation"
- **Review focus**: Strategic alignment, long-term impact, resource implications

## Code Review Standards

### Review Criteria

#### Functionality
- Code works as intended
- Edge cases are handled appropriately
- Integration points function correctly
- Performance meets requirements

#### Security
- Input validation is comprehensive
- Authentication/authorization is proper
- Sensitive data is protected
- Security best practices are followed

#### Quality
- Code is readable and maintainable
- Follows project conventions
- Has appropriate error handling
- Includes necessary logging

#### Testing
- Unit tests cover happy path and edge cases
- Integration tests validate system interactions
- Test quality is high and maintainable
- Coverage meets project requirements

### Review Process

1. **Automated Checks**: All CI/CD pipeline checks must pass
2. **Human Review**: At least one approval from a team member
3. **Security Review**: Security specialist approval for sensitive changes
4. **Architecture Review**: Architect approval for significant changes

## Common Anti-Patterns to Avoid

### AI Usage Anti-Patterns
❌ **Blind Trust**: Accepting AI output without review
❌ **Insufficient Context**: Not providing enough project context
❌ **Wrong Persona**: Using inappropriate AI persona for the task
❌ **No Testing**: Committing AI code without adequate tests
❌ **Security Neglect**: Ignoring security implications

### Code Anti-Patterns
❌ **Copy-Paste Programming**: Duplicating code instead of creating reusable functions
❌ **Magic Numbers**: Using hardcoded values without explanation
❌ **God Functions**: Creating functions that do too many things
❌ **Inconsistent Naming**: Not following project naming conventions
❌ **Missing Error Handling**: Not handling potential error conditions

## Issue and Task Management

### Issue Labels
- `ai-assisted`: Issues to be resolved with AI assistance
- `human-only`: Issues requiring human-only implementation
- `security-review`: Issues requiring security specialist review
- `architecture`: Issues affecting system architecture
- `documentation`: Documentation-related issues
- `testing`: Testing-related issues

### Issue Templates
Use the provided GitHub issue templates:
- `ai-feature-request.yml`: For new features with AI assistance
- `ai-bug-report.yml`: For bugs to be fixed with AI assistance
- Standard templates for human-only issues

## Deployment and Release Process

### Pre-Release Checklist
- [ ] All tests pass in CI/CD pipeline
- [ ] Security scans show no critical vulnerabilities
- [ ] Performance benchmarks meet requirements
- [ ] Documentation is up to date
- [ ] Human review completed for all AI-generated code
- [ ] Rollback plan is prepared

### Release Notes
Include information about:
- New features and improvements
- Bug fixes and security updates
- AI-assisted contributions and their review status
- Breaking changes and migration steps
- Known issues and workarounds

## Getting Help

### Resources
- **AI Development Guide**: `docs/ai/ai-development-guide.md`
- **Security Best Practices**: `docs/ai/security-best-practices.md`
- **Project Context**: `.ai/context/project-context.md`
- **Prompt Templates**: `.ai/prompts/`
- **Persona Definitions**: `.ai/personas/`

### Support Channels
- GitHub Discussions for general questions
- GitHub Issues for bugs and feature requests
- Team Slack/Discord for real-time collaboration
- Weekly team meetings for architecture discussions

## Code of Conduct

### AI Usage Ethics
- Use AI to enhance, not replace, human creativity and judgment
- Always validate AI-generated content for accuracy and appropriateness
- Respect intellectual property and licensing requirements
- Consider bias and fairness in AI-generated solutions
- Maintain transparency about AI assistance in contributions

### Collaboration Principles
- Be respectful and constructive in code reviews
- Provide helpful feedback and suggestions
- Share knowledge and help team members learn
- Communicate clearly about AI usage and limitations
- Take responsibility for code quality regardless of how it was generated

## Continuous Improvement

### Feedback Loop
- Regularly assess AI assistance effectiveness
- Update prompt templates based on experience
- Refine persona definitions as needed
- Improve quality gates based on learnings
- Share best practices with the team

### Learning and Development
- Stay updated with AI development best practices
- Participate in code review discussions
- Contribute to documentation improvements
- Share experiences with AI-assisted development
- Mentor new team members on AI usage

Remember: AI is a powerful tool, but human judgment, creativity, and responsibility remain essential for delivering high-quality software.
