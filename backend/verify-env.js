// Quick environment variable verification script
// Run this with: node verify-env.js

require('dotenv').config();

console.log('🔍 FLOWGEN ENVIRONMENT VERIFICATION\n');

// Check required variables
const requiredVars = [
  'SUPABASE_URL',
  'SUPABASE_ANON_KEY',
  'SUPABASE_SERVICE_ROLE_KEY',
  'Z_AI_API_KEY',
  'OPENAI_API_KEY'
];

let allPresent = true;

requiredVars.forEach(varName => {
  const value = process.env[varName];
  if (value) {
    // Show first 20 chars for security
    const preview = value.substring(0, 20) + '...';
    console.log(`✅ ${varName}: ${preview}`);
  } else {
    console.log(`❌ ${varName}: MISSING`);
    allPresent = false;
  }
});

console.log('\n' + '='.repeat(50));

if (allPresent) {
  console.log('✅ All environment variables loaded successfully!');
  console.log('✅ Backend is ready to start!');
} else {
  console.log('❌ Some environment variables are missing.');
  console.log('❌ Please check your .env file in the backend directory.');
  console.log('\n📝 Your .env file should contain:');
  console.log(`
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_ANON_KEY=your-anon-key-here
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key-here
Z_AI_API_KEY=your-z-ai-key-here
OPENAI_API_KEY=your-openai-key-here
PORT=3001
NODE_ENV=development
  `);
}

process.exit(allPresent ? 0 : 1);
