#!/usr/bin/env node
/**
 * AI Persona Validation Script
 * Ensures all code/doc changes identify persona and checklist
 */
const fs = require('fs');
const path = require('path');
const chalk = require('chalk');

function scanFile(file) {
  const content = fs.readFileSync(file, 'utf-8');
  const personaMatch = content.match(/Persona:/);
  const checklistMatch = content.match(/Validation Checklist:/);
  if (!personaMatch) {
    console.log(chalk.red(`[ERROR] ${file} missing persona identification.`));
    return false;
  }
  if (!checklistMatch) {
    console.log(chalk.red(`[ERROR] ${file} missing validation checklist.`));
    return false;
  }
  return true;
}

function main() {
  // Scan docs and scripts for persona/checklist
  const targets = [
    'docs/README.md',
    '.github/copilot-instructions.md',
    'docs/system/architecture/system-architecture.md'
  ];
  let allValid = true;
  targets.forEach(rel => {
    const file = path.resolve(process.cwd(), rel);
    if (fs.existsSync(file)) {
      if (!scanFile(file)) allValid = false;
    }
  });
  if (!allValid) process.exit(1);
  console.log(chalk.green('Persona validation passed.'));
}

main();
