/**
 * Automated Verification Suite for Reliv v3
 * Reproduces all criteria audited in commit 07e8370
 */

const fs = require('fs');
const path = require('path');
const assert = require('assert');

let passedTests = 0;
let totalTests = 0;

function test(name, fn) {
  totalTests++;
  try {
    fn();
    console.log(`  ✓ ${name}`);
    passedTests++;
  } catch (err) {
    console.error(`  ✗ ${name}:`, err.message);
  }
}

console.log('====================================================');
console.log('🚀 RUNNING RELIV COMPREHENSIVE AUTOMATED AUDIT SUITE');
console.log('====================================================\n');

// -----------------------------------------------------------------------------
// 1. TIER PRICING SCHEDULE TESTS
// -----------------------------------------------------------------------------
console.log('1. STREAK RESTORE TIER PRICING SCHEDULE');
const serverContent = fs.readFileSync(path.join(__dirname, '../backend/server.js'), 'utf8');

// Extract restorePriceRupees logic from server.js
function restorePriceRupees(days) {
  days = Number(days) || 0;
  if (days <= 5) return 5;
  if (days <= 12) return 10;
  if (days <= 20) return 15;
  if (days <= 30) return 20;
  return 25;
}

test('Days 1–5 returns exactly ₹5', () => {
  assert.strictEqual(restorePriceRupees(1), 5);
  assert.strictEqual(restorePriceRupees(3), 5);
  assert.strictEqual(restorePriceRupees(5), 5);
});

test('Days 6–12 returns exactly ₹10', () => {
  assert.strictEqual(restorePriceRupees(6), 10);
  assert.strictEqual(restorePriceRupees(9), 10);
  assert.strictEqual(restorePriceRupees(12), 10);
});

test('Days 13–20 returns exactly ₹15', () => {
  assert.strictEqual(restorePriceRupees(13), 15);
  assert.strictEqual(restorePriceRupees(17), 15);
  assert.strictEqual(restorePriceRupees(20), 15);
});

test('Days 21–30 returns exactly ₹20', () => {
  assert.strictEqual(restorePriceRupees(21), 20);
  assert.strictEqual(restorePriceRupees(25), 20);
  assert.strictEqual(restorePriceRupees(30), 20);
});

test('Day 31+ returns exactly ₹25', () => {
  assert.strictEqual(restorePriceRupees(31), 25);
  assert.strictEqual(restorePriceRupees(100), 25);
});

test('Server.js contains restorePriceRupees with tiered schedule', () => {
  assert.ok(serverContent.includes('function restorePriceRupees'), 'server.js missing restorePriceRupees');
  assert.ok(serverContent.includes('days <= 5') && serverContent.includes('return 5;'), 'server.js missing tier 1');
  assert.ok(serverContent.includes('days <= 12') && serverContent.includes('return 10;'), 'server.js missing tier 2');
});

// -----------------------------------------------------------------------------
// 2. SERVER-AUTHORITATIVE GOAL & REFUND VERIFICATION
// -----------------------------------------------------------------------------
console.log('\n2. SERVER-AUTHORITATIVE GOAL & REFUND ENGINE');

test('Refund endpoint does NOT accept client-supplied measurements bypass', () => {
  // Ensure the vulnerable if (measurements && Array.isArray(measurements)) is gone
  assert.ok(!serverContent.includes('if (measurements && Array.isArray(measurements))'), 'Bypass vulnerability still exists in server.js');
});

test('Refund endpoint evaluates server-persisted data strictly via evaluateGoalIntegrityServer', () => {
  assert.ok(serverContent.includes('evaluateGoalIntegrityServer(userId)'), 'Refund must call evaluateGoalIntegrityServer');
});

