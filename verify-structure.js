#!/usr/bin/env node
/**
 * Verification script to ensure the project structure is correct for Vercel deployment
 */

import fs from 'fs';
import path from 'path';

const checks = [];

function check(name, condition, details) {
  checks.push({ name, passed: condition, details });
  const icon = condition ? '✅' : '❌';
  console.log(`${icon} ${name}`);
  if (details && !condition) {
    console.log(`   ${details}`);
  }
}

console.log('🔍 Verifying project structure for Vercel deployment...\n');

// Check 1: api directory exists
check(
  'api/ directory exists',
  fs.existsSync('api') && fs.statSync('api').isDirectory(),
  'Create an api/ directory for Vercel serverless functions'
);

// Check 2: github-webhook.js exists in api/
check(
  'api/github-webhook.js exists',
  fs.existsSync('api/github-webhook.js'),
  'Move your webhook handler to api/github-webhook.js'
);

// Check 3: vercel.json exists
check(
  'vercel.json exists',
  fs.existsSync('vercel.json'),
  'Create vercel.json to configure Vercel deployment'
);

// Check 4: package.json exists
check(
  'package.json exists',
  fs.existsSync('package.json'),
  'Ensure package.json is in the root directory'
);

// Check 5: .env.example exists
check(
  '.env.example exists',
  fs.existsSync('.env.example'),
  'Create .env.example to document required environment variables'
);

// Check 6: Check package.json has required dependencies
if (fs.existsSync('package.json')) {
  const pkg = JSON.parse(fs.readFileSync('package.json', 'utf8'));
  
  check(
    'discord.js dependency',
    pkg.dependencies && pkg.dependencies['discord.js'],
    'Install discord.js: npm install discord.js'
  );
  
  check(
    'Test dependencies',
    pkg.devDependencies && pkg.devDependencies['jest'],
    'Install test dependencies: npm install --save-dev jest'
  );
  
  check(
    'Test script configured',
    pkg.scripts && pkg.scripts['test'] && pkg.scripts['test'] !== 'echo "Error: no test specified" && exit 1',
    'Configure test script in package.json'
  );
}

// Check 7: Tests exist
check(
  'Test file exists',
  fs.existsSync('api/github-webhook.test.js'),
  'Create test file: api/github-webhook.test.js'
);

// Check 8: README exists
check(
  'README.md exists',
  fs.existsSync('README.md'),
  'Create README.md with setup instructions'
);

// Check 9: gitignore exists and includes node_modules
if (fs.existsSync('.gitignore')) {
  const gitignore = fs.readFileSync('.gitignore', 'utf8');
  check(
    '.gitignore includes node_modules',
    gitignore.includes('node_modules'),
    'Add node_modules/ to .gitignore'
  );
  
  check(
    '.gitignore includes .env',
    gitignore.includes('.env'),
    'Add .env to .gitignore to prevent committing secrets'
  );
}

// Summary
console.log('\n' + '='.repeat(50));
const passed = checks.filter(c => c.passed).length;
const total = checks.length;
console.log(`📊 Verification Results: ${passed}/${total} checks passed`);

if (passed === total) {
  console.log('✅ Project structure is ready for Vercel deployment!');
  console.log('\nNext steps:');
  console.log('1. Run tests: npm test');
  console.log('2. Deploy to Vercel: vercel');
  console.log('3. Set environment variables in Vercel');
  console.log('4. Configure GitHub webhook');
  process.exit(0);
} else {
  console.log('❌ Please fix the issues above before deploying');
  process.exit(1);
}
