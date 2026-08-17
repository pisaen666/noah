/**
 * =============================================================================
 * test-rewards.js — Unit test suite for Weekly Reward System logic
 * =============================================================================
 */

const assert = require('assert');

// Mock localStorage for Node environment
const store = {};
global.localStorage = {
  getItem: (k) => store[k] || null,
  setItem: (k, v) => { store[k] = String(v); },
  removeItem: (k) => { delete store[k]; },
  clear: () => { Object.keys(store).forEach((k) => delete store[k]); },
};

async function runTests() {
  console.log('\n🧪 Running Weekly Reward System Unit Tests...\n');

  // Dynamic import of ES modules
  const {
    calculateWeeklyRewards,
    getMondayOfWeek,
    formatDateKey,
    addDays,
    saveParentRewardConfig,
    getParentRewardConfig,
  } = await import('../src/rewards.js');

  let passed = 0;
  let failed = 0;

  function test(name, fn) {
    try {
      fn();
      console.log(`  ✅ [PASS] ${name}`);
      passed++;
    } catch (err) {
      console.error(`  ❌ [FAIL] ${name}`);
      console.error('     Error:', err.message);
      failed++;
    }
  }

  // 1. Date math & Monday-start ISO week calculation
  test('getMondayOfWeek correctly returns Monday for Sunday', () => {
    // 2026-08-16 is Sunday -> Monday was 2026-08-10
    const sun = new Date('2026-08-16T12:00:00');
    const mon = getMondayOfWeek(sun);
    assert.strictEqual(formatDateKey(mon), '2026-08-10');
  });

  test('getMondayOfWeek correctly returns Monday for Wednesday', () => {
    // 2026-08-12 is Wednesday -> Monday is 2026-08-10
    const wed = new Date('2026-08-12T12:00:00');
    const mon = getMondayOfWeek(wed);
    assert.strictEqual(formatDateKey(mon), '2026-08-10');
  });

  test('getMondayOfWeek correctly returns self for Monday', () => {
    const mon = new Date('2026-08-10T12:00:00');
    assert.strictEqual(formatDateKey(getMondayOfWeek(mon)), '2026-08-10');
  });

  // 2. Weekly Goal (7 completed days = 1 Golden Star)
  test('Awards 1 Golden Star when all 7 missions in a week are completed (colorId 10)', () => {
    const baseDate = new Date('2026-08-16T18:00:00'); // Sunday of week 2026-08-10 to 2026-08-16
    const mockEvents = [
      { start: { date: '2026-08-10' }, colorId: '10', summary: 'คำศัพท์วันนี้ - จันทร์' },
      { start: { date: '2026-08-11' }, colorId: '10', summary: 'คำศัพท์วันนี้ - อังคาร' },
      { start: { date: '2026-08-12' }, colorId: '10', summary: 'คำศัพท์วันนี้ - พุธ' },
      { start: { date: '2026-08-13' }, colorId: '10', summary: 'คำศัพท์วันนี้ - พฤหัส' },
      { start: { date: '2026-08-14' }, colorId: '10', summary: 'คำศัพท์วันนี้ - ศุกร์' },
      { start: { date: '2026-08-15' }, colorId: '10', summary: 'คำศัพท์วันนี้ - เสาร์' },
      { start: { date: '2026-08-16' }, colorId: '10', summary: 'คำศัพท์วันนี้ - อาทิตย์' },
    ];

    const result = calculateWeeklyRewards(mockEvents, baseDate, 4);
    assert.strictEqual(result.currentWeek.completedCount, 7);
    assert.strictEqual(result.currentWeek.isWeekCompleted, true);
    assert.strictEqual(result.currentWeek.starsEarned, 1);
    assert.strictEqual(result.totalStars, 1);
  });

  test('Awards 0 Golden Stars when only 6 missions in a week are completed', () => {
    const baseDate = new Date('2026-08-16T18:00:00');
    const mockEvents = [
      { start: { date: '2026-08-10' }, colorId: '10', summary: 'คำศัพท์วันนี้ - จันทร์' },
      { start: { date: '2026-08-11' }, colorId: '10', summary: 'คำศัพท์วันนี้ - อังคาร' },
      { start: { date: '2026-08-12' }, colorId: '10', summary: 'คำศัพท์วันนี้ - พุธ' },
      { start: { date: '2026-08-13' }, colorId: '10', summary: 'คำศัพท์วันนี้ - พฤหัส' },
      { start: { date: '2026-08-14' }, colorId: '10', summary: 'คำศัพท์วันนี้ - ศุกร์' },
      { start: { date: '2026-08-15' }, colorId: '10', summary: 'คำศัพท์วันนี้ - เสาร์' },
      // Sunday is not completed
    ];

    const result = calculateWeeklyRewards(mockEvents, baseDate, 4);
    assert.strictEqual(result.currentWeek.completedCount, 6);
    assert.strictEqual(result.currentWeek.isWeekCompleted, false);
    assert.strictEqual(result.currentWeek.starsEarned, 0);
    assert.strictEqual(result.totalStars, 0);
  });

  // 3. Multi-Week Accumulation
  test('Accumulates stars across 4 distinct weeks', () => {
    const baseDate = new Date('2026-08-17T12:00:00');
    const currentMon = getMondayOfWeek(baseDate);
    const mockEvents = [];

    // Complete all 7 days for 2 past weeks (weekIndex 1 and weekIndex 2)
    for (let w = 1; w <= 2; w++) {
      const mon = addDays(currentMon, -7 * w);
      for (let d = 0; d < 7; d++) {
        const dateStr = formatDateKey(addDays(mon, d));
        mockEvents.push({
          start: { date: dateStr },
          colorId: '10',
          summary: `คำศัพท์วันนี้ - ${dateStr}`,
        });
      }
    }

    const result = calculateWeeklyRewards(mockEvents, baseDate, 4);
    assert.strictEqual(result.totalStars, 2);
    assert.strictEqual(result.totalCompletedMissions, 14);
  });

  // 4. Streak Calculation
  test('Calculates active learning streak ending today or yesterday', () => {
    const baseDate = new Date('2026-08-17T12:00:00');
    const mockEvents = [
      { start: { date: '2026-08-15' }, colorId: '10', summary: 'คำศัพท์วันนี้' },
      { start: { date: '2026-08-16' }, colorId: '10', summary: 'คำศัพท์วันนี้' },
      { start: { date: '2026-08-17' }, colorId: '10', summary: 'คำศัพท์วันนี้' },
    ];

    const result = calculateWeeklyRewards(mockEvents, baseDate, 4);
    assert.strictEqual(result.currentStreak, 3);
  });

  // 5. Parent Custom Reward Settings
  test('Saves and loads parent custom reward configuration in localStorage', () => {
    saveParentRewardConfig({
      rewardText: 'พาไปสวนสนุกดรีมเวิลด์ 🎡',
      targetStars: 3,
    });

    const cfg = getParentRewardConfig();
    assert.strictEqual(cfg.rewardText, 'พาไปสวนสนุกดรีมเวิลด์ 🎡');
    assert.strictEqual(cfg.targetStars, 3);
  });

  // 6. Parent Goal Unlocking
  test('Goal unlock status evaluates properly when targetStars are reached', () => {
    saveParentRewardConfig({
      rewardText: 'ชุด LEGO Star Wars 🧱',
      targetStars: 2,
    });

    const baseDate = new Date('2026-08-17T12:00:00');
    const currentMon = getMondayOfWeek(baseDate);
    const mockEvents = [];

    // Complete 2 weeks
    for (let w = 1; w <= 2; w++) {
      const mon = addDays(currentMon, -7 * w);
      for (let d = 0; d < 7; d++) {
        mockEvents.push({
          start: { date: formatDateKey(addDays(mon, d)) },
          colorId: '10',
          summary: 'คำศัพท์วันนี้',
        });
      }
    }

    const result = calculateWeeklyRewards(mockEvents, baseDate, 4);
    assert.strictEqual(result.totalStars, 2);
    assert.strictEqual(result.parentReward.isUnlocked, true);
    assert.strictEqual(result.parentReward.remainingStars, 0);
    assert.strictEqual(result.parentReward.progressPercent, 100);
  });

  console.log(`\n----------------------------------------`);
  console.log(`Test Results: ${passed} Passed, ${failed} Failed`);
  console.log(`----------------------------------------\n`);

  if (failed > 0) {
    process.exit(1);
  }
}

runTests().catch((err) => {
  console.error('Unexpected error running tests:', err);
  process.exit(1);
});
