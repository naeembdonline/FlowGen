// ============================================================================
// FLOWGEN WINDOWS STARTUP SCRIPT
// ============================================================================
// This script helps verify your setup before starting the backend server
// Run with: node start-windows.js
// ============================================================================

const fs = require('fs');
const path = require('path');

console.log('🔍 FLOWGEN WINDOWS SETUP VERIFICATION\n');

// ANSI color codes for Windows
const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[36m',
};

// Load environment variables
require('dotenv').config();

let allPassed = true;

// ============================================================================
// CHECK 1: .env FILE EXISTS
// ============================================================================

console.log('📋 Checking .env file...');
const envPath = path.join(__dirname, '.env');

if (fs.existsSync(envPath)) {
  console.log(`${colors.green}✅ .env file found${colors.reset}`);
} else {
  console.log(`${colors.red}❌ .env file NOT found${colors.reset}`);
  console.log(`${colors.yellow}Please create a .env file in the backend directory${colors.reset}`);
  allPassed = false;
}

// ============================================================================
// CHECK 2: REQUIRED ENVIRONMENT VARIABLES
// ============================================================================

console.log('\n🔧 Checking environment variables...');

const requiredVars = {
  'SUPABASE_URL': { pattern: /^https:\/\/.*\.supabase\.co$/, description: 'Must be a valid Supabase URL' },
  'SUPABASE_ANON_KEY': { pattern: /^eyJ/, description: 'Must start with "eyJ"' },
  'SUPABASE_SERVICE_ROLE_KEY': { pattern: /^eyJ/, description: 'Must start with "eyJ"' },
  'Z_AI_API_KEY': { pattern: /.+/, description: 'Required for AI personalization' },
  'OPENAI_API_KEY': { pattern: /^sk-/, description: 'Must start with "sk-"' },
};

for (const [varName, validation] of Object.entries(requiredVars)) {
  const value = process.env[varName];

  if (!value) {
    console.log(`${colors.red}❌ ${varName}: MISSING${colors.reset}`);
    console.log(`   ${validation.description}`);
    allPassed = false;
  } else if (validation.pattern && !validation.pattern.test(value)) {
    console.log(`${colors.red}❌ ${varName}: INVALID FORMAT${colors.reset}`);
    console.log(`   ${validation.description}`);
    console.log(`   Current value: ${value.substring(0, 20)}...`);
    allPassed = false;
  } else {
    const preview = value.substring(0, 20) + '...';
    console.log(`${colors.green}✅ ${varName}: ${preview}${colors.reset}`);
  }
}

// ============================================================================
// CHECK 3: OPTIONAL ENVIRONMENT VARIABLES
// ============================================================================

console.log('\n⚙️  Checking optional variables...');

const optionalVars = {
  'PORT': '3001',
  'NODE_ENV': 'development',
  'USE_IN_MEMORY_CACHE': 'true (recommended for Windows)',
};

for (const [varName, recommended] of Object.entries(optionalVars)) {
  const value = process.env[varName];
  if (value) {
    console.log(`${colors.green}✅ ${varName}: ${value}${colors.reset}`);
  } else {
    console.log(`${colors.yellow}⚠️  ${varName}: Not set (optional)${colors.reset}`);
    console.log(`   Recommended: ${recommended}`);
  }
}

// ============================================================================
// CHECK 4: NODE MODULES
// ============================================================================

console.log('\n📦 Checking dependencies...');
const packageJsonPath = path.join(__dirname, 'package.json');
const nodeModulesPath = path.join(__dirname, 'node_modules');

if (fs.existsSync(packageJsonPath)) {
  console.log(`${colors.green}✅ package.json found${colors.reset}`);
} else {
  console.log(`${colors.red}❌ package.json NOT found${colors.reset}`);
  allPassed = false;
}

if (fs.existsSync(nodeModulesPath)) {
  console.log(`${colors.green}✅ node_modules directory found${colors.reset}`);
} else {
  console.log(`${colors.red}❌ node_modules NOT found${colors.reset}`);
  console.log(`${colors.yellow}Run: npm install${colors.reset}`);
  allPassed = false;
}

// ============================================================================
// CHECK 5: CRITICAL DEPENDENCIES
// ============================================================================

console.log('\n📚 Checking critical dependencies...');

const criticalDeps = [
  '@supabase/supabase-js',
  'express',
  'dotenv',
  'cors',
  'helmet',
];

for (const dep of criticalDeps) {
  const depPath = path.join(__dirname, 'node_modules', dep);
  if (fs.existsSync(depPath)) {
    console.log(`${colors.green}✅ ${dep}${colors.reset}`);
  } else {
    console.log(`${colors.red}❌ ${dep} NOT found${colors.reset}`);
    console.log(`${colors.yellow}Run: npm install${colors.reset}`);
    allPassed = false;
  }
}

// ============================================================================
// FINAL VERDICT
// ============================================================================

console.log('\n' + '='.repeat(50));

if (allPassed) {
  console.log(`${colors.green}✅ ALL CHECKS PASSED!${colors.reset}`);
  console.log(`${colors.green}✅ Your backend is ready to start!${colors.reset}`);
  console.log('\n🚀 Start the server with:');
  console.log('   npm run dev');
  console.log('\n📖 Then open:');
  console.log('   http://localhost:3000/signup');
} else {
  console.log(`${colors.red}❌ SOME CHECKS FAILED${colors.reset}`);
  console.log(`${colors.yellow}Please fix the issues above before starting the server${colors.reset}`);
  console.log('\n📖 For help, see: WINDOWS_SETUP_GUIDE.md');
  console.log('\n🔧 Quick fixes:');
  console.log('   1. Ensure .env file exists in backend directory');
  console.log('   2. Get Supabase credentials from https://supabase.com/dashboard');
  console.log('   3. Run: npm install');
  console.log('   4. Add to .env: USE_IN_MEMORY_CACHE=true');
}

console.log('='.repeat(50));

process.exit(allPassed ? 0 : 1);
