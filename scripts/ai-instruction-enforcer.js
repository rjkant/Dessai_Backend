#!/usr/bin/env node

/**
 * AI Instruction Loader and Enforcer
 * This script ensures that AI global instructions are always loaded and enforced
 * for every Copilot Chat interaction.
 */

const fs = require('fs');
const path = require('path');
const yaml = require('js-yaml');

class AIInstructionEnforcer {
  constructor() {
    this.configPath = path.join(__dirname, '../.ai/config.yaml');
    this.personasPath = path.join(__dirname, '../.ai/personas');
    this.globalInstructions = [];
    this.loadInstructions();
  }

  loadInstructions() {
    try {
      // Load global instructions from config.yaml
      const configContent = fs.readFileSync(this.configPath, 'utf8');
      const config = yaml.load(configContent);
      
      if (config?.ai?.global_instructions) {
        this.globalInstructions = config.ai.global_instructions;
        console.log('✅ Global AI instructions loaded successfully');
        this.globalInstructions.forEach((instruction, index) => {
          console.log(`   ${index + 1}. ${instruction}`);
        });
      }
    } catch (error) {
      console.error('❌ Failed to load AI instructions:', error.message);
      process.exit(1);
    }
  }

  generateCopilotPrompt() {
    const instructionText = this.globalInstructions
      .map((instruction, index) => `${index + 1}. ${instruction}`)
      .join('\n');

    return `MANDATORY SYSTEM INSTRUCTIONS FOR ALL AI RESPONSES:

${instructionText}

These instructions MUST be followed for EVERY response, regardless of the specific request.

---

Your request: `;
  }

  validateResponse(response) {
    const violations = [];
    
    // Check if persona is identified
    if (!response.toLowerCase().includes('persona:')) {
      violations.push('Missing persona identification at start of response');
    }

    // Check if commit message is included for completed requests
    if (response.toLowerCase().includes('summary') || response.toLowerCase().includes('completed')) {
      if (!response.toLowerCase().includes('commit message') && !response.toLowerCase().includes('git commit')) {
        violations.push('Missing git commit message in summary');
      }
    }

    return violations;
  }

  createInstructionReminder() {
    const reminder = `
🔴 CRITICAL: AI BEHAVIORAL REQUIREMENTS 🔴

Before proceeding with ANY request, you MUST:
${this.globalInstructions.map((instruction, i) => `  ${i+1}. ${instruction}`).join('\n')}

Failure to follow these instructions is NOT ACCEPTABLE.
    `.trim();

    return reminder;
  }
}

// Export for use in other scripts
module.exports = AIInstructionEnforcer;

// CLI usage
if (require.main === module) {
  const enforcer = new AIInstructionEnforcer();
  
  const command = process.argv[2];
  
  switch (command) {
    case 'prompt':
      console.log(enforcer.generateCopilotPrompt());
      break;
    case 'reminder':
      console.log(enforcer.createInstructionReminder());
      break;
    case 'validate':
      enforcer.loadInstructions();
      break;
    default:
      console.log('Usage: node ai-instruction-enforcer.js [prompt|reminder|validate]');
  }
}
