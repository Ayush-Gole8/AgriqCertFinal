import database from '../config/database.config.js';
import { User } from '../models/user.model.js';

const rawArgs = process.argv.slice(2);

let emailArg: string | undefined;
let passwordArg: string | undefined;
let nameArg: string | undefined;

if (rawArgs.length > 0) {
  if (rawArgs[0].endsWith('.ts') || rawArgs[0].endsWith('.js')) {
    emailArg = rawArgs[1];
    passwordArg = rawArgs[2];
    nameArg = rawArgs[3];
  } else {
    emailArg = rawArgs[0];
    passwordArg = rawArgs[1];
    nameArg = rawArgs[2];
  }
}

const updateAdmin = async () => {
  try {
    if (!emailArg || !passwordArg) {
      console.log('Usage: npm run update-admin -- <email> <password> [name]\n');
      process.exit(1);
    }

    console.log('🔐 Updating admin user...\n');

    await database.connect();

    const admin = await User.findOne({ role: 'admin' }).select('+password');

    if (!admin) {
      console.log('⚠️ No admin user found. Run createAdmin.ts first.\n');
      await database.disconnect();
      process.exit(1);
    }

    console.log('🔑 Input:\n');
    console.log(`   Email: ${emailArg}`);
    console.log(`   Password:  ${passwordArg}\n`);
    console.log(`   Name: ${nameArg ?? admin.name}\n`);

    const originalEmail = admin.email;

    const email = emailArg;
    const password = passwordArg;
    const name = nameArg ?? admin.name;

    admin.email = email;
    admin.name = name;
    admin.password = password;
    admin.isActive = true;
    admin.isVerified = true;

    await admin.save();

    console.log('✅ Admin user updated successfully:\n');
    console.log(`   Previous email: ${originalEmail}`);
    console.log(`   New email:      ${admin.email}`);
    console.log(`   New password:   ${password}\n`);

    await database.disconnect();
    process.exit(0);
  } catch (error) {
    console.error('❌ Failed to update admin user:', error);
    await database.disconnect();
    process.exit(1);
  }
};

updateAdmin();
