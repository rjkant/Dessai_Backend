#!/usr/bin/env node

/**
 * Pre-commit validation for AI-native development
 * This script validates code quality, security, and AI-specific requirements
 */

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');
const chalk = require('chalk');

class PreCommitValidator {
  constructor() {
    this.errors = [];
    this.warnings = [];
  }

  log(message, type = 'info') {
    const colors = {
      info: chalk.blue,
      success: chalk.green,
      warning: chalk.yellow,
      error: chalk.red
    };
    console.log(colors[type](`[${type.toUpperCase()}] ${message}`));
  }

  async validateStagedFiles() {
    try {
      const stagedFiles = execSync('git diff --cached --name-only', { encoding: 'utf-8' })
        .split('\n')
        .filter(file => file.trim() && fs.existsSync(file));

      if (stagedFiles.length === 0) {
        this.log('No staged files to validate', 'info');
        return true;
      }

      this.log(`Validating ${stagedFiles.length} staged files...`, 'info');

      // Run all validation checks
      await this.checkCodeQuality(stagedFiles);
      await this.checkSecurity(stagedFiles);
      await this.checkAISpecificRequirements(stagedFiles);
      await this.checkDocumentation(stagedFiles);
      await this.checkTesting(stagedFiles);

      // Report results
      if (this.errors.length > 0) {
        this.log('\n❌ Pre-commit validation failed:', 'error');
        this.errors.forEach(error => this.log(`  • ${error}`, 'error'));
        return false;
      }

      if (this.warnings.length > 0) {
        this.log('\n⚠️  Warnings:', 'warning');
        this.warnings.forEach(warning => this.log(`  • ${warning}`, 'warning'));
      }

      this.log('\n✅ Pre-commit validation passed!', 'success');
      return true;

    } catch (error) {
      this.log(`Validation failed: ${error.message}`, 'error');
      return false;
    }
  }

  async checkCodeQuality(files) {
    const codeFiles = files.filter(file => 
      /\.(ts|tsx|js|jsx)$/.test(file) && !file.includes('node_modules')
    );

    if (codeFiles.length === 0) return;

    this.log('Checking code quality...', 'info');

    try {
      // ESLint check
      execSync(`npx eslint ${codeFiles.join(' ')}`, { stdio: 'inherit' });
    } catch (error) {
      this.errors.push('ESLint violations found. Run `npm run lint:fix` to auto-fix.');
    }

    try {
      // Prettier check
      execSync(`npx prettier --check ${codeFiles.join(' ')}`, { stdio: 'inherit' });
    } catch (error) {
      this.errors.push('Code formatting issues found. Run `npm run format` to fix.');
    }

    try {
      // TypeScript type checking
      execSync('npx tsc --noEmit', { stdio: 'inherit' });
    } catch (error) {
      this.errors.push('TypeScript type errors found. Fix type issues before committing.');
    }

    // Check for TODO/FIXME comments in production code
    codeFiles.forEach(file => {
      const content = fs.readFileSync(file, 'utf-8');
      const lines = content.split('\n');
      
      lines.forEach((line, index) => {
        if (line.includes('TODO') || line.includes('FIXME')) {
          this.warnings.push(`${file}:${index + 1} contains TODO/FIXME comment`);
        }
      });
    });
  }