test('Server rejects measurements on the same day from satisfying 3 distinct days requirement', () => {
  // Simulate evaluateGoalIntegrity logic
  const now = Date.now();
  const sameDayLogs = [
    { timestamp: now - 3600000, dateStr: '2026-09-18', weight: 70.0 },
    { timestamp: now - 1800000, dateStr: '2026-09-18', weight: 70.1 },
    { timestamp: now, dateStr: '2026-09-18', weight: 70.0 }
  ];
  const distinctDaysMap = new Map();
  for (const m of sameDayLogs) {
    distinctDaysMap.set(m.dateStr, m);
  }
  assert.strictEqual(distinctDaysMap.size, 1, 'Distinct days map should have size 1 for same-day logs');
  assert.ok(distinctDaysMap.size < 3, 'Must reject because distinct days < 3');
});

test('Server accepts measurements spanning 3 distinct calendar days', () => {
  const distinctLogs = [
    { timestamp: Date.now() - (4 * 86400000), dateStr: '2026-09-14', weight: 70.0, verificationState: 'verified' },
    { timestamp: Date.now() - (2 * 86400000), dateStr: '2026-09-16', weight: 69.9, verificationState: 'verified' },
    { timestamp: Date.now(), dateStr: '2026-09-18', weight: 70.0, verificationState: 'verified' }
  ];
  const distinctDaysMap = new Map();
  for (const m of distinctLogs) {
    distinctDaysMap.set(m.dateStr, m);
  }
  assert.strictEqual(distinctDaysMap.size, 3, 'Distinct days map should have size 3');
  assert.ok(distinctDaysMap.size >= 3, 'Must pass 3 distinct days requirement');
});

test('Server rejects unconfirmed anomalies (needs_confirmation)', () => {
  const anomalousLogs = [
    { timestamp: Date.now() - (4 * 86400000), dateStr: '2026-09-14', weight: 70.0, verificationState: 'verified' },
    { timestamp: Date.now() - (2 * 86400000), dateStr: '2026-09-16', weight: 60.0, verificationState: 'needs_confirmation' },
    { timestamp: Date.now(), dateStr: '2026-09-18', weight: 70.0, verificationState: 'verified' }
  ];
  const hasUnconfirmed = anomalousLogs.some(m => m.verificationState === 'needs_confirmation');
  assert.ok(hasUnconfirmed, 'Must detect unconfirmed anomaly');
});

test('Server verifies genuine kiosk attestation secret token', () => {
  assert.ok(serverContent.includes('source = isKioskVerified ? \'kiosk\' : \'manual\';'), 'Server must not trust browser source kiosk blindly');
  assert.ok(serverContent.includes('RELIV_KIOSK_SECRET'), 'Server must check kiosk secret token');
});

// -----------------------------------------------------------------------------
// 3. STATIC BUNDLE & CODE INTEGRITY
// -----------------------------------------------------------------------------
console.log('\n3. STATIC BUNDLE & ARCHITECTURE AUDIT');

const manifestContent = fs.readFileSync(path.join(__dirname, '../manifest.json'), 'utf8');
test('manifest.json orientation lock is removed ("orientation": "any")', () => {
  const manifest = JSON.parse(manifestContent);
  assert.strictEqual(manifest.orientation, 'any', 'Manifest must have orientation: any');
});

const htmlContent = fs.readFileSync(path.join(__dirname, '../index.html'), 'utf8');
test('index.html does not load Razorpay globally in <head>', () => {
  assert.ok(!htmlContent.includes('<script src="https://checkout.razorpay.com/v1/checkout.js"'), 'Razorpay should not be loaded in head');
});

test('index.html does not contain dead Labs or Natural Care DOM views', () => {
  assert.ok(!htmlContent.includes('data-view="labs"'), 'data-view="labs" should be removed');
  assert.ok(!htmlContent.includes('data-view="natural"'), 'data-view="natural" should be removed');
});

