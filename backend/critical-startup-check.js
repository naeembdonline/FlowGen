// ============================================================================
// FLOWGEN CRITICAL STARTUP CHECK - UPDATED (Absolute Path Logic)
// ============================================================================
// This script diagnoses EXACTLY why your backend isn't starting properly
// Run: node critical-startup-check.js
// ============================================================================

const fs = require('fs');
const path = require('path');

console.log('🔍 FLOWGEN CRITICAL STARTUP DIAGNOSIS');
console.log('='.repeat(60));

// ============================================================================
// DEBUG: Show current directory information
// ============================================================================

console.log('\n🔍 DIRECTORY INFORMATION:');
console.log('__dirname:', __dirname);
console.log('process.cwd():', process.cwd());
console.log('Looking for .env at:', path.resolve(process.cwd(), '.env'));

// ============================================================================
// CHECK 1: .env FILE EXISTENCE AND LOCATION (Absolute Paths)
// ============================================================================

console.log('\n📋 Step 1: Searching for .env file with absolute paths...');

const possibleEnvPaths = [
  path.resolve(process.cwd(), '.env'),                    // Current working directory
  path.resolve(__dirname, '.env'),                       // backend/src/.env
  path.resolve(__dirname, '../.env'),                     // backend/.env
  path.resolve(__dirname, '..', '.env'),                  // backend/.env (alternative)
  path.resolve(__dirname, '..', 'backend', '.env'),       // F:\Parsa\Lead Saas\backend\.env
  path.resolve(__dirname, '..', '..', 'backend', '.env'),  // Go up two levels
  path.resolve('F:\\Parsa\\Lead Saas\\backend', '.env'),   // Direct Windows path
  path.resolve('F:\\Parsa\\Lead Saas\\backend\\.env'),    // Alternative Windows path
];

let envPath = null;
let foundPaths = [];

console.log('Searching in these locations:');
possibleEnvPaths.forEach((checkPath, index) => {
  const exists = fs.existsSync(checkPath);
  console.log(`  ${index + 1}. ${checkPath}`);
  console.log(`     ${exists ? '✅ EXISTS' : '❌ NOT FOUND'}`);

  if (exists) {
    foundPaths.push(checkPath);
  }
});

if (foundPaths.length > 0) {
  envPath = foundPaths[0];
  console.log(`\n✅ Found .env file at: ${envPath}`);
} else {
  console.log('\n❌ .env file NOT FOUND in any location!');
  console.log('\n🔧 CREATE .env FILE at one of these locations:');
  possibleEnvPaths.forEach(p => console.log(`   ${p}`));
  console.log('\nWith these contents:');
  console.log(`
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_ANON_KEY=your-anon-key-here
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key-here
Z_AI_API_KEY=your-z-ai-key-here
OPENAI_API_KEY=your-openai-key-here
PORT=3001
NODE_ENV=development
USE_IN_MEMORY_CACHE=true
  `);
  process.exit(1);
}

// ============================================================================
// CHECK 2: .env FILE CONTENT VALIDATION (SIMPLIFIED)
// ============================================================================

console.log('\n📄 Step 2: Validating .env file contents...');

let envContent;
try {
  envContent = fs.readFileSync(envPath, 'utf8');
} catch (error) {
  console.error(`❌ Error reading .env file: ${error.message}`);
  process.exit(1);
}

const envLines = envContent.split('\n').filter(line => line.trim() && !line.startsWith('#'));

const envVars = {};
for (const line of envLines) {
  const [key, ...valueParts] = line.split('=');
  const value = valueParts.join('=').trim();
  // Clean value - remove newlines and extra spaces
  envVars[key.trim()] = value.replace(/[\n\r\s]+/g, '').trim();
}

console.log(`Found ${Object.keys(envVars).length} environment variables`);

// ============================================================================
// CHECK 3: CRITICAL VARIABLES PRESENCE (NO LENGTH CHECKS)
// ============================================================================

console.log('\n🔑 Step 3: Checking critical variables (existence only)...');

const criticalVars = [
  'SUPABASE_URL',
  'SUPABASE_ANON_KEY',
  'SUPABASE_SERVICE_ROLE_KEY',
  'Z_AI_API_KEY',
  'OPENAI_API_KEY'
];

let missingVars = [];
let invalidVars = [];

for (const varName of criticalVars) {
  const value = envVars[varName];

  if (!value) {
    console.log(`❌ ${varName}: MISSING`);
    missingVars.push(varName);
  } else {
    // Simplified validation - only check format, not length
    let isValid = true;
    let issue = '';

    if (varName === 'SUPABASE_URL') {
      if (!value.startsWith('https://') || !value.includes('.supabase.co')) {
        isValid = false;
        issue = 'Must be a valid Supabase URL (https://xxx.supabase.co)';
      } else if (value.includes('your-project') || value.includes('placeholder')) {
        isValid = false;
        issue = 'Appears to be a placeholder value';
      }
    }

    if (isValid) {
      const preview = value.substring(0, 25) + '...';
      const charCount = value.length;
      console.log(`✅ ${varName}: ${preview} (${charCount} chars)`);
    } else {
      console.log(`❌ ${varName}: INVALID - ${issue}`);
      invalidVars.push({ varName, issue, value });
    }
  }
}

// ============================================================================
// CHECK 4: COMMON .env FILE ISSUES
// ============================================================================

console.log('\n⚠️  Step 4: Checking for common .env file issues...');

const issues = [];

