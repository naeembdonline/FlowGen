// ============================================================================
// SIMPLE .env TEST - Debug Environment Variable Loading
// ============================================================================
// Run this to test if your .env file can be found and read correctly
// Run: node test-env.js
// ============================================================================

const path = require('path');
const fs = require('fs');
const dotenv = require('dotenv');

console.log('🔍 .env FILE LOCATION TEST');
console.log('='.repeat(60));

console.log('\n📁 Current Directory Information:');
console.log('__dirname:', __dirname);
console.log('process.cwd():', process.cwd());
console.log('script location:', __filename);

console.log('\n🔍 Testing .env file locations:');

const testPaths = [
  path.resolve(process.cwd(), '.env'),
  path.resolve(__dirname, '.env'),
  path.resolve(__dirname, '../.env'),
  path.resolve(__dirname, '..', 'backend', '.env'),
  'F:\\Parsa\\Lead Saas\\backend\\.env',
  'F:\\Parsa\\Lead Saas\\backend\\.env', // Try with double extension
];

let foundEnv = null;
for (const testPath of testPaths) {
  const exists = fs.existsSync(testPath);
  console.log(`${exists ? '✅' : '❌'} ${testPath}`);
  if (exists && !foundEnv) {
    foundEnv = testPath;
  }
}

if (!foundEnv) {
  console.log('\n❌ No .env file found!');
  console.log('\nCreate .env file at:', path.resolve(process.cwd(), '.env'));
  process.exit(1);
}

console.log('\n✅ Found .env at:', foundEnv);

// Try to load it
console.log('\n📖 Loading .env file...');
const result = dotenv.config({ path: foundEnv });

if (result.error) {
  console.log('❌ Error loading .env:', result.error.message);
  process.exit(1);
}

console.log('✅ .env loaded successfully!');

// Check what was loaded
console.log('\n🔍 Environment Variables Loaded:');
console.log('SUPABASE_URL exists:', !!process.env.SUPABASE_URL);
console.log('SUPABASE_ANON_KEY exists:', !!process.env.SUPABASE_ANON_KEY);
console.log('SUPABASE_SERVICE_ROLE_KEY exists:', !!process.env.SUPABASE_SERVICE_ROLE_KEY);
console.log('Z_AI_API_KEY exists:', !!process.env.Z_AI_API_KEY);
console.log('OPENAI_API_KEY exists:', !!process.env.OPENAI_API_KEY);

if (process.env.SUPABASE_URL) {
  console.log('\n✅ SUPABASE_URL value:', process.env.SUPABASE_URL.substring(0, 50) + '...');
}

if (process.env.SUPABASE_ANON_KEY) {
  console.log('✅ SUPABASE_ANON_KEY length:', process.env.SUPABASE_ANON_KEY.length, 'chars');
}

if (process.env.SUPABASE_SERVICE_ROLE_KEY) {
  console.log('✅ SUPABASE_SERVICE_ROLE_KEY length:', process.env.SUPABASE_SERVICE_ROLE_KEY.length, 'chars');
}

console.log('\n✅ SUCCESS! Your .env file is properly configured.');
console.log('🚀 You can now start the server with: npm run dev');
