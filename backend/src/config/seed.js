import User from '../models/User.js';

export const seedDefaultUsers = async () => {
  try {
    // Ensure primary user abc@gmail.com is present in FREE tier
    const primaryEmail = 'abc@gmail.com';
    let primaryUser = await User.findOne({ email: primaryEmail });
    if (!primaryUser) {
      primaryUser = await User.create({
        name: 'JK',
        email: primaryEmail,
        password: '123456',
        role: 'user',
        subscription: {
          plan: 'free',
          status: 'active',
        },
      });
      console.log('[DOERA DB] Verified primary user in Free tier: abc@gmail.com');
    } else if (primaryUser.subscription?.plan !== 'free') {
      primaryUser.subscription.plan = 'free';
      await primaryUser.save();
      console.log('[DOERA DB] Reset primary user to Free tier: abc@gmail.com');
    }

    // Clean up any old demo user
    await User.deleteOne({ email: 'demo@doera.ai' }).catch(() => {});

    // Ensure dedicated Hackathon Judge account is present in FREE tier
    const judgeEmail = 'judge@doera.ai';
    let judgeUser = await User.findOne({ email: judgeEmail });
    if (!judgeUser) {
      judgeUser = await User.create({
        name: 'Hackathon Judge',
        email: judgeEmail,
        password: 'hackathon2026',
        role: 'user',
        subscription: {
          plan: 'free',
          status: 'active',
        },
      });
      console.log('[DOERA DB] Verified Hackathon Judge user in Free tier: judge@doera.ai');
    } else if (judgeUser.subscription?.plan !== 'free') {
      judgeUser.subscription.plan = 'free';
      await judgeUser.save();
      console.log('[DOERA DB] Reset Hackathon Judge user to Free tier: judge@doera.ai');
    }
  } catch (err) {
    console.error('[DOERA DB] Seed users error:', err.message);
  }
};
