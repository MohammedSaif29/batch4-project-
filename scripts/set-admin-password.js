#!/usr/bin/env node
// Usage: node scripts/set-admin-password.js <newPassword>
const Database = require('better-sqlite3');
const bcrypt = require('bcryptjs');

async function main() {
  const args = process.argv.slice(2);
  if (args.length === 0) {
    console.error('Usage: node scripts/set-admin-password.js <newPassword>');
    process.exit(2);
  }

  const newPassword = args[0];
  const db = new Database('aidconnect.db');

  try {
    const user = db.prepare('SELECT id, username FROM users WHERE username = ?').get('admin');
    if (!user) {
      console.error('Admin user not found in database.');
      process.exit(1);
    }

    const hashed = await bcrypt.hash(newPassword, 10);
    const result = db.prepare('UPDATE users SET password = ? WHERE id = ?').run(hashed, user.id);
    if (result.changes === 1) {
      console.log('Admin password updated successfully for user:', user.username);
    } else {
      console.error('Failed to update admin password.');
      process.exit(1);
    }
  } catch (err) {
    console.error('Error updating admin password:', err);
    process.exit(1);
  } finally {
    db.close();
  }
}

main();
