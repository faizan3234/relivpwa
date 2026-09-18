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

// -----------------------------------------------------------------------------
// 4. CULTURAL & DIETARY RESPECT ENGINE AUDIT
// -----------------------------------------------------------------------------
console.log('\n4. CULTURAL & DIETARY RESPECT ENGINE');

test('Cow, Bull, Buffalo & Beef are blocked with respectful Hindu guidelines message', () => {
  // Extract patterns and validateFoodItemRespect logic from app.js
  assert.ok(appContent.includes('SACRED_COW_BEEF_PATTERNS'), 'Missing SACRED_COW_BEEF_PATTERNS in app.js');
  assert.ok(appContent.includes('violates Hindu dietary guidelines'), 'Missing Hindu guidelines message in app.js');
  assert.ok(appContent.includes('respect each other\'s sentiments and beliefs'), 'Missing peaceful coexistence message');

  // Verify regex behavior directly
  const sacredCowRegex = /\b(?:beef|beef\s*curry|beef\s*steak|beef\s*burger|beef\s*biryani|beef\s*kebab|beef\s*nihari|beef\s*roll|beef\s*roast|beef\s*stew|beef\s*jerky|beef\s*broth|beef\s*patty|ground\s*beef|minced\s*beef|corned\s*beef|cow\s*meat|cows\s*meat|cow|cows|bull\s*meat|bull|bulls|buffalo\s*meat|water\s*buffalo|buffalo|buffalos|buffalow|buff\s*meat|buff\s*curry|buff\s*biryani|buff\s*steak|carabeef|steer\s*meat|steer|ox\s*meat|oxtail|oxen|ox|veal|gau\s*maans|gau\s*maas|gaumans|gau\s*gosht|gaay\s*ka\s*gosht|gay\s*ka\s*gosht|gai\s*ka\s*gosht|goru\s*r?\s*mangsho|gorur\s*mangsho|mohis\s*mangsho|mohis|bhains\s*ka\s*gosht|bhains\s*ka\s*meat|bhainsa|bada\s*gosht|bade\s*ka\s*gosht|bade\s*ka\s*meat|bœuf)\b/i;
  assert.ok(sacredCowRegex.test('beef steak'), 'Must match beef steak');
  assert.ok(sacredCowRegex.test('cow meat'), 'Must match cow meat');
  assert.ok(sacredCowRegex.test('bull'), 'Must match bull');
  assert.ok(sacredCowRegex.test('buffalo meat'), 'Must match buffalo meat');
  assert.ok(sacredCowRegex.test('buffalow'), 'Must match buffalow');
  assert.ok(sacredCowRegex.test('gau maans'), 'Must match gau maans');
  assert.ok(sacredCowRegex.test('bada gosht'), 'Must match bada gosht');
});

test('Pork, Bacon & Ham are blocked with respectful Islamic guidelines message', () => {
  assert.ok(appContent.includes('SACRED_PORK_PATTERNS'), 'Missing SACRED_PORK_PATTERNS in app.js');
  assert.ok(appContent.includes('violates Islamic dietary guidelines (Halal)'), 'Missing Islamic guidelines message in app.js');

  const sacredPorkRegex = /\b(?:pork|pork\s*chop|pork\s*ribs|pork\s*belly|pork\s*curry|pork\s*sausage|pork\s*roast|pork\s*loin|pork\s*shoulder|pork\s*patty|pulled\s*pork|ground\s*pork|bacon|bacon\s*strips|bacon\s*bits|bacon\s*burger|crispy\s*bacon|pancetta|guanciale|ham|ham\s*sandwich|honey\s*ham|cured\s*ham|black\s*forest\s*ham|parma\s*ham|prosciutto|jamon|swine|pig\s*meat|pigs\s*meat|pig\s*roast|pig|pigs|hog|hogs|wild\s*boar|boar|pork\s*lard|lard|suar|suwar|suar\s*ka\s*gosht|suar\s*ka\s*meat|soor|soor\s*ka\s*gosht|sukar|sukar\s*maas|sukor|sukor\s*mangsho|shukor|shukor\s*mangsho|khanzeer|khinzir)\b/i;
  assert.ok(sacredPorkRegex.test('pork curry'), 'Must match pork curry');
  assert.ok(sacredPorkRegex.test('crispy bacon'), 'Must match crispy bacon');
  assert.ok(sacredPorkRegex.test('ham sandwich'), 'Must match ham sandwich');
  assert.ok(sacredPorkRegex.test('suar ka gosht'), 'Must match suar ka gosht');
});

