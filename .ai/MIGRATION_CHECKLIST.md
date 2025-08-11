# 🚀 Quick Migration Checklist

Use this checklist when migrating to any new AI coding agent or platform.

## ⏱️ 15-Minute Migration Process

### Step 1: Backup Current Setup (2 min)
- [ ] Export current AI conversation history
- [ ] Save custom prompts and templates  
- [ ] Document current workflow preferences
- [ ] Note any custom integrations or scripts

### Step 2: Platform Setup (5 min)
- [ ] Install new AI agent/extension
- [ ] Create account and configure basic settings
- [ ] Import project context (upload docs, connect to repo)
- [ ] Configure IDE integration if applicable

### Step 3: Apply Universal Instructions (3 min)
- [ ] Copy universal template from `AI_MIGRATION_GUIDE.md`
- [ ] Paste into new platform's system instructions/settings
- [ ] Adapt template format for specific platform syntax
- [ ] Save configuration

### Step 4: Validation Test (3 min)
- [ ] Test with simple request: "Help me understand the project structure"
- [ ] Verify persona identification in response
- [ ] Check if documentation checking behavior works
- [ ] Confirm git commit message is included
- [ ] Validate response quality and accuracy

### Step 5: Team Rollout (2 min)
- [ ] Share migration results with team
- [ ] Update team documentation with new platform info
- [ ] Schedule team training if needed
- [ ] Monitor initial adoption

## 🎯 Platform-Specific Quick Setup

### Cursor IDE (1 min)
```bash
# Paste in Settings > AI Instructions
[Universal template from migration guide]
```

### ChatGPT (1 min)
```bash
# Go to Settings > Personalization > Custom Instructions
# Paste universal template in "Instructions" section
```

### Claude (1 min)
```bash
# Create new Project
# Paste universal template in Project Instructions
# Upload .ai/ folder contents
```

### Codeium (2 min)
```bash
# Install extension in your IDE
# Configure workspace settings
# Add instruction template to chat configuration
```

## ⚠️ Common Migration Pitfalls

- [ ] **Don't skip persona testing** - Verify each persona works correctly
- [ ] **Don't forget context** - Upload/configure project documentation access
- [ ] **Don't ignore quality checks** - Run validation tests before team rollout
- [ ] **Don't migrate mid-sprint** - Time migrations during natural break points
- [ ] **Don't abandon old platform immediately** - Keep backup access during transition

## 📊 Success Validation

After migration, verify these work correctly:

- [ ] **Persona Identification**: "Act as Technical Writer and help me document this API"
  - ✅ Should start with: "**Persona: Technical Writer**"

- [ ] **Documentation Checking**: "Create documentation for user authentication"  
  - ✅ Should check existing auth docs first

- [ ] **Git Commit Messages**: Complete any task
  - ✅ Should end with: "**Suggested git commit message:** `type: description`"

- [ ] **Quality Standards**: "Generate a REST API endpoint"
  - ✅ Should include error handling, tests, TypeScript types

- [ ] **Context Awareness**: "Following our project patterns, create..."
  - ✅ Should reference actual project structure/patterns

## 🔄 Platform Rotation Strategy

For maximum flexibility, consider rotating between platforms:

- **Primary**: Main AI agent for daily development
- **Secondary**: Backup agent for when primary is unavailable  
- **Specialized**: Specific agents for particular tasks (e.g., Claude for docs, Cursor for code)

Keep universal instructions synced across all platforms.

## 🆘 Emergency Rollback

If migration fails:

1. **Immediate**: Switch back to previous platform
2. **Document**: What didn't work and why
3. **Plan**: Address issues before next migration attempt  
4. **Communicate**: Inform team of rollback and next steps

## 📋 Migration Log Template

```
Migration Date: ___________
From: ___________
To: ___________
Duration: ___________
Issues Encountered: ___________
Success Rate: ___________
Team Feedback: ___________
Rollback Plan: ___________
Next Steps: ___________
```

---

**Keep this checklist handy** - You should be able to migrate to any new AI platform in under 15 minutes while maintaining all behavioral requirements and quality standards.
