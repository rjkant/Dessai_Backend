// personaRouter.js
const fs = require('fs');
const path = require('path');

const PERSONA_DIR = path.join(__dirname, '../.ai/personas');

function loadPersonas() {
  const files = fs.readdirSync(PERSONA_DIR);
  return files.map(file => {
    const content = fs.readFileSync(path.join(PERSONA_DIR, file), 'utf-8');
    return { name: file.replace('.md', ''), content };
  });
}

function selectPersona(request) {
  const personas = loadPersonas();
  // Simple keyword-based matching (expand with NLP for better results)
  const keywords = {
    'test': 'testing',
    'security': 'security',
    'refactor': 'refactoring',
    'doc': 'documentation',
    'cto': 'cto-advisor',
    'code': 'code-generator',
    'ceo': 'ceo-advisor'
  };
  for (const [key, persona] of Object.entries(keywords)) {
    if (request.toLowerCase().includes(key)) {
      return personas.find(p => p.name === persona);
    }
  }
  // Default fallback
  return personas.find(p => p.name === 'code-generator');
}

module.exports = { selectPersona };
