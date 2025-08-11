#!/usr/bin/env node

/**
 * AI Configuration Export Tool
 * Exports all AI configurations for migration to other platforms
 */

const fs = require('fs');
const path = require('path');
const yaml = require('js-yaml');

class AIConfigExporter {
  constructor() {
    this.configPath = path.join(__dirname, '../.ai/config.yaml');
    this.personasPath = path.join(__dirname, '../.ai/personas');
    this.outputPath = path.join(__dirname, '../.ai/exported-config.json');
  }

  loadConfig() {
    try {
      const configContent = fs.readFileSync(this.configPath, 'utf8');
      return yaml.load(configContent);
    } catch (error) {
      console.error('❌ Failed to load config:', error.message);
      return null;
    }
  }

  loadPersonas() {
    try {
      const personas = {};
      const files = fs.readdirSync(this.personasPath);
      
      files.forEach(file => {
        if (file.endsWith('.md')) {
          const content = fs.readFileSync(path.join(this.personasPath, file), 'utf8');
          const name = file.replace('.md', '');
          personas[name] = content;
        }
      });
      
      return personas;
    } catch (error) {
      console.error('❌ Failed to load personas:', error.message);
      return {};
    }
  }

  generateUniversalTemplate() {
    const config = this.loadConfig();
    if (!config) return null;

    return `SYSTEM INSTRUCTIONS FOR AI AGENT:

You are working on the Dessai AI-Native Testing Platform project.

PROJECT CONTEXT:
- TypeScript/Node.js backend with React frontend
- AI-powered online testing platform
- Microservices architecture with Docker deployment
- Emphasis on security, scalability, and AI-native development
- Repository: Drk0058/dessai, Branch: dekay-init

MANDATORY BEHAVIORAL REQUIREMENTS:
${config.ai.global_instructions.map((instruction, i) => `${i + 1}. ${instruction}`).join('\n')}

AVAILABLE PERSONAS:
${Object.entries(config.personas).map(([key, persona]) => `- ${persona.name}: ${persona.specialty}`).join('\n')}

QUALITY STANDARDS:
- Minimum 80% test coverage for new code
- Follow TypeScript strict mode and ESLint rules
- Include comprehensive error handling
- Apply security best practices
- Consider performance and scalability
- Maintain backward compatibility

Do not proceed without confirming you understand and will follow these requirements.`;
  }

  exportConfig() {
    console.log('🚀 Exporting AI configuration for migration...\n');

    const config = this.loadConfig();
    const personas = this.loadPersonas();
    const universalTemplate = this.generateUniversalTemplate();

    const exportData = {
      timestamp: new Date().toISOString(),
      project: 'Dessai AI-Native Testing Platform',
      config: config,
      personas: personas,
      universalTemplate: universalTemplate,
      platformAdaptations: {
        'github-copilot': {
          method: 'Manual paste in chat',
          instructions: 'Copy universal template to each conversation'
        },
        'cursor-ide': {
          method: 'Settings > AI Instructions',
          instructions: 'Paste universal template in system instructions'
        },
        'chatgpt': {
          method: 'Custom Instructions',
          instructions: 'Go to Settings > Personalization > Custom Instructions'
        },
        'claude': {
          method: 'Project Settings',
          instructions: 'Create project and add universal template'
        },
        'codeium': {
          method: 'Workspace Settings',
          instructions: 'Configure in IDE workspace settings'
        }
      },
      migrationChecklist: [
        'Backup current setup',
        'Install new AI agent',
        'Apply universal template',
        'Test persona identification',
        'Validate behavioral requirements',
        'Run quality checks',
        'Train team on new platform'
      ]
    };

    try {
      fs.writeFileSync(this.outputPath, JSON.stringify(exportData, null, 2));
      console.log('✅ Configuration exported to:', this.outputPath);
      console.log('\n📋 Export includes:');
      console.log('   - Global behavioral requirements');
      console.log('   - All persona definitions');
      console.log('   - Universal instruction template');
      console.log('   - Platform-specific adaptation guides');
      console.log('   - Migration checklist');
      
      console.log('\n🚀 Next steps:');
      console.log('   1. Open exported-config.json');
      console.log('   2. Copy universalTemplate for your new AI platform');
      console.log('   3. Follow platformAdaptations guide for setup');
      console.log('   4. Use migrationChecklist to verify migration');
      
    } catch (error) {
      console.error('❌ Failed to export config:', error.message);
    }
  }

  generatePlatformInstructions(platform) {
    const template = this.generateUniversalTemplate();
    
    const platformFormats = {
      'chatgpt': `Custom Instructions for ChatGPT:

[INSTRUCTIONS]
${template}

[ABOUT ME]
I'm working on the Dessai AI-Native Testing Platform, a TypeScript/Node.js project with React frontend. I need consistent AI assistance following specific behavioral requirements and persona-based interactions.`,

      'claude': `Claude Project Instructions:

${template}

Additional Context: Upload the .ai/ folder contents and project documentation for full context awareness.`,

      'cursor': JSON.stringify({
        "ai.systemInstructions": template,
        "ai.enableAutoSuggestions": true,
        "ai.contextAwareness": true
      }, null, 2)
    };

    return platformFormats[platform] || template;
  }
}

// CLI usage
if (require.main === module) {
  const exporter = new AIConfigExporter();
  
  const command = process.argv[2];
  const platform = process.argv[3];
  
  switch (command) {
    case 'export':
      exporter.exportConfig();
      break;
    case 'template':
      console.log(exporter.generateUniversalTemplate());
      break;
    case 'platform':
      if (!platform) {
        console.log('Available platforms: chatgpt, claude, cursor');
        process.exit(1);
      }
      console.log(exporter.generatePlatformInstructions(platform));
      break;
    default:
      console.log('Usage: node export-ai-config.js [export|template|platform <platform>]');
  }
}

module.exports = AIConfigExporter;
