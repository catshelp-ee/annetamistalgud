#!/usr/bin/env node

/**
 * Generate bcrypt password hash for admin authentication
 * Usage: node generate-password-hash.js "your-password-here"
 */

const bcrypt = require('bcrypt');

// Get password from command line argument or prompt
const password = process.argv[2];

if (!password) {
  console.error('❌ Error: Please provide a password as an argument');
  console.log('\nUsage:');
  console.log('  node generate-password-hash.js "your-password-here"');
  console.log('\nExample:');
  console.log('  node generate-password-hash.js "MySecurePassword123!"');
  process.exit(1);
}

// Validate password strength
if (password.length < 8) {
  console.warn('⚠️  Warning: Password is shorter than 8 characters');
}

console.log(`\n🔐 Generating hash for password: "${password}"`);
console.log('⏳ Processing...\n');

// Generate hash with salt rounds = 10
bcrypt.hash(password, 10, (err, hash) => {
  if (err) {
    console.error('❌ Error generating hash:', err);
    process.exit(1);
  }

  console.log('✅ Hash generated successfully!\n');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('Add this line to your .env file:');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
  console.log(`ADMIN_PASSWORD_HASH=${hash}`);
  console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

  // Verify the hash works
  bcrypt.compare(password, hash, (err, result) => {
    if (err) {
      console.error('❌ Verification error:', err);
      return;
    }
    if (result) {
      console.log('✅ Hash verified successfully - password matches!\n');
    } else {
      console.error('❌ Verification failed - hash does not match password\n');
    }
  });
});