  async checkSecurity(files) {
    this.log('Checking security...', 'info');

    const sensitivePatterns = [
      /password\s*=\s*['"].*['"]/i,
      /api_key\s*=\s*['"].*['"]/i,
      /secret\s*=\s*['"].*['"]/i,
      /token\s*=\s*['"].*['"]/i,
      /private_key\s*=\s*['"].*['"]/i,
      /connection_string\s*=\s*['"].*['"]/i
    ];

    files.forEach(file => {
      if (fs.existsSync(file) && !file.includes('node_modules')) {
        const content = fs.readFileSync(file, 'utf-8');
        const lines = content.split('\n');

        lines.forEach((line, index) => {
          sensitivePatterns.forEach(pattern => {
            if (pattern.test(line)) {
              this.errors.push(`${file}:${index + 1} contains potential sensitive information`);
            }
          });
        });
      }
    });

    // Check for hardcoded URLs in production
    files.forEach(file => {
      if (fs.existsSync(file) && /\.(ts|tsx|js|jsx)$/.test(file)) {
        const content = fs.readFileSync(file, 'utf-8');
        const hardcodedUrls = content.match(/https?:\/\/(?!localhost|127\.0\.0\.1|example\.com)/g);
        
        if (hardcodedUrls) {
          this.warnings.push(`${file} contains hardcoded URLs: ${hardcodedUrls.join(', ')}`);
        }
      }
    });
  }

  async checkAISpecificRequirements(files) {
    this.log('Checking AI-specific requirements...', 'info');

    // Check for AI-generated code markers
    const aiGeneratedFiles = [];
    
    files.forEach(file => {
      if (fs.existsSync(file) && /\.(ts|tsx|js|jsx|md)$/.test(file)) {
        const content = fs.readFileSync(file, 'utf-8');
        
        if (content.includes('@ai-generated') || 
            content.includes('AI-generated') || 
            content.includes('Generated by AI')) {
          aiGeneratedFiles.push(file);
        }

        // Check for persona identification in documentation and responses
        if (file.includes('.md')) {
          if (!content.includes('Persona:')) {
            this.errors.push(`${file} missing persona identification`);
          }
          if (!content.includes('Validation Checklist:')) {
            this.errors.push(`${file} missing validation checklist`);
          }
        }
      }
    });

    if (aiGeneratedFiles.length > 0) {
      this.log(`Found ${aiGeneratedFiles.length} AI-generated files`, 'info');
      
      // Check if AI-generated files have human review markers
      aiGeneratedFiles.forEach(file => {
        const content = fs.readFileSync(file, 'utf-8');
        
        if (!content.includes('@human-reviewed') && 
            !content.includes('Human-reviewed') &&
            !content.includes('Reviewed by:')) {
          this.errors.push(`${file} is AI-generated but missing human review marker`);
        }
      });

      // Ensure AI-generated code has corresponding tests
      const codeFiles = aiGeneratedFiles.filter(f => /\.(ts|tsx|js|jsx)$/.test(f));
      codeFiles.forEach(file => {
        const testFile = this.findTestFile(file);
        if (!testFile || !files.includes(testFile)) {
          this.warnings.push(`${file} is AI-generated but has no corresponding test file`);
        }
      });
    }

    // Check commit message for AI indicators
    try {
      const commitMsg = execSync('git log -1 --pretty=%B', { encoding: 'utf-8' }).trim();
      
      if (commitMsg.toLowerCase().includes('ai:') || 
          commitMsg.toLowerCase().includes('copilot') ||
          commitMsg.toLowerCase().includes('generated')) {
        
        if (!commitMsg.includes('[human-reviewed]')) {
          this.errors.push('AI-related commit must include [human-reviewed] tag');
        }
      }
    } catch (error) {
      // Ignore error if this is the initial commit
    }
  }

  async checkDocumentation(files) {
    this.log('Checking documentation...', 'info');

    const docFiles = files.filter(file => /\.(md|mdx)$/.test(file));
    
    // Check for broken markdown links
    docFiles.forEach(file => {
      if (fs.existsSync(file)) {
        const content = fs.readFileSync(file, 'utf-8');
        const links = content.match(/\[.*?\]\(.*?\)/g) || [];
        
        links.forEach(link => {
          const match = link.match(/\[.*?\]\((.*?)\)/);
          if (match && match[1]) {
            const linkPath = match[1];
            if (linkPath.startsWith('./') || linkPath.startsWith('../')) {
              const fullPath = path.resolve(path.dirname(file), linkPath);
              if (!fs.existsSync(fullPath)) {
                this.errors.push(`${file} contains broken link: ${linkPath}`);
              }
            }
          }
        });
      }
    });

    // Check for new public APIs without documentation
    const codeFiles = files.filter(file => 
      /\.(ts|tsx)$/.test(file) && !file.includes('.test.') && !file.includes('.spec.')
    );

    codeFiles.forEach(file => {
      if (fs.existsSync(file)) {
        const content = fs.readFileSync(file, 'utf-8');
        
        // Check for exported functions/classes without JSDoc
        const exportMatches = content.match(/export\s+(class|function|const)\s+\w+/g) || [];
        
        exportMatches.forEach(match => {
          const lines = content.split('\n');
          const lineIndex = lines.findIndex(line => line.includes(match));
          
          if (lineIndex > 0) {
            const prevLine = lines[lineIndex - 1];
            if (!prevLine.includes('/**') && !prevLine.includes('//')) {
              this.warnings.push(`${file} has undocumented export: ${match}`);
            }
          }
        });
      }
    });
  }

  async checkTesting(files) {
    this.log('Checking testing requirements...', 'info');

    const codeFiles = files.filter(file => 
      /\.(ts|tsx|js|jsx)$/.test(file) && 
      !file.includes('.test.') && 
      !file.includes('.spec.') &&
      !file.includes('node_modules')
    );

    // Check if new code files have corresponding tests
    codeFiles.forEach(file => {
      const testFile = this.findTestFile(file);
      
      if (!testFile) {
        this.warnings.push(`${file} has no corresponding test file`);
      } else if (!fs.existsSync(testFile)) {
        this.warnings.push(`${file} references missing test file: ${testFile}`);
      }
    });

    // Run tests if test files are being committed
    const testFiles = files.filter(file => 
      /\.(test|spec)\.(ts|tsx|js|jsx)$/.test(file)
    );

    if (testFiles.length > 0) {
      try {
        this.log('Running affected tests...', 'info');
        execSync('npm run test -- --passWithNoTests', { stdio: 'inherit' });
      } catch (error) {
        this.errors.push('Some tests are failing. Fix tests before committing.');
      }
    }
  }

  findTestFile(filePath) {
    const dir = path.dirname(filePath);
    const fileName = path.basename(filePath, path.extname(filePath));
    const ext = path.extname(filePath);
    
    const possibleTestFiles = [
      path.join(dir, `${fileName}.test${ext}`),
      path.join(dir, `${fileName}.spec${ext}`),
      path.join(dir, '__tests__', `${fileName}.test${ext}`),
      path.join(dir, '__tests__', `${fileName}.spec${ext}`)
    ];

    return possibleTestFiles.find(testFile => fs.existsSync(testFile));
  }
}

// Main execution
async function main() {
  const validator = new PreCommitValidator();
  const success = await validator.validateStagedFiles();
  
  if (!success) {
    process.exit(1);
  }
}

if (require.main === module) {
  main().catch(error => {
    console.error(chalk.red('Pre-commit validation failed:', error));
    process.exit(1);
  });
}

module.exports = PreCommitValidator;
