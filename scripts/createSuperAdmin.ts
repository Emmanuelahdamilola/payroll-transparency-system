import mongoose from 'mongoose';
import User from '../src/models/User';
import { UserRole } from '../src/types';
import dotenv from 'dotenv';
import readline from 'readline';

// Load environment variables
dotenv.config();

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

const question = (query: string): Promise<string> => {
  return new Promise((resolve) => {
    rl.question(query, resolve);
  });
};

async function createSuperAdmin() {
  try {
    // Connect to MongoDB
    const mongoUri = process.env.MONGODB_URI;
    if (!mongoUri) {
      console.error('❌ MONGODB_URI not found in environment variables');
      process.exit(1);
    }

    console.log('🔄 Connecting to MongoDB...');
    await mongoose.connect(mongoUri);
    console.log('✅ Connected to MongoDB');

    // Check if SuperAdmin already exists
    const existingSuperAdmin = await User.findOne({ role: UserRole.SUPERADMIN });
    
    if (existingSuperAdmin) {
      console.log('⚠️  A SuperAdmin account already exists:');
      console.log(`   Email: ${existingSuperAdmin.email}`);
      console.log(`   Name: ${existingSuperAdmin.firstName} ${existingSuperAdmin.lastName}`);
      
      const confirm = await question('\nDo you want to create another SuperAdmin? (yes/no): ');
      if (confirm.toLowerCase() !== 'yes') {
        console.log('❌ SuperAdmin creation cancelled');
        await mongoose.disconnect();
        process.exit(0);
      }
    }

    console.log('\n🔐 Creating SuperAdmin Account');
    console.log('================================\n');

    // Get user input
    const email = await question('Email: ');
    const password = await question('Password (min 8 characters): ');
    const firstName = await question('First Name: ');
    const lastName = await question('Last Name: ');

    // Validate inputs
    if (!email || !password || !firstName || !lastName) {
      console.error('❌ All fields are required');
      await mongoose.disconnect();
      process.exit(1);
    }

    if (password.length < 8) {
      console.error('❌ Password must be at least 8 characters');
      await mongoose.disconnect();
      process.exit(1);
    }

    const emailRegex = /^\S+@\S+\.\S+$/;
    if (!emailRegex.test(email)) {
      console.error('❌ Invalid email format');
      await mongoose.disconnect();
      process.exit(1);
    }

    // Check if email already exists
    const existingUser = await User.findOne({ email: email.toLowerCase() });
    if (existingUser) {
      console.error('❌ A user with this email already exists');
      await mongoose.disconnect();
      process.exit(1);
    }

    // Create SuperAdmin
    const superAdmin = await User.create({
      email: email.toLowerCase(),
      password,
      firstName: firstName.trim(),
      lastName: lastName.trim(),
      role: UserRole.SUPERADMIN,
      isActive: true,
      mustChangePassword: false
    });

    console.log('\n✅ SuperAdmin account created successfully!');
    console.log('==========================================');
    console.log(`   ID: ${superAdmin._id}`);
    console.log(`   Email: ${superAdmin.email}`);
    console.log(`   Name: ${superAdmin.firstName} ${superAdmin.lastName}`);
    console.log(`   Role: ${superAdmin.role}`);
    console.log('\n🔒 Keep these credentials safe!');
    console.log('==========================================\n');

    await mongoose.disconnect();
    console.log('✅ Database connection closed');
    process.exit(0);
  } catch (error: any) {
    console.error('❌ Error creating SuperAdmin:', error.message);
    await mongoose.disconnect();
    process.exit(1);
  } finally {
    rl.close();
  }
}

// Run the script
createSuperAdmin();