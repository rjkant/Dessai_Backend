# Documentation Prompt Templates
version: "1.0.0"
category: "documentation"

## Template: API Documentation
```
Generate comprehensive API documentation for [API_NAME] with the following structure:

API Overview:
- Purpose and scope: [BRIEF_DESCRIPTION]
- Base URL: [BASE_URL]
- Authentication: [AUTH_METHOD]
- Rate limiting: [RATE_LIMITS]

For each endpoint, include:
- HTTP method and path
- Description and use cases
- Request parameters (path, query, headers, body)
- Response format and status codes
- Error responses and handling
- Code examples in [PROGRAMMING_LANGUAGES]
- Rate limiting and authentication requirements

Endpoints to document:
- [ENDPOINT_1]: [BRIEF_DESCRIPTION]
- [ENDPOINT_2]: [BRIEF_DESCRIPTION]
- [ENDPOINT_3]: [BRIEF_DESCRIPTION]

Additional sections:
- Getting started guide
- Authentication setup
- Error handling patterns
- SDK/library information
- Changelog and versioning

Format: [OpenAPI/Swagger, Markdown, etc.]
```

## Template: Code Documentation
```
Create inline documentation for [CODE_COMPONENT] following these guidelines:

Component Details:
- File/module: [FILE_PATH]
- Purpose: [COMPONENT_PURPOSE]
- Dependencies: [KEY_DEPENDENCIES]

Documentation Requirements:
1. Class/function headers with:
   - Purpose and behavior
   - Parameter descriptions and types
   - Return value details
   - Error conditions and exceptions
   - Usage examples

2. Inline comments for:
   - Complex business logic
   - Non-obvious algorithms
   - Important assumptions
   - Side effects and warnings

3. Module-level documentation:
   - Overview and responsibility
   - Key classes and functions
   - Usage patterns and examples
   - Integration points

Style Guide:
- Follow [DOCUMENTATION_STANDARD] format
- Use clear, concise language
- Include practical examples
- Cross-reference related components

Target Audience: [DEVELOPER_LEVEL]
```

## Template: Architecture Documentation
```
Document the architecture for [SYSTEM_NAME] including:

System Overview:
- Purpose and business context
- Key stakeholders and users
- High-level capabilities and constraints

Architecture Components:
- System boundaries and interfaces
- Major components and their responsibilities
- Data flow and processing patterns
- Technology stack and deployment model

Detailed Sections:
1. **System Context**: External systems and integrations
2. **Component Architecture**: Internal component design
3. **Data Architecture**: Data models and storage systems
4. **Security Architecture**: Authentication, authorization, and data protection
5. **Deployment Architecture**: Infrastructure and operational concerns
6. **Decision Records**: Key architectural decisions and rationale

For each component, include:
- Purpose and responsibilities
- Key interfaces and contracts
- Technology choices and rationale
- Scalability and performance characteristics
- Monitoring and operational concerns

Diagrams Needed:
- System context diagram
- Component architecture diagram
- Data flow diagram
- Deployment diagram

Audience: [TECHNICAL_AUDIENCE]
Output Format: [Markdown, Confluence, etc.]
```

## Template: User Guide Creation
```
Create a user guide for [FEATURE/PRODUCT] targeting [USER_TYPE]:

Guide Structure:
1. **Getting Started**
   - Prerequisites and requirements
   - Installation/setup process
   - Quick start tutorial
   - First successful use case

2. **Core Features**
   - [FEATURE_1]: Step-by-step instructions with screenshots
   - [FEATURE_2]: Common workflows and best practices
   - [FEATURE_3]: Advanced usage scenarios

3. **Configuration and Customization**
   - Configuration options and their effects
   - Customization possibilities
   - Integration with other tools

4. **Troubleshooting**
   - Common issues and solutions
   - Error messages and their meanings
   - How to get additional help

5. **Reference**
   - Complete feature list
   - Keyboard shortcuts and commands
   - API reference (if applicable)

Content Guidelines:
- Use clear, step-by-step instructions
- Include screenshots and examples
- Anticipate common questions
- Provide context for each action
- Link to related features and concepts

User Context:
- Technical skill level: [SKILL_LEVEL]
- Primary use cases: [USE_CASES]
- Environment: [PLATFORM/BROWSER/OS]
```

## Template: README File Creation
```
Create a comprehensive README.md for [PROJECT_NAME]:

Project Information:
- Purpose: [PROJECT_PURPOSE]
- Target audience: [INTENDED_USERS]
- Technology stack: [TECH_STACK]
- License: [LICENSE_TYPE]

README Structure:
1. **Project Title and Description**
   - Clear, compelling project description
   - Key benefits and use cases
   - Status badges (build, coverage, version)

2. **Installation and Setup**
   - Prerequisites and system requirements
   - Step-by-step installation instructions
   - Configuration and environment setup
   - Verification steps

3. **Usage Examples**
   - Basic usage scenarios with code examples
   - Common workflows and patterns
   - Configuration options
   - Link to detailed documentation

4. **Development Setup**
   - Development environment setup
   - Build and test instructions
   - Contribution guidelines
   - Code style and standards

5. **Additional Information**
   - Architecture overview
   - Performance characteristics
   - Known limitations
   - Roadmap and future plans
   - Support and community information

Style Requirements:
- Use clear headings and structure
- Include code examples with syntax highlighting
- Add relevant badges and shields
- Use screenshots for complex UI elements
- Keep it concise but comprehensive
```

## Template: Release Notes
```
Generate release notes for [PROJECT_NAME] version [VERSION]:

Release Information:
- Version: [VERSION_NUMBER]
- Release date: [RELEASE_DATE]
- Release type: [Major/Minor/Patch]

Changes to Document:
- New features: [LIST_OF_FEATURES]
- Bug fixes: [LIST_OF_FIXES]
- Breaking changes: [BREAKING_CHANGES]
- Deprecated features: [DEPRECATIONS]
- Performance improvements: [PERFORMANCE_CHANGES]
- Security updates: [SECURITY_FIXES]

Format Requirements:
1. **Summary**: High-level overview of the release
2. **New Features**: Detailed descriptions with examples
3. **Improvements**: Performance and usability enhancements
4. **Bug Fixes**: Issues resolved in this release
5. **Breaking Changes**: Changes that may affect existing users
6. **Migration Guide**: Steps for upgrading from previous version
7. **Known Issues**: Limitations or issues in this release

For each item, include:
- Clear description of the change
- Impact on users and existing functionality
- Code examples where relevant
- Links to detailed documentation
- References to GitHub issues/PRs

Target Audience: [END_USERS/DEVELOPERS/BOTH]
```

## Best Practices for Documentation Templates

### Writing Guidelines
- Use active voice and present tense
- Write for your specific audience
- Include practical examples and use cases
- Keep explanations clear and concise
- Structure information logically

### Content Organization
- Use consistent heading structures
- Include table of contents for long documents
- Cross-reference related sections
- Provide both overview and detailed information
- Include search-friendly keywords

### Maintenance Considerations
- Keep documentation close to the code
- Update docs with code changes
- Review and update regularly
- Include version information
- Track documentation metrics and usage
