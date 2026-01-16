import database from '../config/database.config.js';
import { User } from '../models/user.model.js';
import config from '../config/config.js';

const createAdmin = async () => {
  try {
    console.log('🔐 Ensuring admin user exists...\n');

    await database.connect();

    const existingAdmin = await User.findOne({ role: 'admin', email: config.admin.email });

    if (existingAdmin) {
      console.log('✅ Admin user already exists:');
      console.log(`   Email: ${existingAdmin.email}\n`);
      await database.disconnect();
      process.exit(0);
    }

    const admin = await User.create({
      email: config.admin.email,
      password: config.admin.password,
      name: config.admin.name,
      role: 'admin',
      isActive: true,
      isVerified: true,
    });

    console.log('✅ Admin user created successfully:\n');
    console.log(`   Email: ${admin.email}`);
    console.log(`   Password: ${config.admin.password}\n`);

    await database.disconnect();
    process.exit(0);
  } catch (error) {
    console.error('❌ Failed to create admin user:', error);
    await database.disconnect();
    process.exit(1);
  }
};

createAdmin();

