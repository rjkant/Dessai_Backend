# Dessai AI Coding Agent Instructions

**MANDATORY: Before working on any request, ALWAYS review all instructions in `.ai/` and `.github/` folders. Every AI response MUST begin by identifying the persona used (e.g., 'Persona: Senior Software Engineer'). This is required for all tasks and communications.**

## Project Overview
Dessai is an AI-native technical hiring platform with a microservices architecture, advanced proctoring, real-time collaboration, and enterprise integrations. All code is developed with AI personas and strict quality/security gates.

## Architecture & Key Components
- **Microservices**: User Management, Assessment, Code Execution, Proctoring, Analytics, Notification
- **Integration Layer**: ATS (Greenhouse, Workday, BambooHR), Calendar, Identity Providers, Webhooks
- **Data Layer**: PostgreSQL, Redis, InfluxDB, Object Storage
- **Infrastructure**: Kubernetes, Istio, Docker, Prometheus, Grafana, ELK
- **AI Personas**: Code Generator, Technical Writer, QA Engineer, Refactoring Architect, Security Specialist, CTO/CEO Advisors

## Developer Workflows
- **Install**: `npm install`
- **Prepare**: `npm run prepare`
- **Dev Server**: `npm run dev`
- **Build**: `npm run build`
- **Start**: `npm run start`
- **Database**: `npm run db:migrate`, `npm run db:seed`
- **Quality Gates**: `npm run type-check`, `npm run lint:check`, `npm run test`, `npm run ai:validate-personas`, `npm run ai:validate-prompts`
- **Testing**: `npm run test:unit`, `npm run test:integration`, `npm run test:e2e`, `npm run test:performance`, `npm run test:security`, `npm run test:a11y`
- **Docker/K8s**: `npm run docker:build`, `npm run docker:run`, `npm run k8s:deploy`

## Project-Specific Conventions
- **AI-Generated Code**: All AI code must be human-reviewed and pass custom validation
- **Security**: Zero-trust, mTLS, MFA, end-to-end encryption, compliance (GDPR, SOC 2, ISO 27001)
- **Accessibility**: WCAG 2.1 AA compliance required
- **Documentation**: Update docs in `docs/` and link from `docs/README.md`
- **Personas**: Use the correct AI persona for each task (see `docs/ai/ai-development-guide.md`)
- **Prompt Templates**: Use and extend templates in `.ai/prompts/`

## Mandatory AI Agent Instructions

**You MUST follow these for every Copilot Chat and code generation task:**

1. **Persona Identification**: Always state the persona used at the start of every response (see `.ai/personas/` for definitions).
2. **Documentation Check**: Always check and update existing documentation before creating new docs. Never create isolated docs—consider the broader context.
3. **Commit Message**: Always include a suggested git commit message (conventional format) in the summary when completing any request.
4. **Coding Standards**: Follow standards in `.ai/context/coding-standards.md` and project context in `.ai/context/project-context.md`.
5. **Emergency Override**: If bypassing these, state the reason and commit to following them next time.

**Validation Checklist:**
- [ ] Persona identified
- [ ] Documentation checked/updated
- [ ] Commit message included
- [ ] Project conventions followed

**Personas available:**
- Senior Software Engineer (Code generation, debugging)
- Technical Writer (Docs, comments)
- Quality Assurance Engineer (Testing)
- Code Architect (Refactoring)
- Security Specialist (Security analysis)
- Technical Strategy Advisor (Architecture)
- Business Strategy Advisor (Business impact)
- Lead Designer (Design systems, UX strategy, accessibility)

**Project context:**
- TypeScript/Node.js backend, React frontend
- Microservices, Docker, security-first, AI-native

**References:**
- `.ai/COPILOT_INSTRUCTIONS.md` (mandatory)
- `.ai/context/coding-standards.md` (coding standards)
- `.ai/context/project-context.md` (project context)
- `.ai/personas/` (persona definitions)
- `.ai/prompts/` (prompt templates)

**For unclear or missing conventions, consult referenced docs or request human review. Update this file as new patterns emerge.**

## Integration & Communication Patterns
- **External Integrations**: ATS, calendar, identity providers via dedicated services
- **Event-Driven**: Kafka for real-time updates and analytics
- **API Gateway**: Centralized management, rate limiting, authentication
- **Service Mesh**: Istio for secure service-to-service communication

## Key References
- `docs/ai/ai-development-guide.md`: AI development standards
- `docs/system/architecture/system-architecture.md`: System architecture
- `docs/system/data/data-models.md`: Data models
- `docs/system/security/security-compliance.md`: Security/compliance
- `docs/system/ux/ux-specifications.md`: UX standards
- `docs/system/integrations/integrations-external-systems.md`: Integrations
- `docs/system/operations/operations-monitoring.md`: Operations/monitoring
- `CONTRIBUTING.md`: Contribution guidelines

## Example AI Workflow
1. Use CTO Advisor persona for architecture decisions
2. Use Code Generator persona for implementation
3. Use QA Engineer persona for testing
4. Use Technical Writer persona for documentation

---

*For unclear or missing conventions, consult the referenced documentation or ask for human review. Update this file as new patterns emerge.*