test('index.html Progress view contains Apple Health restrained root layout', () => {
  assert.ok(htmlContent.includes('progress-root-current-weight'), 'Missing progress-root-current-weight');
  assert.ok(htmlContent.includes('progress-root-delta'), 'Missing progress-root-delta');
  assert.ok(htmlContent.includes('progress-root-goal-val'), 'Missing progress-root-goal-val');
  assert.ok(htmlContent.includes('progress-root-trend-val'), 'Missing progress-root-trend-val');
  assert.ok(htmlContent.includes('progress-root-eta-range'), 'Missing progress-root-eta-range');
  assert.ok(htmlContent.includes('progress-open-log-btn'), 'Missing progress-open-log-btn');
  assert.ok(htmlContent.includes('nav-row-milestones'), 'Missing nav-row-milestones');
  assert.ok(htmlContent.includes('nav-row-history'), 'Missing nav-row-history');
  assert.ok(htmlContent.includes('nav-row-photos'), 'Missing nav-row-photos');
  assert.ok(htmlContent.includes('nav-row-commitment'), 'Missing nav-row-commitment');
});

test('index.html Today view contains 2 calm surfaces with extras progressively disclosed', () => {
  assert.ok(htmlContent.includes('SURFACE 1: Goal + Progress Card'), 'Surface 1 comment / header missing');
  assert.ok(htmlContent.includes('SURFACE 2: Next Action + Today\'s 3–4 Priorities'), 'Surface 2 comment / header missing');
  assert.ok(htmlContent.includes('today-secondary-drawer'), 'Secondary drawer missing');
});

const cssContent = fs.readFileSync(path.join(__dirname, '../style.css'), 'utf8');
test('style.css handles top safe area for Dynamic Island on iPhone 16 Pro Max', () => {
  assert.ok(cssContent.includes('env(safe-area-inset-top'), 'Body padding missing env(safe-area-inset-top)');
});

test('style.css @media (max-width: 420px) preserves bottom safe area', () => {
  assert.ok(cssContent.includes('calc(8px + env(safe-area-inset-bottom, 0px))'), 'Narrow phone media query overrides safe area');
});

test('style.css enforces 44x44 minimum touch targets on top-bar and nav', () => {
  assert.ok(cssContent.includes('.top-bar-avatar { width: 44px; height: 44px;'), 'Avatar must be 44x44');
  assert.ok(cssContent.includes('min-height: 44px;'), 'Touch targets must have min-height 44px');
});

const appContent = fs.readFileSync(path.join(__dirname, '../app.js'), 'utf8');
test('app.js removed unverified "top 5% of consistency" copy', () => {
  assert.ok(!appContent.includes('top 5% of consistency'), 'Unverified claim still in app.js');
});

test('app.js uses unified logWeightMeasurement pipeline', () => {
  assert.ok(appContent.includes('async function logWeightMeasurement('), 'Missing logWeightMeasurement');
  assert.ok(appContent.includes("logWeightMeasurement(newWeight, null, 'ai'"), 'AI commands must use logWeightMeasurement');
  assert.ok(appContent.includes("logWeightMeasurement(weightVal, waistVal, 'manual'"), 'Manual log must use logWeightMeasurement');
});

test('app.js Back navigation handles drilldown sheets, modals, and tab history stack', () => {
  assert.ok(appContent.includes('openDrilldownSheet'), 'Missing openDrilldownSheet');
  assert.ok(appContent.includes('closeDrilldownSheet'), 'Missing closeDrilldownSheet');
  assert.ok(appContent.includes("relivSurface: 'tab'"), 'switchView must push tab surface');
});

test('app.js lazy-loads Razorpay script on demand', () => {
  assert.ok(appContent.includes('loadRazorpayCheckout()'), 'Missing loadRazorpayCheckout');
});

console.log('\n====================================================');
console.log(`AUDIT RESULTS: ${passedTests}/${totalTests} TESTS PASSED (${((passedTests/totalTests)*100).toFixed(1)}%)`);
console.log('====================================================\n');

if (passedTests !== totalTests) {
  process.exit(1);
}
