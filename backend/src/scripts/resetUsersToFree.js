import { connectDB, disconnectDB } from '../config/database.js';
import User from '../models/User.js';
import Subscription from '../models/Subscription.js';

async function main() {
  await connectDB();
  console.log('Resetting all users to free tier...');
  const users = await User.find({});
  for (const u of users) {
    console.log(`User: ${u.email}, previous plan: ${u.subscription?.plan || 'none'}`);
    u.subscription = {
      plan: 'free',
      status: 'active',
      isDemo: false,
    };
    await u.save();
  }

  await Subscription.deleteMany({});
  console.log('Successfully set all accounts to FREE tier and purged any old test subscriptions.');
  await disconnectDB();
}

main().catch(console.error);
