import mongoose from 'mongoose';
import dotenv from 'dotenv';
dotenv.config();

import User from '../src/models/User.js';
import Subscription from '../src/models/Subscription.js';
import UsageRecord from '../src/models/UsageRecord.js';
import usageService from '../src/services/usageService.js';
import { PLAN_LIMITS } from '../src/config/entitlements.js';

async function migrate() {
  console.log('Connecting to MongoDB Atlas...');
  await mongoose.connect(process.env.MONGODB_URI);
  const db = mongoose.connection.db;

  console.log('\n--- 1. ARCHIVING LEGACY USAGE RECORDS ---');
  const legacyRecords = await db.collection('usagerecords').find({ usageDate: { $exists: false } }).toArray();
  console.log(`Found ${legacyRecords.length} legacy usage records without usageDate.`);

  if (legacyRecords.length > 0) {
    const archiveCollection = db.collection('usagerecords_legacy_archive');
    await archiveCollection.insertMany(legacyRecords);
    console.log(`Successfully archived ${legacyRecords.length} records into usagerecords_legacy_archive.`);

    // Delete the un-dated legacy records from the active daily usagerecords collection
    await db.collection('usagerecords').deleteMany({ usageDate: { $exists: false } });
    console.log('Removed legacy un-dated records from active usagerecords.');
  }

  console.log('\n--- 2. UPDATING MONGODB INDEXES ON usagerecords ---');
  const existingIndexes = await db.collection('usagerecords').indexes();
  console.log('Existing indexes:', existingIndexes.map(i => i.name));

  // Drop conflicting old unique index on requestId if present
  if (existingIndexes.some(i => i.name === 'requestId_1')) {
    await db.collection('usagerecords').dropIndex('requestId_1');
    console.log('Dropped old index: requestId_1');
  }

  // Ensure unique index on { userId: 1, usageDate: 1 }
  try {
    await db.collection('usagerecords').createIndex(
      { userId: 1, usageDate: 1 },
      { unique: true, name: 'userId_1_usageDate_1' }
    );
    console.log('Successfully created unique index: userId_1_usageDate_1');
  } catch (idxErr) {
    console.log('Index note:', idxErr.message);
  }

  console.log('\n--- 3. MIGRATING USERS TO DAILY RENEWABLE LIMITS ---');
  const users = await User.find();
  console.log(`Found ${users.length} users to update.`);

  for (const user of users) {
    const plan = user.subscription?.plan || 'free';
    const dailyLimit = PLAN_LIMITS[plan] || 20;

    // Remove lifetime 15 restrictions from user document
    user.usage = {
      dailyRequestsLimit: dailyLimit,
      lastRequestAt: user.usage?.lastRequestAt || null,
    };
    await user.save();

    // Create fresh daily record for today
    const dailyRecord = await usageService.getOrCreateDailyRecord(user._id);
    console.log(`User [${user.name || user.email}] (${plan.toUpperCase()}): dailyLimit = ${dailyLimit}, remaining = ${dailyRecord.remainingRequests}`);
  }

  console.log('\n--- MIGRATION COMPLETE ---');
  await mongoose.disconnect();
}

migrate().catch(err => {
  console.error('Migration failed:', err);
  process.exit(1);
});
