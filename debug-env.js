// Debug script to check environment variables
// Run: node debug-env.js

console.log('🔍 Checking Environment Variables...\n');

// Check if .env file exists
const fs = require('fs');
const path = require('path');

const envPath = path.join(__dirname, '.env');
const envExamplePath = path.join(__dirname, '.env.example');

console.log('📁 Files:');
console.log('  .env exists:', fs.existsSync(envPath) ? '✅' : '❌');
console.log('  .env.example exists:', fs.existsSync(envExamplePath) ? '✅' : '❌\n');

if (fs.existsSync(envPath)) {
  const envContent = fs.readFileSync(envPath, 'utf8');
  const lines = envContent.split('\n');
  
  console.log('📋 Environment Variables in .env:\n');
  
  const vars = {
    'EXPO_PUBLIC_SUPABASE_URL': false,
    'EXPO_PUBLIC_SUPABASE_ANON_KEY': false,
    'EXPO_PUBLIC_STRIPE_PUBLISHABLE_KEY': false
  };
  
  lines.forEach(line => {
    const trimmed = line.trim();
    if (trimmed && !trimmed.startsWith('#')) {
      const [key, value] = trimmed.split('=');
      if (key && vars.hasOwnProperty(key.trim())) {
        const val = value ? value.trim() : '';
        vars[key.trim()] = val.length > 0;
        
        if (val.length > 0) {
          console.log(`  ✅ ${key.trim()}: ${val.substring(0, 20)}...`);
        } else {
          console.log(`  ❌ ${key.trim()}: NOT SET`);
        }
      }
    }
  });
  
  console.log('\n📊 Summary:');
  Object.entries(vars).forEach(([key, hasValue]) => {
    console.log(`  ${hasValue ? '✅' : '❌'} ${key}`);
  });
  
  const allSet = Object.values(vars).every(v => v);
  
  if (allSet) {
    console.log('\n✅ All required environment variables are set!');
  } else {
    console.log('\n⚠️  Some environment variables are missing!');
    console.log('\n📝 To fix:');
    console.log('  1. Copy .env.example to .env');
    console.log('  2. Fill in your Supabase credentials');
    console.log('  3. Get Stripe test key from: https://dashboard.stripe.com/test/apikeys');
    console.log('  4. Restart Metro bundler: npm run dev');
  }
} else {
  console.log('❌ .env file not found!');
  console.log('\n📝 To create .env file:');
  console.log('  1. Copy .env.example to .env:');
  console.log('     cp .env.example .env');
  console.log('  2. Edit .env and fill in your credentials');
}

console.log('\n' + '='.repeat(50));

