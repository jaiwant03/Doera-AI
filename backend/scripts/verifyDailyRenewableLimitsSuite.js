import mongoose from 'mongoose';
import dotenv from 'dotenv';
dotenv.config();

import User from '../src/models/User.js';
import Subscription from '../src/models/Subscription.js';
import UsageRecord from '../src/models/UsageRecord.js';
import usageService, { QuotaExceededError } from '../src/services/usageService.js';
import { PLAN_LIMITS } from '../src/config/entitlements.js';

let passedTests = 0;
let failedTests = 0;

function assert(condition, testName) {
  if (condition) {
    console.log(`  ✓ PASS: ${testName}`);
    passedTests++;
  } else {
    console.error(`  ✗ FAIL: ${testName}`);
    failedTests++;
  }
}

async function runSuite() {
  console.log('====================================================');
  console.log('  DOERA AI — DAILY RENEWABLE LIMITS VERIFICATION SUITE');
  console.log('====================================================\n');

  await mongoose.connect(process.env.MONGODB_URI);

  // Setup dedicated test user
  const testEmail = `daily_test_${Date.now()}@doera.ai`;
  const user = await User.create({
    name: 'Daily Limit Tester',
    email: testEmail,
    password: 'Password123!',
    role: 'user',
    subscription: { plan: 'free', status: 'active' },
    usage: { dailyRequestsLimit: 20 },
  });
  const userId = user._id;

  try {
    // ------------------------------------------------------------------------
    console.log('[TEST 1] FREE PLAN (20 requests/day & 21st rejection)');
    // ------------------------------------------------------------------------
    const day1 = '2026-11-14';
    const initialSummary = await usageService.getUsageSummary(userId, day1);
    assert(initialSummary.plan === 'free', 'Initial plan is free');
    assert(initialSummary.dailyLimit === 20, 'Free daily limit is exactly 20');
    assert(initialSummary.usedRequests === 0, 'Initial used requests is 0');
    assert(initialSummary.remainingRequests === 20, 'Initial remaining requests is 20');
    assert(typeof initialSummary.resetsIn === 'string', 'resetsIn formatted properly');

    // Reserve 20 requests in sequence
    for (let i = 1; i <= 20; i++) {
      const res = await usageService.reserveQuota({
        userId,
        requestId: `req-free-${i}`,
        requestType: 'message',
        testDate: day1,
      });
      await usageService.completeQuota(`req-free-${i}`);
    }

    const summaryAfter20 = await usageService.getUsageSummary(userId, day1);
    assert(summaryAfter20.usedRequests === 20, 'Used requests is 20 after 20 completions');
    assert(summaryAfter20.remainingRequests === 0, 'Remaining requests is 0 after 20 completions');

    // 21st request MUST be rejected
    let rejected21 = false;
    let errorCode = null;
    try {
      await usageService.reserveQuota({
        userId,
        requestId: 'req-free-21',
        requestType: 'message',
        testDate: day1,
      });
    } catch (err) {
      if (err instanceof QuotaExceededError) {
        rejected21 = true;
        errorCode = err.details?.error;
      }
    }
    assert(rejected21 === true, '21st request was rejected');
    assert(errorCode === 'DAILY_LIMIT_REACHED', 'Error code is DAILY_LIMIT_REACHED');

    // ------------------------------------------------------------------------
    console.log('\n[TEST 2] AUTOMATIC DAILY RESET (Next Day Boundary)');
    // ------------------------------------------------------------------------
    const day2 = '2026-11-15';
    // User had 0 remaining on day 1; on day 2, allowance should be full 20!
    const day2Summary = await usageService.getUsageSummary(userId, day2);
    assert(day2Summary.usedRequests === 0, 'Day 2 used requests automatically starts at 0');
    assert(day2Summary.remainingRequests === 20, 'Day 2 remaining requests automatically restored to 20');
    assert(day2Summary.dailyLimit === 20, 'Day 2 daily limit is 20');

    // Request on Day 2 MUST succeed
    const day2Req = await usageService.reserveQuota({
      userId,
      requestId: 'req-day2-1',
      requestType: 'message',
      testDate: day2,
    });
    assert(day2Req.remaining === 19, 'Day 2 first request accepted with 19 remaining');
    await usageService.completeQuota('req-day2-1');

    // ------------------------------------------------------------------------
    console.log('\n[TEST 3] PRO PLAN (300 requests/day & Instant Upgrade)');
    // ------------------------------------------------------------------------
    // Upgrade user to Pro
    await Subscription.findOneAndUpdate(
      { userId },
      { plan: 'pro', status: 'active', currentPeriodEnd: new Date(Date.now() + 30 * 86400000) },
      { upsert: true }
    );
    await User.findByIdAndUpdate(userId, { 'subscription.plan': 'pro' });

    // On day 2, user used 1 request. Daily limit is now 300!
    const proRecord = await usageService.getOrCreateDailyRecord(userId, day2);
    assert(proRecord.plan === 'pro', 'Usage record updated to pro tier');
    assert(proRecord.dailyLimit === 300, 'Pro daily limit is 300');
    assert(proRecord.usedRequests === 1, 'Maintains 1 already used today');
    assert(proRecord.remainingRequests === 299, 'Remaining requests updated to 299');

    // Simulate usage up to 300 requests on day 2
    await UsageRecord.findOneAndUpdate(
      { userId, usageDate: day2 },
      { $set: { usedRequests: 300, remainingRequests: 0 } }
    );

    let proRejected = false;
    try {
      await usageService.reserveQuota({
        userId,
        requestId: 'req-pro-301',
        requestType: 'message',
        testDate: day2,
      });
    } catch (err) {
      if (err instanceof QuotaExceededError) {
        proRejected = true;
      }
    }
    assert(proRejected === true, 'Pro 301st request rejected at daily limit');

    // Day 3 auto reset for Pro
    const day3 = '2026-11-16';
    const day3Pro = await usageService.getUsageSummary(userId, day3);
    assert(day3Pro.dailyLimit === 300, 'Day 3 Pro daily limit is 300');
    assert(day3Pro.usedRequests === 0, 'Day 3 Pro used requests is 0');
    assert(day3Pro.remainingRequests === 300, 'Day 3 Pro remaining requests restored to 300');

    // ------------------------------------------------------------------------
    console.log('\n[TEST 4] MAX PLAN (500 requests/day & Auto-Reset)');
    // ------------------------------------------------------------------------
    // Upgrade to Max
    await Subscription.findOneAndUpdate(
      { userId },
      { plan: 'max', status: 'active', currentPeriodEnd: new Date(Date.now() + 30 * 86400000) }
    );
    await User.findByIdAndUpdate(userId, { 'subscription.plan': 'max' });

    const maxSummary = await usageService.getUsageSummary(userId, day3);
    assert(maxSummary.plan === 'max', 'User plan is now max');
    assert(maxSummary.dailyLimit === 500, 'Max plan daily limit is 500');
    assert(maxSummary.remainingRequests === 500, 'Max plan remaining requests is 500');

    // Simulate usage up to 500 on day 3
    await usageService.getOrCreateDailyRecord(userId, day3);
    await UsageRecord.findOneAndUpdate(
      { userId, usageDate: day3 },
      { $set: { usedRequests: 500, remainingRequests: 0 } }
    );

    let maxRejected = false;
    try {
      await usageService.reserveQuota({
        userId,
        requestId: 'req-max-501',
        requestType: 'message',
        testDate: day3,
      });
    } catch (err) {
      if (err instanceof QuotaExceededError) {
        maxRejected = true;
      }
    }
    assert(maxRejected === true, 'Max 501st request rejected at daily limit');

    // Day 4 auto reset for Max
    const day4 = '2026-11-17';
    const day4Max = await usageService.getUsageSummary(userId, day4);
    assert(day4Max.dailyLimit === 500, 'Day 4 Max daily limit is 500');
    assert(day4Max.usedRequests === 0, 'Day 4 Max used requests is 0');
    assert(day4Max.remainingRequests === 500, 'Day 4 Max remaining requests restored to 500');

    // ------------------------------------------------------------------------
    console.log('\n[TEST 5] CONCURRENT REQUESTS RACE-CONDITION PROTECTION');
    // ------------------------------------------------------------------------
    const day5 = '2026-11-18';
    // User starts day 5 on Max (500 limit). Set used to 498 so only 2 remain!
    await usageService.getOrCreateDailyRecord(userId, day5);
    await UsageRecord.findOneAndUpdate(
      { userId, usageDate: day5 },
      { $set: { usedRequests: 498, remainingRequests: 2 } }
    );

    // Fire 10 concurrent reservation attempts simultaneously
    const concurrentAttempts = Array.from({ length: 10 }, (_, i) =>
      usageService.reserveQuota({
        userId,
        requestId: `req-race-${i}`,
        testDate: day5,
      }).then(() => 'ACCEPTED').catch((err) => (err instanceof QuotaExceededError ? 'REJECTED' : 'ERROR'))
    );

    const raceResults = await Promise.all(concurrentAttempts);
    const acceptedCount = raceResults.filter(r => r === 'ACCEPTED').length;
    const rejectedCount = raceResults.filter(r => r === 'REJECTED').length;

    assert(acceptedCount === 2, `Exactly 2 requests accepted under concurrency (got ${acceptedCount})`);
    assert(rejectedCount === 8, `Exactly 8 requests rejected under concurrency (got ${rejectedCount})`);

    // ------------------------------------------------------------------------
    console.log('\n[TEST 6] IDEMPOTENCY KEY HANDLING (No Double-Charging)');
    // ------------------------------------------------------------------------
    const day6 = '2026-11-19';
    const idempotencyKey = `idemp-${Date.now()}`;

    // First call
    const firstCall = await usageService.reserveQuota({
      userId,
      requestId: 'req-idem-1',
      idempotencyKey,
      testDate: day6,
    });
    assert(firstCall.isDuplicate === false, 'First idempotent call is NOT duplicate');

    // Duplicate call with same idempotencyKey
    const secondCall = await usageService.reserveQuota({
      userId,
      requestId: 'req-idem-2',
      idempotencyKey,
      testDate: day6,
    });
    assert(secondCall.isDuplicate === true, 'Duplicate call detected via idempotencyKey');
    assert(secondCall.alreadyCharged === true, 'Duplicate call was not charged twice');

    // ------------------------------------------------------------------------
    console.log('\n[TEST 7] RESERVATION RELEASE ON EXECUTION ERROR');
    // ------------------------------------------------------------------------
    const releaseReqId = 'req-to-release';
    const preRelease = await usageService.reserveQuota({
      userId,
      requestId: releaseReqId,
      testDate: day6,
    });
    const beforeReleaseSummary = await usageService.getUsageSummary(userId, day6);

    // Simulate failure and release
    await usageService.releaseQuota(userId, releaseReqId, 'Simulated provider error');

    const afterReleaseSummary = await usageService.getUsageSummary(userId, day6);
    assert(
      afterReleaseSummary.remainingRequests === beforeReleaseSummary.remainingRequests + 1,
      'Remaining requests restored by 1 after failure release'
    );

    // ------------------------------------------------------------------------
    console.log('\n[TEST 8] SUBSCRIPTION EXPIRATION FALLBACK');
    // ------------------------------------------------------------------------
    // Set currentPeriodEnd to yesterday
    await Subscription.findOneAndUpdate(
      { userId },
      { currentPeriodEnd: new Date(Date.now() - 86400000) }
    );

    const expiredPlan = await usageService.getVerifiedUserPlan(userId);
    assert(expiredPlan === 'free', 'Expired subscription automatically reverts to free plan');
    const expiredSummary = await usageService.getUsageSummary(userId, '2026-11-20');
    assert(expiredSummary.dailyLimit === 20, 'Expired user receives free daily limit (20)');

    // ------------------------------------------------------------------------
    console.log('\n[TEST 9] UNIQUE COMPOUND INDEX ENFORCEMENT');
    // ------------------------------------------------------------------------
    // Attempt to insert a second record for the same userId and usageDate
    let duplicateIndexCaught = false;
    try {
      await UsageRecord.create({
        userId,
        plan: 'free',
        usageDate: day1,
        dailyLimit: 20,
        resetAt: new Date(),
      });
    } catch (mongoErr) {
      if (mongoErr.code === 11000) {
        duplicateIndexCaught = true;
      }
    }
    assert(duplicateIndexCaught === true, 'Compound index prevents duplicate daily records for same date');

  } finally {
    // Clean up test data
    await User.findByIdAndDelete(userId);
    await Subscription.deleteMany({ userId });
    await UsageRecord.deleteMany({ userId });
    console.log('\nTest user and temporary records cleaned up.');
    await mongoose.disconnect();
  }

  console.log('\n====================================================');
  console.log(`  VERIFICATION RESULTS: ${passedTests} PASSED, ${failedTests} FAILED`);
  console.log('====================================================');

  if (failedTests > 0) {
    process.exit(1);
  }
}

runSuite().catch(err => {
  console.error('Test suite runtime error:', err);
  process.exit(1);
});
