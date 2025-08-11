#!/usr/bin/env node
/**
 * AI Prompt Validation Script
 * Ensures prompt templates are present and referenced
 */
const fs = require('fs');
const path = require('path');
const chalk = require('chalk');

function scanPrompts(dir) {
  if (!fs.existsSync(dir)) return false;
  const files = fs.readdirSync(dir);
  let valid = true;
  files.forEach(f => {
    const file = path.join(dir, f);
    const content = fs.readFileSync(file, 'utf-8');
    if (!content.match(/Prompt:/)) {
      console.log(chalk.red(`[ERROR] ${file} missing Prompt:`));
      valid = false;
    }
  });
  return valid;
}

function main() {
  const promptDir = path.resolve(process.cwd(), '.ai/prompts');
  if (!scanPrompts(promptDir)) process.exit(1);
  console.log(chalk.green('Prompt validation passed.'));
}

main();
