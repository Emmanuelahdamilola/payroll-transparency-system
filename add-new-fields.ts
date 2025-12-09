import mongoose from 'mongoose';
import dotenv from 'dotenv';

dotenv.config();

const runMigration = async () => {
  try {
    // Connect to MongoDB
    await mongoose.connect(process.env.MONGODB_URI || '');
    console.log('✅ Connected to MongoDB');

    // Migration 1: Add mustChangePassword to existing users
    console.log('\n📝 Migration 1: Adding mustChangePassword field to users...');
    const userUpdateResult = await mongoose.connection.collection('users').updateMany(
      { mustChangePassword: { $exists: false } },
      { $set: { mustChangePassword: false } }
    );
    console.log(`   ✅ Updated ${userUpdateResult.modifiedCount} users`);

    // Migration 2: Add isActive to existing staff
    console.log('\n📝 Migration 2: Adding isActive field to staff...');
    const staffUpdateResult = await mongoose.connection.collection('staffs').updateMany(
      { isActive: { $exists: false } },
      { $set: { isActive: true } }
    );
    console.log(`   ✅ Updated ${staffUpdateResult.modifiedCount} staff records`);

    // Migration 3: Add new fields to staff (optional fields)
    console.log('\n📝 Migration 3: Adding optional staff fields...');
    const staffOptionalFields = await mongoose.connection.collection('staffs').updateMany(
      {},
      {
        $set: {
          emailEncrypted: { $ifNull: ['$emailEncrypted', null] },
          staffId: { $ifNull: ['$staffId', null] },
          position: { $ifNull: ['$position', null] },
          employmentType: { $ifNull: ['$employmentType', 'permanent'] },
          hireDate: { $ifNull: ['$hireDate', null] },
          bankAccountEncrypted: { $ifNull: ['$bankAccountEncrypted', null] },
          bankNameEncrypted: { $ifNull: ['$bankNameEncrypted', null] },
          createdBy: { $ifNull: ['$createdBy', null] },
          updatedBy: { $ifNull: ['$updatedBy', null] }
        }
      }
    );
    console.log(`   ✅ Added optional fields to ${staffOptionalFields.matchedCount} staff records`);

    // Migration 4: Update Flag model fields
    console.log('\n📝 Migration 4: Updating flag fields...');
    
    // Rename 'explanation' to 'reason' if it exists
    const flagsWithExplanation = await mongoose.connection.collection('flags').find({
      explanation: { $exists: true },
      reason: { $exists: false }
    }).toArray();

    if (flagsWithExplanation.length > 0) {
      await mongoose.connection.collection('flags').updateMany(
        { explanation: { $exists: true }, reason: { $exists: false } },
        [
          {
            $set: {
              reason: '$explanation',
              aiExplanation: '',
              salary: { $ifNull: ['$metadata.salary', 0] }
            }
          },
          {
            $unset: 'explanation'
          }
        ]
      );
      console.log(`   ✅ Migrated ${flagsWithExplanation.length} flags from 'explanation' to 'reason'`);
    }

    // Add salary field to flags without it
    await mongoose.connection.collection('flags').updateMany(
      { salary: { $exists: false } },
      { $set: { salary: 0 } }
    );

    console.log('\n✅ All migrations completed successfully!');
    console.log('\n📊 Summary:');
    console.log(`   - Users updated: ${userUpdateResult.modifiedCount}`);
    console.log(`   - Staff updated: ${staffUpdateResult.modifiedCount}`);
    console.log(`   - Flags migrated: ${flagsWithExplanation.length}`);

  } catch (error) {
    console.error('❌ Migration failed:', error);
    process.exit(1);
  } finally {
    await mongoose.disconnect();
    console.log('\n✅ Disconnected from MongoDB');
    process.exit(0);
  }
};

// Run migration
runMigration();