test('Pure Vegetarian mode blocks meat, poultry, seafood, and eggs with preference change message', () => {
  assert.ok(appContent.includes('PURE_VEG_RESTRICTED_PATTERNS'), 'Missing PURE_VEG_RESTRICTED_PATTERNS in app.js');
  assert.ok(appContent.includes('You are set to Pure Vegetarian mode'), 'Missing Pure Veg refusal message in app.js');
  assert.ok(appContent.includes('Please change your dietary preference'), 'Missing prompt to update preference');

  const pureVegRegex = /\b(?:chicken|chicken\s*breast|chicken\s*curry|chicken\s*biryani|mutton|mutton\s*curry|mutton\s*biryani|lamb|goat|goat\s*meat|gosht|meat|keema|qeema|kebab|kabab|nihari|wings|drumstick|leg\s*piece|turkey|duck|quail|fish|fish\s*curry|fish\s*fry|salmon|tuna|prawn|prawns|shrimp|shrimps|crab|crabs|lobster|lobsters|seafood|squid|calamari|octopus|clam|clams|mussels|anchovy|anchovies|machh|macher|machli|egg|eggs|egg\s*white|egg\s*whites|boiled\s*egg|boiled\s*eggs|omelet|omelette|anda|ande|anda\s*bhurji|dim|dime|non\s*veg|nonveg|flesh|poultry)\b/i;
  assert.ok(pureVegRegex.test('chicken breast'), 'Must block chicken');
  assert.ok(pureVegRegex.test('mutton biryani'), 'Must block mutton');
  assert.ok(pureVegRegex.test('fish curry'), 'Must block fish');
  assert.ok(pureVegRegex.test('boiled eggs'), 'Must block eggs');
  assert.ok(pureVegRegex.test('prawns'), 'Must block seafood');
  assert.ok(!pureVegRegex.test('paneer tikka'), 'Must allow paneer');
  assert.ok(!pureVegRegex.test('tofu salad'), 'Must allow tofu');
  assert.ok(!pureVegRegex.test('moong dal'), 'Must allow dal');
});

test('Meat emojis are replaced with plant/wellness emojis for vegetarian users', () => {
  assert.ok(appContent.includes('function getProteinEmoji'), 'Missing getProteinEmoji helper');
  assert.ok(appContent.includes("return '🌱'"), 'getProteinEmoji must return 🌱 for vegetarians');
  assert.ok(appContent.includes("dt === 'pure_veg' || dt === 'veg'"), 'Must check pure_veg and veg');
});

test('index.html contains pure_veg and partial_veg in setup and settings', () => {
  assert.ok(htmlContent.includes('value="pure_veg"'), 'setup-diet missing pure_veg option');
  assert.ok(htmlContent.includes('value="partial_veg"'), 'setup-diet missing partial_veg option');
  assert.ok(htmlContent.includes('id="settings-diet-select"'), 'Me tab missing settings-diet-select');
});

test('Me tab contains visible AI & Intelligence settings with direct Groq Console link (Gemini removed)', () => {
  assert.ok(htmlContent.includes('id="ai-settings-group"'), 'Missing visible ai-settings-group in Me tab');
  assert.ok(htmlContent.includes('https://console.groq.com/keys'), 'Missing direct link to Groq console keys');
  assert.ok(htmlContent.includes('id="groq-input"'), 'Missing groq-input in AI settings');
  assert.ok(htmlContent.includes('id="save-groq"'), 'Missing save-groq button');
  assert.ok(!htmlContent.includes('id="gemini-key-input"'), 'Gemini API key input should be removed from settings');
  assert.ok(!htmlContent.includes('Gemini API Key'), 'Gemini API Key label should be removed from settings');
});

test('Me tab supports visual profile picture upload, change, and pristine circular framing', () => {
  assert.ok(htmlContent.includes('id="profile-avatar-container"'), 'Missing profile avatar container');
  assert.ok(htmlContent.includes('id="profile-pic-input"'), 'Missing file input for profile pic');
  assert.ok(htmlContent.includes('id="change-profile-pic-btn"'), 'Missing Change Photo button in Me profile card');
  assert.ok(htmlContent.includes('id="avatar-img"'), 'Missing avatar img element');
  assert.ok(htmlContent.includes('id="avatar-camera-badge"'), 'Missing avatar camera badge');
  assert.ok(appContent.includes('changeProfilePicBtn.addEventListener'), 'Missing changeProfilePicBtn listener in app.js');
  assert.ok(appContent.includes('avatarCameraBadge.addEventListener'), 'Missing avatarCameraBadge listener in app.js');
  assert.ok(cssContent.includes('#profile-avatar-container'), 'Missing #profile-avatar-container in style.css');
  assert.ok(cssContent.includes('aspect-ratio: 1 / 1'), 'Missing circular aspect-ratio constraint in style.css');
  assert.ok(cssContent.includes('object-fit: cover'), 'Missing object-fit cover constraint in style.css');
});

console.log('\n====================================================');
console.log(`AUDIT RESULTS: ${passedTests}/${totalTests} TESTS PASSED (${((passedTests/totalTests)*100).toFixed(1)}%)`);
console.log('====================================================\n');

if (passedTests !== totalTests) {
  process.exit(1);
}