// Check for quotes around values
for (const [key, value] of Object.entries(envVars)) {
  if (value.startsWith('"') && value.endsWith('"')) {
    issues.push(`${key} has quotes around value - remove quotes`);
  }
  if (value.startsWith("'") && value.endsWith("'")) {
    issues.push(`${key} has single quotes around value - remove quotes`);
  }
}

// Check for spaces around =
const firstLine = envLines[0];
if (firstLine && firstLine.includes(' = ')) {
  issues.push('Spaces detected around = in .env file - remove spaces');
}

// Check for line breaks in JWT tokens
for (const [key, value] of Object.entries(envVars)) {
  if (value.includes('\n') || value.includes('\r')) {
    issues.push(`${key} contains line breaks in the original file - will be cleaned automatically`);
  }
}

if (issues.length > 0) {
  console.log('❌ Found issues:');
  issues.forEach(issue => console.log(`   - ${issue}`));
} else {
  console.log('✅ No common .env file issues detected');
}

// ============================================================================
// CHECK 5: NODE MODULES
// ============================================================================

console.log('\n📦 Step 5: Checking Node modules...');

const packageJsonPath = path.join(__dirname, 'package.json');
const nodeModulesPath = path.join(__dirname, 'node_modules');

if (!fs.existsSync(packageJsonPath)) {
  console.log('❌ package.json not found');
} else {
  console.log('✅ package.json found');
}

if (!fs.existsSync(nodeModulesPath)) {
  console.log('❌ node_modules not found - run: npm install');
} else {
  console.log('✅ node_modules found');
}

// Check critical dependencies
const criticalDeps = ['dotenv', 'express', '@supabase/supabase-js'];
for (const dep of criticalDeps) {
  const depPath = path.join(__dirname, 'node_modules', dep);
  if (fs.existsSync(depPath)) {
    console.log(`✅ ${dep} installed`);
  } else {
    console.log(`❌ ${dep} NOT installed - run: npm install`);
  }
}

// ============================================================================
// CHECK 6: IN-MEMORY CACHE CONFIGURATION
// ============================================================================

console.log('\n💾 Step 6: Checking cache configuration...');

if (envVars.USE_IN_MEMORY_CACHE === 'true') {
  console.log('✅ USE_IN_MEMORY_CACHE=true - In-memory mode enabled');
  console.log('✅ Redis installation NOT required');
} else if (envVars.SKIP_REDIS === 'true') {
  console.log('✅ SKIP_REDIS=true - In-memory mode enabled');
  console.log('✅ Redis installation NOT required');
} else {
  console.log('⚠️  USE_IN_MEMORY_CACHE not set');
  console.log('💡 Consider adding: USE_IN_MEMORY_CACHE=true');
}

// ============================================================================
// CHECK 7: PORT CONFIGURATION
// ============================================================================

console.log('\n🌐 Step 7: Checking port configuration...');

const port = envVars.PORT || '3001';
console.log(`✅ Configured PORT: ${port}`);

// ============================================================================
// CHECK 8: TEST ENVIRONMENT LOADING
// ============================================================================

console.log('\n🧪 Step 8: Testing environment loading...');

// Test if we can load the same .env file that the server will use
const testDotenv = require('dotenv');
const testPath = path.resolve(process.cwd(), '.env');

console.log(`Testing .env loading from: ${testPath}`);
console.log(`File exists: ${fs.existsSync(testPath)}`);

const testResult = testDotenv.config({ path: testPath });
if (testResult.error) {
  console.log(`❌ Test load failed: ${testResult.error.message}`);
} else {
  console.log(`✅ Test load successful!`);
  console.log(`SUPABASE_URL loaded: ${!!process.env.SUPABASE_URL}`);
  console.log(`SUPABASE_ANON_KEY loaded: ${!!process.env.SUPABASE_ANON_KEY}`);
  console.log(`SUPABASE_SERVICE_ROLE_KEY loaded: ${!!process.env.SUPABASE_SERVICE_ROLE_KEY}`);
}

// ============================================================================
// FINAL VERDICT
// ============================================================================

console.log('\n' + '='.repeat(60));

let canStart = true;
if (missingVars.length > 0 || invalidVars.length > 0) {
  canStart = false;
}

if (canStart) {
  console.log('✅ ALL CHECKS PASSED! Your backend should start successfully.');
  console.log('\n🚀 Start your server with:');
  console.log('   npm run dev');
  console.log('\n📖 Then open:');
  console.log('   http://localhost:3000/signup');
} else {
  console.log('❌ CRITICAL ISSUES FOUND - SERVER WILL NOT START PROPERLY');

  if (missingVars.length > 0) {
    console.log('\n🔧 MISSING VARIABLES (add these to .env):');
    missingVars.forEach(varName => {
      console.log(`   ${varName}=your-value-here`);
    });
  }

  if (invalidVars.length > 0) {
    console.log('\n🔧 INVALID VARIABLES (fix these values):');
    invalidVars.forEach(({ varName, issue, value }) => {
      console.log(`   ${varName}: ${issue}`);
      console.log(`   Current value: ${value.substring(0, 50)}...`);
    });
  }

  console.log('\n🔧 HOW TO GET SUPABASE CREDENTIALS:');
  console.log('1. Go to https://supabase.com/dashboard');
  console.log('2. Select your project');
  console.log('3. Go to Settings → API');
  console.log('4. Copy the values:');
  console.log('   - Project URL → SUPABASE_URL');
  console.log('   - anon public → SUPABASE_ANON_KEY');
  console.log('   - service_role → SUPABASE_SERVICE_ROLE_KEY');
}

console.log('='.repeat(60));

process.exit(canStart ? 0 : 1);
