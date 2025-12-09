// migrate-payroll-fields.ts
import dotenv from 'dotenv';
import path from 'path';
import mongoose from 'mongoose';

dotenv.config({ path: path.join(__dirname, '.env') });

import config from './src/config/env';

const MONGO_URI = config.MONGODB_URI || 'mongodb://localhost:27017/payroll-transparency';

async function migratePayrollFields() {
  try {
    console.log('🔄 Connecting to MongoDB...');
    await mongoose.connect(MONGO_URI);
    console.log('✅ Connected to MongoDB\n');

    const db = mongoose.connection.db;

    if (!db) {
      throw new Error('Database connection not established');
    }

    // Get admin user for uploadedBy field
    console.log('🔍 Finding admin user...');
    const adminUser = await db.collection('users').findOne({ role: 'admin' });
    
    if (!adminUser) {
      console.error('❌ No admin user found!');
      process.exit(1);
    }

    console.log(`✅ Found admin: ${adminUser.email} (${adminUser._id})\n`);

    // Update batches with null uploadedBy
    console.log('📝 Updating payroll batches...');
    const result = await db.collection('payrollbatches').updateMany(
      { uploadedBy: null },
      { $set: { uploadedBy: adminUser._id } }
    );

    console.log(`✅ Updated ${result.modifiedCount} batches\n`);

    // Verify
    console.log('🔍 Verifying changes...');
    const nullCount = await db.collection('payrollbatches').countDocuments({ uploadedBy: null });
    
    if (nullCount === 0) {
      console.log('✅ All batches now have uploadedBy set!\n');
    } else {
      console.log(`⚠️  Still ${nullCount} batches with null uploadedBy\n`);
    }

    console.log('✅ Migration completed successfully!');
    
  } catch (error: any) {
    console.error('\n❌ Migration failed:', error.message);
    process.exit(1);
  } finally {
    await mongoose.disconnect();
    console.log('🔌 Disconnected from MongoDB');
    process.exit(0);
  }
}

migratePayrollFields();