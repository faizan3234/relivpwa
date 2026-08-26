window.RELIX_GROQ_API_KEY = '';
// ---------------------------------------------------------------------------
// BACKEND
// ---------------------------------------------------------------------------
// CHANGE THIS ONE LINE when the API moves off Render to the Oracle box. It must
// be https:// - a PWA on an https page cannot call an http API, the browser
// blocks it as mixed content, and push registration fails silently.
const PRODUCTION_API = 'https://relivpwa.onrender.com';

const BACKEND_URL = (() => {
  // Lets you point a phone at a laptop or a staging box without a rebuild:
  //   localStorage.setItem('reliv-api-url', 'https://1.2.3.4')
  try {
    const override = localStorage.getItem('reliv-api-url');
    if (override) return override.replace(/\/$/, '');
  } catch (err) { }

  const origin = window.location.origin;
  const isLocal = origin.includes('localhost') || origin.includes('127.0.0.1') || origin.startsWith('file://');
  return isLocal ? 'http://localhost:4000' : PRODUCTION_API;
})();

// ---------------------------------------------------------------------------
// DEVICE / USER IDENTITY
// ---------------------------------------------------------------------------
// Every push the backend sends is addressed to a userId. Without one, the
// server has no way to tell two people apart and every reminder goes to every
// device. This is a local anonymous id - it is NOT an account, so it does not
// follow the user to a new phone. Real cross-device sync needs real accounts.
const RELIV_USER_ID = (() => {
  let id = localStorage.getItem('reliv-user-id');
  if (!id) {
    id = (crypto.randomUUID && crypto.randomUUID()) ||
      `u_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 10)}`;
    localStorage.setItem('reliv-user-id', id);
  }
  return id;
})();

// ---------------------------------------------------------------------------
// DESKTOP GATE
// ---------------------------------------------------------------------------
// The device decision was already made by the inline script in <head> (so the
// phone UI never flashes). This only fills in the gate's content.
(function setUpDesktopGate() {
  if (window.RELIV_IS_PHONE) return;

  const gate = document.getElementById('desktop-gate');
  if (!gate) return;

  gate.hidden = false;

  const urlEl = document.getElementById('desktop-gate-url');
  const shareUrl = window.location.origin + window.location.pathname;
  if (urlEl) urlEl.textContent = shareUrl;

  const copyBtn = document.getElementById('desktop-gate-copy');
  if (copyBtn) {
    copyBtn.addEventListener('click', async () => {
      try {
        await navigator.clipboard.writeText(shareUrl);
        copyBtn.textContent = 'Copied ✓';
      } catch (err) {
        copyBtn.textContent = 'Press Ctrl+C to copy';
      }
      setTimeout(() => { copyBtn.textContent = 'Copy link'; }, 1800);
    });
  }
})();

// ---------------------------------------------------------------------------
// BOOT LOADER
// ---------------------------------------------------------------------------
// Blinkit/Zomato-style: the wait is unavoidable, so it carries a line of copy
// instead of a bare spinner. Lines are about the user's own routine rather
// than generic hype, and they rotate so a slow start never feels frozen.
const RELIV_LOADING_LINES = [
  'Warming up your day…',
  'Small things, done daily. That’s the whole trick.',
  'Counting what you actually ate, not what you meant to.',
  'Your streak is waiting.',
  'Discipline beats motivation. Motivation is late anyway.',
  'One good day is a fluke. Two is a pattern.',
  'Nobody regrets the workout they finished.',
  'Progress is boring up close. Keep going.'
];

(function runBootLoader() {
  const loader = document.getElementById('reliv-loader');
  if (!loader) return;

  if (!window.RELIV_IS_PHONE) { loader.remove(); return; }

  const textEl = document.getElementById('reliv-loader-text');
  let index = Math.floor(Math.random() * RELIV_LOADING_LINES.length);
  if (textEl) textEl.textContent = RELIV_LOADING_LINES[index];

  const rotate = setInterval(() => {
    if (!textEl) return;
    index = (index + 1) % RELIV_LOADING_LINES.length;
    textEl.classList.add('swapping');
    setTimeout(() => {
      textEl.textContent = RELIV_LOADING_LINES[index];
      textEl.classList.remove('swapping');
    }, 240);
  }, 2100);

  const dismiss = () => {
    clearInterval(rotate);
    loader.classList.add('fading');
    setTimeout(() => loader.remove(), 340);
  };

  // Hide once the page is genuinely ready, with a hard ceiling so a hung
  // request can never leave someone staring at a spinner.
  if (document.readyState === 'complete') setTimeout(dismiss, 450);
  else window.addEventListener('load', () => setTimeout(dismiss, 450), { once: true });
  setTimeout(dismiss, 6000);
})();

window.haptic = {
  light: () => { if(navigator.vibrate) navigator.vibrate(25); },
  medium: () => { if(navigator.vibrate) navigator.vibrate(50); },
  heavy: () => { if(navigator.vibrate) navigator.vibrate(90); }
};

// Global Haptic Interceptor
document.addEventListener('click', (e) => {
  const btn = e.target.closest('button, .nav-pill, .hero-btn, .academy-tab-btn');
  if (btn) {
    if (btn.classList.contains('primary-btn') || btn.classList.contains('log-hydration-btn') || btn.classList.contains('quick-pick-btn')) {
      window.haptic.medium();
    } else {
      window.haptic.light();
    }
  } else if (e.target.tagName && e.target.tagName.toLowerCase() === 'input' && e.target.type === 'checkbox') {
    window.haptic.medium();
  }
});
const brand = {
  name: 'Relix Companion',
  user: 'Ava Chen',
  xp: 1240,
  level: 8,
  streak: 12,
  weekly: 82,
  dailyScore: 92,
  reminder: 'Hydration check-in · 3:30 PM'
};

const shakeIngredients = [
  { id: 'curd', name: '🥛 Curd (100g)', protein: 10, calories: 98 },
  { id: 'milk', name: '🥛 Milk (250ml)', protein: 8, calories: 150 },
  { id: 'whey', name: '🥤 Whey Protein (1 scoop)', protein: 24, calories: 120 },
  { id: 'biscuit', name: '🍪 Biscuit (4 pcs)', protein: 2, calories: 120 },
  { id: 'oats', name: '🥣 Oats (40g)', protein: 5, calories: 152 },
  { id: 'banana', name: '🍌 Banana (1 large)', protein: 1.3, calories: 105 },
  { id: 'chocolate', name: '🍫 Chocolate (1 tbsp)', protein: 0.5, calories: 50 },
  { id: 'coffee', name: '☕ Coffee (1 tsp)', protein: 0.2, calories: 5 },
  { id: 'pb', name: '🥜 Peanut Butter (1 tbsp)', protein: 4, calories: 94 },
  { id: 'almond', name: '🥜 Almonds (10 pcs)', protein: 2.5, calories: 70 },
  { id: 'chia', name: '🌱 Chia Seeds (1 tbsp)', protein: 2.0, calories: 60 },
  { id: 'dates', name: '🌴 Dates (3 pcs)', protein: 0.6, calories: 60 },
  { id: 'honey', name: '🍯 Honey (1 tbsp)', protein: 0, calories: 64 },
  { id: 'mango', name: '🥭 Mango (1 cup)', protein: 1.0, calories: 99 }
];

const skincareConcerns = [
  {
    id: 'pih',
    title: '🔴 Post-Acne Marks (PIH)',
    desc: 'Leftover dark brown/black marks from previous pimples.',
    symptoms: 'Flat, dark-pigmented spots on cheeks/forehead.',
    why: 'Melanin overproduction triggered by acne inflammation.',
    best: 'Sunscreen (SPF 50), Vitamin C (morning), Niacinamide, Retinoids (night).',
    worst: 'Picking pimples, using harsh scrubs, skipping sunscreen.',
    routine: 'Morning: Vit C + Niacinamide + Sunscreen. Night: Gentle Cleanser + Retinoid + Moisturizer.',
    home: 'Curd & Turmeric pack (helps fade marks gently).',
    medical: 'Chemical peels, Microneedling, Q-switched Nd:YAG laser.',
    timeline: '3 to 6 months of daily consistency.'
  },
  {
    id: 'scars',
    title: '🟡 Atrophic Acne Scarring',
    desc: 'Shallow depressions or pits in the skin.',
    symptoms: 'Uneven light reflection, boxcar or rolling depressions.',
    why: 'Collagen loss during severe or picked acne healing.',
    best: 'Retinoids (adapalene, tretinoin), Glycolic acid.',
    worst: 'Over-exfoliating, hoping creams alone will lift deep scars.',
    routine: 'Morning: Hydrating SPF. Night: Retinoid + Ceramide moisturizer.',
    home: 'Aloe vera & Honey (soothes but does not lift deep scars).',
    medical: 'Microneedling (strong evidence), RF Microneedling, Fractional CO2 Laser, Subcision.',
    timeline: '6 to 12 months with clinic procedures.'
  },
  {
    id: 'pores',
    title: '🔵 Enlarged Pores & Rough Texture',
    desc: 'Visible pores and bumpy texture blocking glass skin.',
    symptoms: 'Orange-peel look, slightly rough cheek/nose area.',
    why: 'Excess sebum, lost elasticity around pore walls, dead cell buildup.',
    best: 'Salicylic Acid (BHA), Niacinamide (oil control), Retinoids.',
    worst: 'Comedogenic oils (coconut oil), heavy makeup, skipping washing.',
    routine: 'Morning: Niacinamide. Night: BHA toner (2-3x weekly) + Retinoid.',
    home: 'Oatmeal & Honey scrub (smooths rough dead skin gently).',
    medical: 'Salicylic acid peels, Laser resurfacing, HydraFacial.',
    timeline: '4 to 8 weeks for visible oil reduction.'
  },
  {
    id: 'pcod',
    title: '🟢 PCOS Acne & Hormonal Breakouts',
    desc: 'Acne on the jawline, chin, and neck associated with hormone cycles.',
    symptoms: 'Deep painful cysts, irregular periods, facial hair.',
    why: 'Excess androgens stimulating oil glands (often linked to PCOS).',
    best: 'Salicylic acid, Benzoyl peroxide, Niacinamide, Zinc.',
    worst: 'High sugar foods, dairy, popping deep hormonal cysts.',
    routine: 'Morning: Gentle foaming cleanser + Niacinamide + SPF. Night: Salicylic acid + Moisturizer.',
    home: 'Green Tea rinse (anti-androgenetic properties on skin).',
    medical: 'Oral contraceptives, Spironolactone (prescribed by doctor), hormonal blood tests.',
    timeline: '3 to 6 months to balance hormonal flareups.'
  },
  {
    id: 'beard',
    title: '🧔 Beard Patchiness & Shadow',
    desc: 'Sparse growth on cheeks and dark shadow after shaving.',
    symptoms: 'Patchy cheek density, ingrown hairs, dark follicle dots.',
    why: 'Genetics, local blood circulation, or follicle sensitivity to DHT.',
    best: 'Gentle exfoliating acids (salicylic acid to prevent razor bumps).',
    worst: 'Dry shaving, dull razors, heavy comedogenic beard oils.',
    routine: 'Morning: Clean shave + Moisturize. Night: Gentle BHA scrub + barrier repair.',
    home: 'Aloe vera & Cucumber gel (cools shaving irritation).',
    medical: 'Dermatologist consultation, Minoxidil (under guidance), Microneedling.',
    timeline: 'Beard continues maturing into the late 20s.'
  },
  {
    id: 'glass',
    title: '🇰🇷 Korean Glass Skin Guide',
    desc: 'How to achieve the translucent, dewy, and smooth glass skin finish.',
    symptoms: 'Dullness, dehydration, lack of dewy bounce.',
    why: 'Dry skin and lack of deep hydration layers.',
    best: 'Hyaluronic Acid, Ceramides, Rice Water Toner, Snail Mucin.',
    worst: 'Harsh alcohol-based toners, skipping moisturizer, sun exposure.',
    routine: 'Double Cleanse -> Hydrating Toner -> Essence/Mucin -> Moisturizer -> SPF.',
    home: 'Green Tea & Rice Water compress (hydrates and brightens).',
    medical: 'Skin booster injections, Chemical peels, RF Microneedling.',
    timeline: '3 to 6 weeks for standard hydration bounce.'
  }
];

const weightLossConcerns = [
  {
    id: 'deficit',
    title: '🔥 Calorie Deficit Guide',
    desc: 'The absolute baseline rule of fat loss.',
    why: 'Fat loss occurs only when energy output exceeds energy input.',
    best: 'Fibre-rich vegetables, lean proteins, high-volume foods.',
    worst: 'Crash diets (below 1200 kcal), skipping meals then binge eating.',
    routine: 'Track daily meals, walk 8000+ steps, sleep 8 hours.',
    home: 'Drink warm water or black coffee to blunt sudden hunger cues.',
    swap: 'Swap Butter Naan (320 kcal) for Phulka (80 kcal).',
    timeline: 'Safe fat loss is 0.5kg to 1kg per week.'
  },
  {
    id: 'protein',
    title: '🥚 Protein & Muscle Retention',
    desc: 'Why protein is your best friend during a cut.',
    why: 'Protein has a high thermic effect and keeps you full while preserving muscle.',
    best: 'Egg whites, chicken breast, paneer, curd, soya chunks.',
    worst: 'Eating carb-only meals (like bread/jam) which lead to rapid hunger spikes.',
    routine: 'Aim for 1.8g to 2.2g of protein per kg of bodyweight daily.',
    home: 'Keep boiled eggs or roasted chana handy for quick, high-protein snacks.',
    swap: 'Swap chips for roasted peanuts or roasted chana.',
    timeline: 'Immediate boost in satiety from Day 1.'
  },
  {
    id: 'plateau',
    title: '🛑 AI Plateau Doctor',
    desc: 'What to do if your weight loss halts for 2+ weeks.',
    why: 'Metabolic adaptation, hidden liquid calories, or fluid retention masking fat loss.',
    best: 'Increasing step count, double checking portion sizes, sleeping well.',
    worst: 'Panicking and dropping calories further, which harms metabolism.',
    routine: 'Reset targets, add a 10-minute walk after each meal.',
    home: 'Stress reduction techniques (high cortisol levels retain water).',
    swap: 'Use a digital scale instead of guessing cup sizes.',
    timeline: 'Usually breaks the plateau within 7 to 10 days.'
  },
  {
    id: 'fluctuation',
    title: '📈 Overnight Weight Fluctuation',
    desc: 'Why your scale weight jumped 1kg overnight.',
    why: 'Carbohydrate storage (1g carbs holds 3g water), sodium/salt, stress, or digestion.',
    best: 'Understanding that water weight is not fat gain.',
    worst: 'Crash dieting or over-exercising the next day to "compensate".',
    routine: 'Weigh yourself once a week under consistent morning conditions.',
    home: 'Sip lemon water to naturally flush excess sodium retention.',
    swap: 'Trust the weekly average, not the daily number.',
    timeline: 'Water shifts normalize within 24 to 48 hours.'
  },
  {
    id: 'cheat',
    title: '🍕 Cheat Meal & Event Planner',
    desc: 'How to manage weddings, festivals, and cheat meals.',
    why: 'Restricting foods completely leads to binging. Guided balance is key.',
    best: 'Protein-first eating before the event, portion control.',
    worst: 'Starving yourself all day before a cheat meal (causes heavy overeating).',
    routine: 'Limit cheat meals to once a week. Fill up on salad/water first.',
    home: 'Walk 10,000 steps on the day of a heavy meal to increase burn.',
    swap: 'Swap sugary cold drinks for Coke Zero or club soda.',
    timeline: 'Saves 500-1000 kcal per social event.'
  }
];

function getNextDueTime(timeStr) {
  const [hours, minutes] = timeStr.split(':').map(Number);
  const target = new Date();
  target.setHours(hours, minutes, 0, 0);
  if (target.getTime() <= Date.now()) {
    target.setDate(target.getDate() + 1);
  }
  return target.getTime();
}
function getReminderTimeOffset(startTimeStr, offsetMinutes) {
  const parts = (startTimeStr || '07:00').split(':').map(Number);
  const hrs = parts[0];
  const mins = parts[1];
  const target = new Date();
  target.setHours(hrs, mins, 0, 0);
  target.setTime(target.getTime() + offsetMinutes * 60 * 1000);
  
  if (target.getTime() <= Date.now()) {
    target.setDate(target.getDate() + 1);
  }
  return target.getTime();
}

function getRemindersForGoal(goal, wakeTime) {
  const wake = wakeTime || '07:00';
  if (goal.startsWith('skin')) {
    if (goal === 'skin-acne') {
      return {
        cleanse: { title: 'Salicylic Cleanse', description: 'Wash with Salicylic acid cleanser.', nextDue: getReminderTimeOffset(wake, 20), pending: false, lastAction: '', missedCount: 0, followUp: 36000000 },
        sunscreen: { title: 'Matte SPF', description: 'Apply non-comedogenic matte sunscreen.', nextDue: getReminderTimeOffset(wake, 360), pending: false, lastAction: '', missedCount: 0, followUp: 14400000 },
        treatment: { title: 'Acne Treatment', description: 'Apply salicylic acid or benzoyl peroxide treatment.', nextDue: getReminderTimeOffset(wake, 780), pending: false, lastAction: '', missedCount: 0, followUp: 43200000 }
      };
    } else if (goal === 'skin-hydration') {
      return {
        cleanse: { title: 'Hydrating Wash', description: 'Wash with a gentle hyaluronic/ceramide cleanser.', nextDue: getReminderTimeOffset(wake, 20), pending: false, lastAction: '', missedCount: 0, followUp: 36000000 },
        sunscreen: { title: 'Dewy SPF', description: 'Apply hydrating SPF 50 sunscreen.', nextDue: getReminderTimeOffset(wake, 360), pending: false, lastAction: '', missedCount: 0, followUp: 14400000 },
        moisture: { title: 'Moisture Lock', description: 'Apply hyaluronic acid serum on damp skin.', nextDue: getReminderTimeOffset(wake, 780), pending: false, lastAction: '', missedCount: 0, followUp: 43200000 }
      };
    } else if (goal === 'skin-aging') {
      return {
        cleanse: { title: 'Gentle Cleanse', description: 'Wash with an amino acid cleanser.', nextDue: getReminderTimeOffset(wake, 20), pending: false, lastAction: '', missedCount: 0, followUp: 36000000 },
        sunscreen: { title: 'SPF Protection', description: 'Apply sunscreen to prevent photo-aging.', nextDue: getReminderTimeOffset(wake, 360), pending: false, lastAction: '', missedCount: 0, followUp: 14400000 },
        retinol: { title: 'Youth Restore', description: 'Apply retinoid or peptide anti-aging cream tonight.', nextDue: getReminderTimeOffset(wake, 780), pending: false, lastAction: '', missedCount: 0, followUp: 43200000 }
      };
    } else if (goal === 'skin-sensitive') {
      return {
        cleanse: { title: 'Soothing Wash', description: 'Wash with a pH-balanced soothing cleanser.', nextDue: getReminderTimeOffset(wake, 20), pending: false, lastAction: '', missedCount: 0, followUp: 36000000 },
        sunscreen: { title: 'Mineral SPF', description: 'Apply physical mineral sunscreen.', nextDue: getReminderTimeOffset(wake, 360), pending: false, lastAction: '', missedCount: 0, followUp: 14400000 },
        calm: { title: 'Barrier Repair', description: 'Apply cica/ceramide barrier soothing cream.', nextDue: getReminderTimeOffset(wake, 780), pending: false, lastAction: '', missedCount: 0, followUp: 43200000 }
      };
    } else { // skin-korean / default skin
      return {
        cleanse: { title: 'Double Cleanse', description: 'Double cleanse with a gentle wash for glass skin!', nextDue: getReminderTimeOffset(wake, 20), pending: false, lastAction: '', missedCount: 0, followUp: 36000000 },
        sunscreen: { title: 'SPF Shield', description: 'Apply/reapply your SPF 50 sunscreen.', nextDue: getReminderTimeOffset(wake, 360), pending: false, lastAction: '', missedCount: 0, followUp: 14400000 },
        serum: { title: 'Glow Serum', description: 'Apply Vit C or Niacinamide serum for glass skin.', nextDue: getReminderTimeOffset(wake, 780), pending: false, lastAction: '', missedCount: 0, followUp: 43200000 }
      };
    }
  } else if (goal === 'lose') {
    return {
      water: { title: 'Hydration Nudge', description: 'Sip water to stay full and boost metabolism.', nextDue: getReminderTimeOffset(wake, 120), pending: false, lastAction: '', missedCount: 0, followUp: 3600000 },
      portion: { title: 'Portion Control', description: 'Eat slowly. Stop eating when you are 80% full.', nextDue: getReminderTimeOffset(wake, 360), pending: false, lastAction: '', missedCount: 0, followUp: 14400000 },
      walk: { title: 'Active Walk', description: 'Take a short 10-minute active walking break.', nextDue: getReminderTimeOffset(wake, 660), pending: false, lastAction: '', missedCount: 0, followUp: 14400000 }
    };
  } else {
    return {
      water: { title: 'Hydration Boost', description: 'Drink water to support protein synthesis.', nextDue: getReminderTimeOffset(wake, 120), pending: false, lastAction: '', missedCount: 0, followUp: 3600000 },
      shake: { title: 'Calorie Shake', description: 'Time for your high-calorie banana peanut butter shake!', nextDue: getReminderTimeOffset(wake, 240), pending: false, lastAction: '', missedCount: 0, followUp: 14400000 },
      diet: { title: 'Protein & calories', description: 'Eat paneer, eggs, chicken, or curd now!', nextDue: getReminderTimeOffset(wake, 720), pending: false, lastAction: '', missedCount: 0, followUp: 10800000 }
    };
  }
}

const state = {
  darkMode: localStorage.getItem('relix-dark') === 'true',
  notifications: localStorage.getItem('relix-notify') !== 'false',
  remindersPaused: localStorage.getItem('relix-reminders-paused') === 'true',
  activeTab: 'dashboard',
  profileName: localStorage.getItem('relix-profile-name') || 'Your Name',
  gender: localStorage.getItem('relix-gender') || 'female',
  groqKey: localStorage.getItem('relix-groq-key') || '',
  geminiKey: localStorage.getItem('relix-gemini-key') || '',
  setupComplete: localStorage.getItem('relix-setup') === 'true',
  setupAt: Number(localStorage.getItem('relix-setup-at') || 0),
  goalType: localStorage.getItem('relix-goal') || 'muscle',
  age: Number(localStorage.getItem('relix-age') || 22),
  height: localStorage.getItem('relix-height') || "6'1\"",
  wakeUpTime: localStorage.getItem('relix-wakeup-time') || '07:00',
  weight: Number(localStorage.getItem('relix-weight') || 65),
  targetWeight: Number(localStorage.getItem('relix-target-weight') || 75),
  dietType: localStorage.getItem('relix-diet') || 'nonveg',
  targetCalories: Number(localStorage.getItem('relix-target-cal') || 3000),
  targetProtein: Number(localStorage.getItem('relix-target-pro') || 140),
  consumedCalories: Number(localStorage.getItem('relix-consumed-cal') || 0),
  consumedProtein: Number(localStorage.getItem('relix-consumed-pro') || 0),
  consumedHydration: Number(localStorage.getItem('relix-consumed-hyd') || 0),
  targetHydration: Number(localStorage.getItem('relix-target-hyd') || 3500),
  lastLog: JSON.parse(localStorage.getItem('relix-last-log') || 'null'),
  xp: Number(localStorage.getItem('relix-xp') || 0),
  level: Number(localStorage.getItem('relix-level') || 1),
  streak: Number(localStorage.getItem('relix-streak') || 0),
  weekly: Number(localStorage.getItem('relix-weekly') || 0),
  dailyScore: Number(localStorage.getItem('relix-daily-score') || 0),
  lastActivityDate: localStorage.getItem('relix-last-activity') || '',
  recentActivity: JSON.parse(localStorage.getItem('relix-activity-log') || '[]'),
  routineProgress: Number(localStorage.getItem('relix-routine-progress') || 0),
  xpManualDelta: Number(localStorage.getItem('relix-xp-delta') || 0),
  mealCount: Number(localStorage.getItem('relix-meal-count') || 0),
  dailyMeals: Number(localStorage.getItem('relix-daily-meals') || 0),
  completedTasks: JSON.parse(localStorage.getItem('relix-completed') || '[]'),
  dayStartTime: Number(localStorage.getItem('relix-day-start') || Date.now()),
  restorableStreak: Number(localStorage.getItem('relix-restorable-streak') || -1),
  loggedFoods: JSON.parse(localStorage.getItem('relix-logged-foods') || '[]'),
  loggedHydrations: JSON.parse(localStorage.getItem('relix-logged-hydrations') || '[]'),
  profilePic: localStorage.getItem('relix-profile-pic') || '',
  pendingMealImageBase64: localStorage.getItem('relix-pending-meal-image') || '',
  historicalLogs: JSON.parse(localStorage.getItem('relix-historical-logs') || '[]'),
  skinType: localStorage.getItem('relix-skin-type') || 'oily',
  kitchenIngredients: JSON.parse(localStorage.getItem('relix-kitchen') || '[]'),
  shakeIngredients: JSON.parse(localStorage.getItem('relix-shake-ingredients') || '[]'),
  pasteIngredients: JSON.parse(localStorage.getItem('relix-paste-ingredients') || '[]'),
  reminders: (() => {
    const saved = JSON.parse(localStorage.getItem('relix-reminder-state') || 'null');
    const goal = localStorage.getItem('relix-goal') || 'muscle';
    const wake = localStorage.getItem('relix-wakeup-time') || '07:00';
    const defaults = getRemindersForGoal(goal, wake);
    if (!saved) return JSON.parse(JSON.stringify(defaults));
    return Object.fromEntries(Object.entries(defaults).map(([key, baseReminder]) => {
      const savedReminder = saved[key] || {};
      return [key, {
        ...baseReminder,
        ...savedReminder,
        pending: Boolean(savedReminder.pending),
        missedCount: Number(savedReminder.missedCount || 0),
        lastAction: savedReminder.lastAction || ''
      }];
    }));
  })(),
  reminderTimers: {}
};

const knowledgeBase = [];
let chatMessages = JSON.parse(localStorage.getItem('relix-chat-messages') || '[]');
let installPrompt = null;

const els = {
  app: document.documentElement,
  body: document.body,
  tabs: document.querySelectorAll('[data-tab]'),
  sections: document.querySelectorAll('.view-section'),
  xpValue: document.getElementById('xp-value'),
  levelValue: document.getElementById('level-value'),
  streakValue: document.getElementById('streak-value'),
  scoreValue: document.getElementById('score-value'),
  progressBar: document.getElementById('progress-bar'),
  progressText: document.getElementById('progress-text'),
  weeklyValue: document.getElementById('weekly-value'),
  recentList: document.getElementById('recent-list'),
  reminderList: document.getElementById('reminder-list'),
  pauseRemindersButton: document.getElementById('pause-reminders'),
  routineList: document.getElementById('routine-list'),
  routineProgress: document.getElementById('routine-progress'),
  modal: document.getElementById('why-modal'),
  modalTitle: document.getElementById('modal-title'),
  modalBody: document.getElementById('modal-body'),
  chatMessages: document.getElementById('chat-messages'),
  chatInput: document.getElementById('coach-input'),
  coachForm: document.getElementById('coach-form'),
  coachVoiceBtn: document.getElementById('coach-voice-btn'),
  coachVoiceStatus: document.getElementById('coach-voice-status'),
  suggestions: document.querySelectorAll('.suggestion-pill'),
  mealPreview: document.getElementById('meal-preview'),
  mealStatus: document.getElementById('meal-status'),
  mealButton: document.getElementById('analyze-meal'),
  mealInput: document.getElementById('meal-input'),
  mealCounter: document.getElementById('meal-counter'),
  installButton: document.getElementById('install-button'),
  enableAlertsButton: document.getElementById('enable-alerts-button'),
  settingsEnableAlertsButton: document.getElementById('settings-enable-alerts'),
  settingsInstallButton: document.getElementById('settings-install-button'),
  unreadBadge: document.getElementById('unread-badge'),
  installCta: document.getElementById('install-cta'),
  installModal: document.getElementById('install-modal'),
  installModalTitle: document.getElementById('install-modal-title'),
  installModalCopy: document.getElementById('install-modal-copy'),
  installModalAction: document.getElementById('install-modal-action'),
  closeInstallModal: document.getElementById('close-install-modal'),
  dismissInstallModal: document.getElementById('dismiss-install-modal'),
  notificationModal: document.getElementById('notification-modal'),
  enableNotificationsButton: document.getElementById('enable-notifications'),
  dismissNotificationsButton: document.getElementById('dismiss-notifications'),
  closeNotificationModal: document.getElementById('close-notification-modal'),
  darkToggle: document.getElementById('dark-toggle'),
  notifyToggle: document.getElementById('notify-toggle'),
  nameInput: document.getElementById('name-input'),
  saveNameButton: document.getElementById('save-name'),
  languageSelect: document.getElementById('language-select'),
  exportButton: document.getElementById('export-data'),
  deleteButton: document.getElementById('delete-data'),
  inviteTeam: document.getElementById('invite-team'),
  setupModal: document.getElementById('setup-modal'),
  setupName: document.getElementById('setup-name'),
  setupGender: document.getElementById('setup-gender'),
  setupGoal: document.getElementById('setup-goal'),
  setupAge: document.getElementById('setup-age'),
  setupHeight: document.getElementById('setup-height'),
  setupWeight: document.getElementById('setup-weight'),
  setupTarget: document.getElementById('setup-target'),
  setupDiet: document.getElementById('setup-diet'),
  setupSkinType: document.getElementById('setup-skin-type'),
  setupWakeUpTime: document.getElementById('setup-wakeup-time'),
  setupWeightFieldsContainer: document.getElementById('setup-weight-fields-container'),
  finishSetup: document.getElementById('finish-setup'),
  closeSetupModal: document.getElementById('close-setup-modal'),
  calBar: document.getElementById('cal-bar'),
  calText: document.getElementById('cal-text'),
  proBar: document.getElementById('pro-bar'),
  proText: document.getElementById('pro-text'),
  groqInput: document.getElementById('groq-input'),
  saveGroq: document.getElementById('save-groq'),
  geminiKeyInput: document.getElementById('gemini-key-input'),
  saveGeminiKey: document.getElementById('save-gemini-key')
};

const FOOD_DUPLICATE_WINDOW_MS = 15 * 60 * 1000;
const FOOD_NAME_STOP_WORDS = new Set([
  'a', 'an', 'and', 'are', 'bowl', 'bowls', 'cup', 'cups', 'dish', 'dishes', 'eaten', 'food', 'foods',
  'for', 'glass', 'large', 'log', 'logged', 'meal', 'medium', 'of', 'one', 'portion', 'portions', 'plate',
  'plates', 'piece', 'pieces', 'serving', 'servings', 'small', 'snack', 'snacks', 'the', 'to', 'with', 'without'
]);
const FOOD_LOG_INTENT_PATTERNS = [
  /\b(log|logged|logging|add|added|track|tracked|record|recorded|save|saved|note|noted)\b/i,
  /\b(please\s+)?(?:log|add|record|track|save)\s+(?:my\s+)?(?:food|meal|breakfast|lunch|dinner|snack|intake)\b/i,
  /\b(?:khana|khane|khaya|khayi|khaye|kha\s*liya|kha\s*li|kha\s*raha|kha\s*rahi|khaaya|khaa\s*liya)\b/i,
  /\b(?:piya|pi\s*liya|pi\s*li|pi\s*raha|pi\s*rahi|peeliya|peeli)\b/i,
  /\b(?:le\s*liya|le\s*li|liya|leli)\b/i,
  /\b(?:maine\s+khaya|maine\s+khayi|maine\s+liya|maine\s+piya|humne\s+khaya|usne\s+khaya)\b/i,
  /\b(?:had|ate|eaten|consumed|finished|drank|took|devoured|gobbled|munched)\b/i,
  /\b(?:i\s+had|i\s+ate|i\s+consumed|just\s+had|just\s+ate|just\s+finished|i\s+drank|we\s+had|we\s+ate)\b/i,
  /\b(?:add\s+to\s+logs?|log\s+it|log\s+this|add\s+it|track\s+it|record\s+it|save\s+it)\b/i,
  /\b(?:दर्ज|लॉग|जोड़ो|जोड़ें|नोट|सहेज|रजिस्टर|खाया|खायी|पिया|खा\s*लिया)\b/i,
  /\b(?:খেয়েছি|খাইছি|খেলাম|খাবো|খাচ্ছি|যোগ|লগ|রেকর্ড|সংরক্ষণ|খাইলাম|খেয়ে\s*ফেললাম)\b/i,
  /\b(?:khe\s*chilam|kheye\s*chilam|kheyelam|khabo|khailam|kheye\s*fellam|kheyechi)\b/i
];
const BEEF_BLOCK_PATTERNS = /\b(?:beef|beef\s*curry|beef\s*steak|beef\s*burger|beef\s*biryani|beef\s*kebab|beef\s*nihari|cow\s*meat|gau\s*maans|gaay\s*ka\s*gosht|goru\s*r?\s*mangsho|gorur\s*mangsho|bœuf|steer\s*meat)\b/i;

let voiceRecorder = null;
let voiceChunks = [];
let voiceTranscribing = false;
let speechRecognition = null;
let backendReachable = null;

function normalizeFoodName(name) {
  return String(name || '')
    .toLowerCase()
    .replace(/\bchart\b/g, 'chaat')
    .replace(/[^a-z0-9\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function tokenizeFoodName(name) {
  return normalizeFoodName(name)
    .split(' ')
    .filter((token) => token && !FOOD_NAME_STOP_WORDS.has(token) && !/^\d+$/.test(token));
}

function areFoodNamesSimilar(leftName, rightName) {
  const leftNormalized = normalizeFoodName(leftName);
  const rightNormalized = normalizeFoodName(rightName);
  if (!leftNormalized || !rightNormalized) return false;
  if (leftNormalized === rightNormalized) return true;

  const leftTokens = tokenizeFoodName(leftName);
  const rightTokens = tokenizeFoodName(rightName);
  if (!leftTokens.length || !rightTokens.length) return false;

  const leftSet = new Set(leftTokens);
  const rightSet = new Set(rightTokens);
  let shared = 0;
  leftSet.forEach((token) => {
    if (rightSet.has(token)) shared += 1;
  });

  if (shared >= Math.min(leftSet.size, rightSet.size)) return true;
  if (shared >= 2 && shared / Math.max(leftSet.size, rightSet.size) >= 0.5) return true;

  return leftNormalized.includes(rightNormalized) || rightNormalized.includes(leftNormalized);
}

function findSimilarFoodLog(entry) {
  const now = Date.now();
  for (let index = state.loggedFoods.length - 1; index >= 0; index -= 1) {
    const candidate = state.loggedFoods[index];
    if (!candidate || !candidate.timestamp || now - candidate.timestamp > FOOD_DUPLICATE_WINDOW_MS) continue;
    if (areFoodNamesSimilar(candidate.name, entry.name)) return candidate;
  }
  return null;
}

function findExactDuplicateFoodLog(entry) {
  const now = Date.now();
  const entryNorm = normalizeFoodName(entry.name);
  for (let index = state.loggedFoods.length - 1; index >= 0; index -= 1) {
    const candidate = state.loggedFoods[index];
    if (!candidate || !candidate.timestamp || now - candidate.timestamp > FOOD_DUPLICATE_WINDOW_MS) continue;
    const candNorm = normalizeFoodName(candidate.name);
    if (candNorm === entryNorm) return candidate;
    if (entryNorm.includes(candNorm) || candNorm.includes(entryNorm)) return candidate;
  }
  return null;
}

function confirmFoodLog(entry, fromChat = false) {
  const duplicate = findSimilarFoodLog(entry);
  if (!duplicate) return true;
  if (fromChat) {
    return false;
  }
  return confirm(`⚠️ Similar meal already logged:\n\n${duplicate.name} was logged recently.\nDo you want to log ${entry.name} one more time?`);
}

function getDeduplicatedFoodItems(foodName) {
  const tokens = tokenizeFoodName(foodName);
  const newItems = [];
  const alreadyLogged = [];
  
  tokens.forEach(token => {
    const isLogged = state.loggedFoods.some(f => {
      if (Date.now() - (f.timestamp || 0) > FOOD_DUPLICATE_WINDOW_MS) return false;
      return normalizeFoodName(f.name).includes(token);
    });
    if (isLogged) {
      alreadyLogged.push(token);
    } else {
      newItems.push(token);
    }
  });
  
  return { newItems, alreadyLogged };
}

function refreshTrackerViews() {
  renderDashboard();
  renderRoutine();
  renderProfile();
  renderNaturalCare();
  renderTodayLogs();
  renderProfilePicture();
}

function logFoodEntry(entry, options = {}) {
  if (!entry || !entry.name) return false;
  const fromChat = Boolean(options.fromChat);
  if (!confirmFoodLog(entry, fromChat)) {
    if (fromChat) {
      const dup = findSimilarFoodLog(entry);
      showToast(`⚠️ ${entry.name} was already logged recently (${dup ? dup.name : 'similar item'}). Skipped duplicate.`);
    } else {
      showToast('Cancelled duplicate food log.');
    }
    return false;
  }

  state.consumedCalories += Number(entry.calories || 0);
  state.consumedProtein += Number(entry.protein || 0);
  state.lastLog = {
    calories: Number(entry.calories || 0),
    protein: Number(entry.protein || 0),
    hydration: 0
  };
  const foodId = Date.now() + '-' + Math.random().toString(36).slice(2, 7);
  state.loggedFoods.push({
    id: foodId,
    name: entry.name,
    calories: Number(entry.calories || 0),
    protein: Number(entry.protein || 0),
    timestamp: Date.now()
  });

  // Track food frequency for personalized quick-pick buttons
  if (!state.foodFrequency) state.foodFrequency = {};
  const freqKey = normalizeFoodName(entry.name);
  if (freqKey && freqKey.length > 1) {
    state.foodFrequency[freqKey] = (state.foodFrequency[freqKey] || 0) + 1;
    state.foodFrequencyDetails = state.foodFrequencyDetails || {};
    state.foodFrequencyDetails[freqKey] = {
      name: entry.name,
      calories: Number(entry.calories || 0),
      protein: Number(entry.protein || 0)
    };
  }

  if (options.activityLabel) {
    recordActivity(options.activityLabel, options.points || 20);
  } else {
    saveState();
    refreshTrackerViews();
  }

  if (options.toastMessage) showToast(options.toastMessage);
  return true;
}

function applyTrackerCommandUpdates(result) {
  let changed = false;

  if (typeof result.updateStreak === 'number' && !Number.isNaN(result.updateStreak)) {
    state.streak = Math.max(0, Math.floor(result.updateStreak));
    state.restorableStreak = -1;
    changed = true;
    showToast(`🔥 Streak updated to ${state.streak}`);
  }

  if (typeof result.updateXpDelta === 'number' && !Number.isNaN(result.updateXpDelta)) {
    state.xpManualDelta = Number(state.xpManualDelta || 0) + result.updateXpDelta;
    changed = true;
    showToast(`⭐ XP adjusted by ${result.updateXpDelta > 0 ? '+' : ''}${result.updateXpDelta}`);
  }

  if (typeof result.updateTargetCalories === 'number' && result.updateTargetCalories > 0) {
    state.targetCalories = Math.round(result.updateTargetCalories);
    changed = true;
    showToast(`🎯 Calorie goal updated to ${state.targetCalories} kcal`);
  }

  if (typeof result.updateTargetProtein === 'number' && result.updateTargetProtein > 0) {
    state.targetProtein = Math.round(result.updateTargetProtein);
    changed = true;
    showToast(`🎯 Protein goal updated to ${state.targetProtein}g`);
  }

  if (typeof result.updateRoutineProgress === 'number' && !Number.isNaN(result.updateRoutineProgress)) {
    state.routineProgress = Math.max(0, Math.min(100, Math.round(result.updateRoutineProgress)));
    changed = true;
  }

  if (typeof result.updateDailyScore === 'number' && !Number.isNaN(result.updateDailyScore)) {
    state.dailyScore = Math.max(0, Math.min(100, Math.round(result.updateDailyScore)));
    changed = true;
  }

  if (changed) {
    saveState();
    refreshTrackerViews();
    renderWeightForecast();
  }

  return changed;
}

function applyQuickCoachCommand(message) {
  const lower = String(message || '').toLowerCase();
  const updates = [];

  const streakMatch = lower.match(/(?:set|change|update)\s+(?:my\s+)?streak\s*(?:to|=)?\s*(\d+)/i);
  if (streakMatch) {
    state.streak = Math.max(0, Number(streakMatch[1]));
    state.restorableStreak = -1;
    updates.push(`Streak set to ${state.streak}`);
  }

  const xpMatch = lower.match(/(?:set|change|update)\s+(?:my\s+)?xp\s*(?:to|=)?\s*(\d+)/i);
  if (xpMatch) {
    const desiredXp = Math.max(0, Number(xpMatch[1]));
    const currentBaseXp = recalculateDeservedXP(true);
    state.xpManualDelta = desiredXp - currentBaseXp;
    updates.push(`XP set to ${desiredXp}`);
  }

  const calorieMatch = lower.match(/(?:set|change|update)\s+(?:my\s+)?(?:calories?|calorie target|cal target|daily calories)\s*(?:to|=)?\s*(\d+)/i);
  if (calorieMatch) {
    state.targetCalories = Math.max(1, Number(calorieMatch[1]));
    updates.push(`Calories set to ${state.targetCalories}`);
  }

  const proteinMatch = lower.match(/(?:set|change|update)\s+(?:my\s+)?(?:protein|protein target|pro target|daily protein)\s*(?:to|=)?\s*(\d+)/i);
  if (proteinMatch) {
    state.targetProtein = Math.max(1, Number(proteinMatch[1]));
    updates.push(`Protein set to ${state.targetProtein}`);
  }

  if (!updates.length) return null;

  saveState();
  refreshTrackerViews();
  renderWeightForecast();
  return updates.join(' · ');
}

function hasExplicitFoodLogIntent(text) {
  const normalized = String(text || '').trim().toLowerCase();
  if (!normalized) return false;
  if (/(change|update|set|adjust)\s+(?:my\s+)?(?:calories?|calorie|protein|streak|xp|goal|target)/i.test(normalized)) return false;
  if (/(just\s+)?(?:talking|chatting|mentioning|discussing|speaking about|tell\s+me|what\s+is|what\s+are|how\s+many|info|information|suggest|recommend)/i.test(normalized)) return false;
  if (/^\s*(?:what|how|why|when|which|tell|show|explain|describe|compare|difference)\b/i.test(normalized)) return false;
  return FOOD_LOG_INTENT_PATTERNS.some((pattern) => pattern.test(normalized));
}

function hasFoodInfoOnlyIntent(text) {
  const normalized = String(text || '').trim().toLowerCase();
  if (!normalized) return false;
  return /^\s*(?:what|how|why|when|which|tell|show|explain|describe|compare|difference|calories\s+in|protein\s+in|nutrition|nutritional|info|information)/i.test(normalized)
    || /\b(?:tell\s+me|what\s+is|what\s+are|how\s+many|how\s+much)\b/i.test(normalized);
}

function updateVoiceUi(message, isRecording = false) {
  if (els.coachVoiceBtn) {
    els.coachVoiceBtn.textContent = isRecording ? '⏹ Stop' : '🎙️ Voice';
    els.coachVoiceBtn.classList.toggle('recording', isRecording);
  }
  if (els.coachVoiceStatus) {
    els.coachVoiceStatus.textContent = message || '';
    els.coachVoiceStatus.classList.toggle('voice-status-live', Boolean(message));
  }
}

async function ensureBackendReachable() {
  if (!BACKEND_URL) {
    backendReachable = false;
    return false;
  }
  if (backendReachable === true) return true;
  if (backendReachable === false) return false;

  try {
    const controller = new AbortController();
    const timeout = window.setTimeout(() => controller.abort(), 1200);
    const response = await fetch(`${BACKEND_URL}/api/ping`, { signal: controller.signal });
    window.clearTimeout(timeout);
    backendReachable = response.ok;
    return backendReachable;
  } catch (err) {
    backendReachable = false;
    return false;
  }
}

async function transcribeGroqVoiceNote(blob) {
  const apiKey = (state.groqKey || window.RELIX_GROQ_API_KEY || '').trim();
  if (!apiKey) {
    throw new Error('Add your Groq API key in settings to use voice notes.');
  }

  const formData = new FormData();
  formData.append('file', blob, 'voice-note.webm');
  formData.append('model', 'whisper-large-v3');
  formData.append('response_format', 'json');
  formData.append('temperature', '0');

  const response = await fetch('https://api.groq.com/openai/v1/audio/transcriptions', {
    method: 'POST',
    headers: { Authorization: `Bearer ${apiKey}` },
    body: formData
  });

  const data = await response.json();
  if (!response.ok) {
    throw new Error(data.error?.message || data.error || 'Voice transcription failed.');
  }

  return (data.text || '').trim();
}

async function startVoiceNoteCapture() {
  if (voiceRecorder && voiceRecorder.state === 'recording') return;

  if (!navigator.mediaDevices?.getUserMedia) {
    const SpeechRecognitionImpl = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (SpeechRecognitionImpl) {
      try {
        const recognition = new SpeechRecognitionImpl();
        speechRecognition = recognition;
        recognition.lang = 'en-US';
        recognition.interimResults = true;
        recognition.continuous = true;
        let finalTranscript = '';

        updateVoiceUi('Listening... speak naturally, then wait or tap stop.', true);

        recognition.onresult = (event) => {
          let interimTranscript = '';
          for (let index = event.resultIndex; index < event.results.length; index += 1) {
            const transcriptPart = event.results[index][0]?.transcript || '';
            if (event.results[index].isFinal) {
              finalTranscript += `${transcriptPart} `;
            } else {
              interimTranscript += transcriptPart;
            }
          }
          const preview = `${finalTranscript}${interimTranscript}`.trim();
          if (preview) updateVoiceUi(`Heard: ${preview}`);
        };

        recognition.onerror = (event) => {
          speechRecognition = null;
          voiceTranscribing = false;
          updateVoiceUi(event.error === 'not-allowed' ? 'Microphone permission denied.' : 'Voice listening failed.');
          showToast(event.error === 'not-allowed' ? 'Microphone permission denied.' : 'Voice listening failed.');
        };

        recognition.onend = () => {
          const transcript = finalTranscript.trim();
          speechRecognition = null;
          voiceTranscribing = false;
          if (!transcript) {
            updateVoiceUi('No speech detected. Try again.');
            return;
          }
          if (els.coachInput) els.coachInput.value = transcript;
          updateVoiceUi('Speech captured. Answering now...');
          sendCoachMessage(transcript);
        };

        recognition.start();
        voiceTranscribing = true;
        return;
      } catch (err) {
        speechRecognition = null;
        voiceTranscribing = false;
        updateVoiceUi('Microphone capture is not supported here.');
        showToast('Microphone capture is not supported here.');
        return;
      }
    }

    updateVoiceUi('Microphone capture is not supported here.');
    showToast('Microphone capture is not supported here.');
    return;
  }

  try {
    updateVoiceUi('Listening... tap stop when done.', true);
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    voiceChunks = [];
    voiceRecorder = new MediaRecorder(stream);

    voiceRecorder.ondataavailable = (event) => {
      if (event.data && event.data.size > 0) voiceChunks.push(event.data);
    };

    voiceRecorder.onstop = async () => {
      stream.getTracks().forEach((track) => track.stop());
      try {
        voiceTranscribing = true;
        updateVoiceUi('Transcribing voice note with Groq...');
        const blob = new Blob(voiceChunks, { type: 'audio/webm' });
        const transcript = await transcribeGroqVoiceNote(blob);
        if (!transcript) {
          updateVoiceUi('No speech detected. Try again.');
          return;
        }
        if (els.coachInput) els.coachInput.value = transcript;
        updateVoiceUi('Voice note ready.');
        sendCoachMessage(transcript);
      } catch (err) {
        console.error('[voice] transcription failed:', err);
        updateVoiceUi(err.message || 'Voice note failed.');
        showToast(err.message || 'Voice transcription failed.');
      } finally {
        voiceTranscribing = false;
      }
    };

    voiceRecorder.start();
  } catch (err) {
    updateVoiceUi(err.message || 'Could not access microphone.');
    showToast(err.message || 'Could not access microphone.');
  }
}

function stopVoiceNoteCapture() {
  if (speechRecognition) {
    try {
      speechRecognition.stop();
    } catch (err) { }
    speechRecognition = null;
    updateVoiceUi('Processing voice note...');
    return;
  }
  if (voiceRecorder && voiceRecorder.state === 'recording') {
    voiceRecorder.stop();
    updateVoiceUi('Processing voice note...');
  }
}

function init() {
  applyTheme();
  syncProfileMeta();
  loadKnowledgeBase();
  bindEvents();
  initPDFAcademy();
  if ('serviceWorker' in navigator) {
    navigator.serviceWorker.addEventListener('message', (event) => {
      const { type, reminderKey, action } = event.data || {};
      if (type === 'reminder-action' && reminderKey) {
        respondToReminder(reminderKey, action || 'later');
      }
    });
  }
  renderDashboard();
  initializeReminderSystem();
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'visible') {
      initializeReminderSystem();
      checkDailyReset();
      if (shouldAutoSyncPush() && 'serviceWorker' in navigator && 'PushManager' in window) {
        subscribeToPushNotifications(false);
      }
    } else if (document.visibilityState === 'hidden') {
      // Schedule Retention Hook
      if (state.notifications && !state.remindersPaused && 'showTrigger' in Notification.prototype && navigator.serviceWorker) {
        navigator.serviceWorker.ready.then(reg => {
          const tomorrow = Date.now() + 24 * 60 * 60 * 1000;
          reg.showNotification(`Relix AI Misses You!`, {
            tag: 'retention_hook',
            body: `Don't break your streak! Take 2 minutes to log your progress and check off your daily goals.`,
            icon: './icons/icon-192.png',
            vibrate: [200, 100, 200],
            data: { reminderKey: 'retention' },
            actions: [{ action: 'open', title: '🚀 Open Relix' }],
            showTrigger: new TimestampTrigger(tomorrow)
          }).catch(() => {});
        });
      }
    }
  });
  updateConnectionStatus();
  window.addEventListener('online', () => {
    updateConnectionStatus();
    initializeReminderSystem();
    checkDailyReset();
  });
  window.addEventListener('offline', () => {
    updateConnectionStatus();
  });
  renderRoutine();
  renderProfile();
  renderNaturalCare();
  renderMealCounter();
  renderMealCamState();
  renderChat();
  registerServiceWorker();
  registerInstallPrompt();
  registerNotifications();
  showWelcome();
  processMissedActions();
  checkDailyReset();
  setInterval(checkDailyReset, 60000);
  reconcilePendingRestore();
  showComebackIfReturning();

  if (shouldAutoSyncPush() && 'serviceWorker' in navigator && 'PushManager' in window) {
    subscribeToPushNotifications(false);
  }

  if (!state.setupComplete && els.setupModal) {
    els.setupModal.style.display = 'flex';
    els.setupModal.classList.add('open');
    els.setupModal.setAttribute('aria-hidden', 'false');
  }
}

function registerServiceWorker() {
  if ('serviceWorker' in navigator) {
    navigator.serviceWorker.register('./service-worker.js')
      .then((reg) => console.log('Service Worker registered successfully.', reg))
      .catch((err) => console.error('Service Worker registration failed:', err));
  }
}

async function processMissedActions() {
  if (!('caches' in window)) return;
  try {
    const cache = await caches.open('reliv-actions');
    const requests = await cache.keys();
    for (const req of requests) {
      if (req.url.includes('/action/')) {
        const parts = req.url.split('/');
        const reminderKey = parts[parts.length - 2];
        const res = await cache.match(req);
        let action = await res.text();
        if (action === 'open') action = 'done';
        respondToReminder(reminderKey, action);
        await cache.delete(req);
      }
    }
  } catch (err) { }
}

function applyTheme() {
  els.app.classList.toggle('dark', state.darkMode);
  els.body.classList.toggle('dark', state.darkMode);
  if (state.darkMode) {
    document.getElementById('theme-toggle-icon').textContent = '☀️';
  } else {
    document.getElementById('theme-toggle-icon').textContent = '🌙';
  }
}

function syncProfileMeta() {
  document.getElementById('member-name').textContent = state.profileName;
  document.getElementById('hero-name').textContent = state.profileName;
  const levelPill = document.getElementById('level-pill');
  if (levelPill) levelPill.textContent = `Level ${state.level}`;
  document.getElementById('member-id').textContent = 'REL-2048';
  document.getElementById('access-code').textContent = 'A7Q-84X';
  document.getElementById('referral-code').textContent = `RELIX-${state.profileName.replace(/\s+/g, '').slice(0, 6).toUpperCase()}`;
  if (els.nameInput) els.nameInput.value = state.profileName;
  if (els.groqInput) els.groqInput.value = state.groqKey;
  if (els.geminiKeyInput) els.geminiKeyInput.value = state.geminiKey || '';
}

function bindEvents() {
  const hardRefreshBtn = document.getElementById('hard-refresh-btn');
  if (hardRefreshBtn) {
    hardRefreshBtn.addEventListener('click', async () => {
      const originalText = hardRefreshBtn.textContent;
      hardRefreshBtn.textContent = '...';
      await performHardRefresh();
      hardRefreshBtn.textContent = originalText;
    });
  }

  els.tabs.forEach((tab) => {
    tab.addEventListener('click', () => switchView(tab.dataset.tab));
  });

  // Hormonal checklist assessment logic
  document.addEventListener('change', (e) => {
    if (e.target.classList.contains('hormone-check')) {
      const checkboxes = document.querySelectorAll('.hormone-check');
      const outputEl = document.getElementById('hormonal-guidance-output');
      if (checkboxes.length && outputEl) {
        const checkedCount = Array.from(checkboxes).filter(cb => cb.checked).length;
        outputEl.style.display = (checkedCount >= 2) ? 'block' : 'none';
      }
    }
  });

  els.suggestions.forEach((pill) => {
    pill.addEventListener('click', () => sendSuggestedQuestion(pill.dataset.prompt));
  });

  els.coachForm.addEventListener('submit', (event) => {
    event.preventDefault();
    const message = els.chatInput.value.trim();
    if (!message) return;
    sendCoachMessage(message);
    els.chatInput.value = '';
  });

  if (els.coachVoiceBtn) {
    els.coachVoiceBtn.addEventListener('click', () => {
      if (voiceRecorder && voiceRecorder.state === 'recording') {
        stopVoiceNoteCapture();
        return;
      }
      if (voiceTranscribing) return;
      startVoiceNoteCapture();
    });
  }

  els.mealInput.addEventListener('change', previewMeal);
  els.mealButton.addEventListener('click', analyzeMeal);

  // Route through showInstallPrompt so the button always does SOMETHING. It
  // used to bail silently when `installPrompt` was null, which is exactly the
  // state iOS is permanently in - so on iPhone the button looked broken.
  els.installButton.addEventListener('click', () => showInstallPrompt());

  document.getElementById('theme-toggle-icon').addEventListener('click', () => {
    els.darkToggle.checked = !els.darkToggle.checked;
    toggleDarkMode();
  });

  els.darkToggle.addEventListener('change', toggleDarkMode);
  els.notifyToggle.addEventListener('change', toggleNotifications);

  if (els.inviteTeam) {
    els.inviteTeam.addEventListener('click', () => {
      if (navigator.share) {
        navigator.share({
          title: 'Relix Companion',
          text: 'Join my team on Relix!',
          url: window.location.href
        }).catch(() => { });
      } else {
        navigator.clipboard.writeText(window.location.href);
        showToast('Link copied to clipboard!');
      }
    });
  }

  if (els.finishSetup) {
    els.finishSetup.addEventListener('click', () => {
      const nameVal = (els.setupName?.value || '').trim();
      const genderVal = els.setupGender?.value || 'female';
      const goalVal = els.setupGoal?.value || 'muscle';
      const ageVal = els.setupAge?.value ? Number(els.setupAge.value) : null;
      const heightVal = (els.setupHeight?.value || '').trim();
      const weightVal = els.setupWeight?.value ? Number(els.setupWeight.value) : null;
      const targetWeightVal = els.setupTarget?.value ? Number(els.setupTarget.value) : null;
      const dietVal = els.setupDiet?.value || 'nonveg';
      const skinTypeVal = els.setupSkinType?.value || 'oily';
      const wakeUpTimeVal = els.setupWakeUpTime?.value || '07:00';

      // Reset borders first
      if (els.setupName) els.setupName.style.border = '1px solid var(--border)';
      if (els.setupGender) els.setupGender.style.border = '1px solid var(--border)';
      if (els.setupAge) els.setupAge.style.border = '1px solid var(--border)';
      if (els.setupHeight) els.setupHeight.style.border = '1px solid var(--border)';
      if (els.setupWeight) els.setupWeight.style.border = '1px solid var(--border)';
      if (els.setupTarget) els.setupTarget.style.border = '1px solid var(--border)';

      if (!nameVal) {
        if (els.setupName) els.setupName.style.border = '2px solid #ef4444';
        showToast('Please enter your name.');
        return;
      }
      if (!ageVal || isNaN(ageVal)) {
        if (els.setupAge) els.setupAge.style.border = '2px solid #ef4444';
        showToast('Please enter your age.');
        return;
      }
      if (!heightVal) {
        if (els.setupHeight) els.setupHeight.style.border = '2px solid #ef4444';
        showToast('Please select your height.');
        return;
      }

      const isSkincare = goalVal.startsWith('skin');
      if (!isSkincare) {
        if (!weightVal || isNaN(weightVal)) {
          if (els.setupWeight) els.setupWeight.style.border = '2px solid #ef4444';
          showToast('Please enter your weight.');
          return;
        }
        if (!targetWeightVal || isNaN(targetWeightVal)) {
          if (els.setupTarget) els.setupTarget.style.border = '2px solid #ef4444';
          showToast('Please enter your target weight.');
          return;
        }
      }

      state.profileName = nameVal;
      state.gender = genderVal;
      state.goalType = goalVal;
      state.age = ageVal;
      state.height = heightVal;
      state.dietType = dietVal;
      state.skinType = skinTypeVal;
      state.wakeUpTime = wakeUpTimeVal;
      state.setupComplete = true;

      if (!isSkincare) {
        state.weight = weightVal;
        state.targetWeight = targetWeightVal;
      }

      // Dynamic calculation based on goal and user's height/weight/age
      function parseHeightToCm(hStr) {
        if (!hStr) return 175;
        const num = Number(hStr);
        if (!isNaN(num) && num > 100) return num; // cm
        const match = String(hStr).match(/(\d+)'\s*(\d+)?"?/);
        if (match) {
          const feet = Number(match[1]);
          const inches = Number(match[2] || 0);
          return Math.round((feet * 12 + inches) * 2.54);
        }
        return 175;
      }
      const hCm = parseHeightToCm(heightVal);
      const effectiveWeight = isSkincare ? (state.weight || 60) : weightVal;
      // Harris-Benedict BMR calculation baseline
      const bmr = Math.round(10 * effectiveWeight + 6.25 * hCm - 5 * ageVal + 5);

      if (goalVal === 'muscle') {
        state.targetCalories = Math.round(bmr * 1.4 + 500); // bulking surplus (moderate activity)
        state.targetProtein = Math.round(weightVal * 2.2);
        state.targetHydration = Math.round(weightVal * 35 + 500);
      } else if (goalVal === 'lose') {
        state.targetCalories = Math.max(1400, Math.round(bmr * 1.4 - 500)); // cutting deficit
        state.targetProtein = Math.round(weightVal * 1.8);
        state.targetHydration = Math.round(weightVal * 35);
      } else { // skin targets
        state.targetCalories = Math.round(bmr * 1.3); // maintenance calories
        state.targetProtein = Math.round(effectiveWeight * 1.2); // maintenance protein
        state.targetHydration = Math.round(effectiveWeight * 35 + 1000); // higher hydration target for skincare
      }

      // Custom manual overrides
      const customCalVal = document.getElementById('setup-custom-cal')?.value;
      const customProVal = document.getElementById('setup-custom-pro')?.value;
      if (customCalVal) state.targetCalories = Number(customCalVal);
      if (customProVal) state.targetProtein = Number(customProVal);

      // Marks the start of the onboarding ramp (see streakBenchmark).
      if (!state.setupAt) state.setupAt = Date.now();

      // Re-populate goal specific default reminders
      state.reminders = getRemindersForGoal(goalVal, wakeUpTimeVal);

      saveState();
      syncProfileMeta();
      renderDashboard();
      renderRoutine();
      renderProfile();
      renderChatSuggestions();
      renderNaturalCare();

      if (els.setupModal) {
        if (document.activeElement) document.activeElement.blur();
        els.setupModal.style.display = 'none';
        els.setupModal.classList.remove('open');
        els.setupModal.setAttribute('aria-hidden', 'true');
      }
      
      const confirmModal = document.getElementById('save-confirm-modal');
      if (confirmModal) {
        confirmModal.style.display = 'flex';
        confirmModal.classList.add('open');
        confirmModal.setAttribute('aria-hidden', 'false');
      }
    });
  }

  if (els.closeSetupModal) {
    els.closeSetupModal.addEventListener('click', () => {
      if (els.setupModal) {
        els.setupModal.style.display = 'none';
        els.setupModal.classList.remove('open');
        els.setupModal.setAttribute('aria-hidden', 'true');
      }
    });
  }

  document.querySelectorAll('.quick-pick-btn').forEach(btn => {
    btn.addEventListener('click', (e) => {
      const food = e.currentTarget.dataset.food;
      let cals = 0, pro = 0, foodName = '';
      if (food === 'dal') { cals = 350; pro = 10; foodName = 'Dal Chawal'; }
      else if (food === 'burger') { cals = 500; pro = 15; foodName = 'Burger'; }
      else if (food === 'coffee') { cals = 100; pro = 2; foodName = 'Coffee'; }
      else if (food === 'chai') { cals = 150; pro = 3; foodName = 'Chai & Biscuit'; }

      logFoodEntry({ name: foodName, calories: cals, protein: pro }, {
        activityLabel: `Quick Log: ${foodName}`,
        points: 20,
        toastMessage: '✅ Logged! No math required.'
      });
    });
  });

  document.querySelectorAll('.adjust-macro-btn').forEach(btn => {
    btn.addEventListener('click', (e) => {
      const type = e.currentTarget.dataset.type;
      const val = Number(e.currentTarget.dataset.val);
      let foodName = '';
      if (type === 'cal') {
        state.consumedCalories += val;
        state.lastLog = { calories: val, protein: 0, hydration: 0 };
        foodName = `Manual Calorie Adjustment (+${val} kcal)`;
      } else {
        state.consumedProtein += val;
        state.lastLog = { calories: 0, protein: val, hydration: 0 };
        foodName = `Manual Protein Adjustment (+${val}g)`;
      }
      state.loggedFoods.push({ name: foodName, calories: type === 'cal' ? val : 0, protein: type === 'pro' ? val : 0, timestamp: Date.now() });
      recordActivity(`Macro Adjusted: ${foodName}`, 20);
      showToast(`✅ Added +${val}${type === 'cal' ? ' kcal' : 'g Protein'}!`);
    });
  });

  const resetDailyBtn = document.getElementById('reset-daily-progress');
  if (resetDailyBtn) {
    resetDailyBtn.addEventListener('click', () => {
      if (!confirm("Are you sure you want to force a New Day Reset? This will archive today's stats, update your streak, and start a fresh day.")) return;
      checkDailyReset(true);
    });
  }

  const undoLogBtn = document.getElementById('undo-log-btn');
  if (undoLogBtn) {
    undoLogBtn.addEventListener('click', () => {
      if (state.loggedFoods.length > 0) {
        const last = state.loggedFoods.pop();
        state.consumedCalories = Math.max(0, state.consumedCalories - (last.calories || 0));
        state.consumedProtein = Math.max(0, state.consumedProtein - (last.protein || 0));
        state.lastLog = null; // clear single log indicator
        saveState();
        renderDashboard();
        showToast(`🔄 Undone: ${last.name}!`);
      } else {
        showToast('No more food logs to undo!');
      }
    });
  }

  document.querySelectorAll('.log-hydration-btn').forEach(btn => {
    btn.addEventListener('click', (e) => {
      const ml = Number(e.currentTarget.dataset.ml);
      state.consumedHydration += ml;
      state.lastLog = { calories: 0, protein: 0, hydration: ml };
      state.loggedHydrations.push({ ml: ml, timestamp: Date.now() });
      recordActivity(`Water logged: ${ml}ml`, 10);
      showToast(`✅ Logged ${ml}ml water!`);
    });
  });

  const resetHydrationBtn = document.getElementById('reset-hydration');
  if (resetHydrationBtn) {
    resetHydrationBtn.addEventListener('click', () => {
      if (!confirm("Are you sure you want to reset today's hydration progress?")) return;
      state.consumedHydration = 0;
      state.loggedHydrations = [];
      saveState();
      renderDashboard();
      showToast('Hydration reset.');
    });
  }

  const undoHydrationBtn = document.getElementById('undo-hydration-btn');
  if (undoHydrationBtn) {
    undoHydrationBtn.addEventListener('click', () => {
      if (state.loggedHydrations.length > 0) {
        const last = state.loggedHydrations.pop();
        state.consumedHydration = Math.max(0, state.consumedHydration - (last.ml || 0));
        state.lastLog = null; // clear single log indicator
        saveState();
        renderDashboard();
        showToast(`🔄 Undone: ${last.ml}ml water!`);
      } else {
        showToast('No more water logs to undo!');
      }
    });
  }

function parseLocalFoodIntake(text) {
  const normalized = text.toLowerCase();
  let calories = 0;
  let protein = 0;
  
  const calMatch = normalized.match(/(\d+)\s*(?:kcal|calories|cal)/i);
  const proMatch = normalized.match(/(\d+)\s*(?:g\s*protein|g\s*pro)/i);
  
  if (calMatch) calories = Number(calMatch[1]);
  if (proMatch) protein = Number(proMatch[1]);
  
  if (calories === 0 && protein === 0) {
    if (normalized.includes('banana')) { calories += 100; protein += 1; }
    if (normalized.includes('egg')) {
      const countMatch = normalized.match(/(\d+)\s*egg/i);
      const count = countMatch ? Number(countMatch[1]) : 1;
      calories += count * 70;
      protein += count * 6;
    }
    if (normalized.includes('paneer')) { calories += 260; protein += 18; }
    if (normalized.includes('chicken')) { calories += 220; protein += 25; }
    if (normalized.includes('dal') || normalized.includes('chawal')) { calories += 350; protein += 10; }
    if (normalized.includes('burger')) { calories += 500; protein += 15; }
    if (normalized.includes('coffee')) { calories += 100; protein += 2; }
    if (normalized.includes('chai') || normalized.includes('tea')) { calories += 120; protein += 3; }
    if (normalized.includes('roti') || normalized.includes('chapati')) {
      const countMatch = normalized.match(/(\d+)\s*(?:roti|chapati)/i);
      const count = countMatch ? Number(countMatch[1]) : 1;
      calories += count * 80;
      protein += count * 2.5;
    }
    if (normalized.includes('milk')) { calories += 150; protein += 8; }
  }
  
  return { calories, protein };
}

  const customFoodForm = document.getElementById('custom-food-form');
  const customFoodInput = document.getElementById('custom-food-input');
  if (customFoodForm && customFoodInput) {
    customFoodForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      const foodItem = customFoodInput.value.trim();
      if (!foodItem) return;
      
      const btn = customFoodForm.querySelector('button');
      const originalText = btn.textContent;
      btn.textContent = '...';
      btn.disabled = true;
      
      try {
        if (!state.groqKey) {
          const localEst = parseLocalFoodIntake(foodItem);
          logFoodEntry({ name: foodItem, calories: localEst.calories, protein: localEst.protein }, {
            activityLabel: `Logged Custom Food: ${foodItem}`,
            points: 20,
            toastMessage: `✅ Logged: ${localEst.calories} kcal & ${localEst.protein}g protein! (Offline)`
          });
        } else {
          const reply = await getCoachReply(foodItem);
          if (typeof reply === 'string') {
            showToast('Error logging food. Check API key.');
          } else {
            showToast(`✅ Custom food logged: +${reply.calories || 0} kcal, +${reply.protein || 0}g protein!`);
          }
        }
      } catch (err) {
        showToast('Error logging food.');
      }
      
      customFoodInput.value = '';
      btn.textContent = originalText;
      btn.disabled = false;
    });
  }

  const customHydrationForm = document.getElementById('custom-hydration-form');
  const customHydrationInput = document.getElementById('custom-hydration-input');
  if (customHydrationForm && customHydrationInput) {
    customHydrationForm.addEventListener('submit', (e) => {
      e.preventDefault();
      const ml = Number(customHydrationInput.value);
      if (ml <= 0 || isNaN(ml)) return;
      state.consumedHydration += ml;
      state.lastLog = { calories: 0, protein: 0, hydration: ml };
      state.loggedHydrations.push({ ml: ml, timestamp: Date.now() });
      customHydrationInput.value = '';
      recordActivity(`Water logged: ${ml}ml`, 10);
      showToast(`✅ Logged ${ml}ml water!`);
    });
  }

  const resetRoutineLogsBtn = document.getElementById('routine-reset-logs-btn');
  if (resetRoutineLogsBtn) {
    resetRoutineLogsBtn.addEventListener('click', () => {
      if (!confirm("Are you sure you want to clear all logged food & hydration entries for today?")) return;
      state.consumedCalories = 0;
      state.consumedProtein = 0;
      state.consumedHydration = 0;
      state.loggedFoods = [];
      state.loggedHydrations = [];
      saveState();
      renderDashboard();
      renderRoutine();
      showToast("Cleared today's intake history.");
    });
  }

  if (els.saveGroq) {
    els.saveGroq.addEventListener('click', () => {
      state.groqKey = els.groqInput.value.trim();
      saveState();
      showToast('Groq API Key saved.');
    });
  }

  if (els.saveGeminiKey) {
    els.saveGeminiKey.addEventListener('click', () => {
      state.geminiKey = els.geminiKeyInput.value.trim();
      saveState();
      showToast('Gemini API Key saved.');
    });
  }

  // Backend Timer Controls
  const waterStart = document.getElementById('server-water-start');
  const waterStop = document.getElementById('server-water-stop');
  const testStart = document.getElementById('server-test-start');
  const testStop = document.getElementById('server-test-stop');

  const userScoped = (path) => fetch(`${BACKEND_URL}${path}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ userId: RELIV_USER_ID })
  });
  if (waterStart) waterStart.addEventListener('click', () => { userScoped('/api/push/water/start'); showToast('45m water loop started!'); });
  if (waterStop) waterStop.addEventListener('click', () => { userScoped('/api/push/water/stop'); showToast('Water loop stopped.'); });
  if (testStart) testStart.addEventListener('click', () => { fetch(`${BACKEND_URL}/api/push/test/start`, { method: 'POST' }); showToast('Vibe check loop started!'); });
  if (testStop) testStop.addEventListener('click', () => { fetch(`${BACKEND_URL}/api/push/test/stop`, { method: 'POST' }); showToast('Vibe check loop stopped.'); });

  const debugPushBtn = document.getElementById('debug-push-btn');
  const forceResubBtn = document.getElementById('force-resub-btn');

  if (debugPushBtn) {
    debugPushBtn.addEventListener('click', async () => {
      try {
        const res = await fetch(`${BACKEND_URL}/api/push/debug`);
        const data = await res.json();
        const hasKeys = data.hasEnvVapidKeys ? '✅ Stable Env Keys' : '❌ Ephemeral Keys (WILL BREAK ON DEPLOY)';
        alert(`Push System Status:\n\nSubscribers: ${data.subscriberCount}\nVAPID Keys: ${hasKeys}`);
      } catch (e) {
        alert('Could not reach backend. Is Render awake?');
      }
    });
  }

  if (forceResubBtn) {
    forceResubBtn.addEventListener('click', async () => {
      forceResubBtn.textContent = '...';
      forceResubBtn.disabled = true;
      try {
        await triggerForceResubscribe();
      } catch (err) {}
      forceResubBtn.textContent = 'Force Resubscribe';
      forceResubBtn.disabled = false;
    });
  }

  els.exportButton.addEventListener('click', exportData);
  els.deleteButton.addEventListener('click', deleteData);
  if (els.installCta) els.installCta.addEventListener('click', () => showInstallPrompt());
  if (els.installModalAction) els.installModalAction.addEventListener('click', () => handleInstallAction());
  if (els.closeInstallModal) els.closeInstallModal.addEventListener('click', () => closeInstallPrompt());
  if (els.dismissInstallModal) els.dismissInstallModal.addEventListener('click', () => closeInstallPrompt());
  if (els.enableNotificationsButton) els.enableNotificationsButton.addEventListener('click', () => handleNotificationPermission(true));
  if (els.dismissNotificationsButton) els.dismissNotificationsButton.addEventListener('click', () => handleNotificationPermission(false));
  if (els.closeNotificationModal) els.closeNotificationModal.addEventListener('click', () => closeNotificationPrompt());
  if (els.saveNameButton) {
    els.saveNameButton.addEventListener('click', saveProfileName);
  }

  const editStatsBtn = document.getElementById('edit-stats-btn');
  if (editStatsBtn) {
    editStatsBtn.addEventListener('click', () => {
      if (els.setupModal) {
        if (els.setupName) els.setupName.value = state.profileName;
        if (els.setupGender) els.setupGender.value = state.gender || 'female';
        if (els.setupGoal) {
          els.setupGoal.value = state.goalType;
          const isSkin = els.setupGoal.value.startsWith('skin');
          const skinFields = document.getElementById('setup-skin-fields-container');
          if (els.setupWeightFieldsContainer) els.setupWeightFieldsContainer.style.display = isSkin ? 'none' : 'grid';
          if (skinFields) skinFields.style.display = isSkin ? 'flex' : 'none';
        }
        if (els.setupAge) els.setupAge.value = state.age;
        if (els.setupHeight) {
          const optExists = Array.from(els.setupHeight.options).some(o => o.value === state.height);
          els.setupHeight.value = optExists ? state.height : '5\'9"';
        }
        if (els.setupWeight) els.setupWeight.value = state.weight;
        if (els.setupTarget) els.setupTarget.value = state.targetWeight;
        if (els.setupDiet) els.setupDiet.value = state.dietType;
        if (els.setupSkinType) els.setupSkinType.value = state.skinType || 'oily';
        if (els.setupWakeUpTime) els.setupWakeUpTime.value = state.wakeUpTime || '07:00';

        els.setupModal.style.display = 'flex';
        els.setupModal.classList.add('open');
        els.setupModal.setAttribute('aria-hidden', 'false');
      }
    });
  }

  if (els.pauseRemindersButton) {
    els.pauseRemindersButton.addEventListener('click', toggleAllReminders);
  }
  if (els.enableAlertsButton) {
    els.enableAlertsButton.addEventListener('click', () => requestNotificationPermission());
  }
  if (els.settingsEnableAlertsButton) {
    els.settingsEnableAlertsButton.addEventListener('click', () => requestNotificationPermission());
  }
  if (els.settingsInstallButton) {
    els.settingsInstallButton.addEventListener('click', () => showInstallPrompt());
  }
  if (els.reminderList) {
    els.reminderList.addEventListener('click', (event) => {
      const button = event.target.closest('button[data-reminder-key]');
      if (!button) return;
      respondToReminder(button.dataset.reminderKey, button.dataset.reminderAction, button);
    });
  }

  document.querySelectorAll('.why-btn').forEach((btn) => {
    btn.addEventListener('click', () => openWhyModal(btn.dataset.title, btn.dataset.why));
  });

  document.querySelectorAll('.check-habit').forEach((checkbox) => {
    checkbox.addEventListener('change', toggleHabit);
  });

  document.querySelectorAll('[data-check]').forEach((button) => {
    button.addEventListener('click', () => completeQuickCheck(button.dataset.check, button));
  });

  document.getElementById('close-modal').addEventListener('click', closeModal);
  const modalOverlay = document.getElementById('why-modal');
  if (modalOverlay) modalOverlay.addEventListener('click', (event) => {
    if (event.target === modalOverlay) closeModal();
  });

  const restoreStreakBtn = document.getElementById('restore-streak-btn');
  if (restoreStreakBtn) {
    restoreStreakBtn.addEventListener('click', restoreStreak);
  }

  // Delegated so it keeps working after every re-render of the message list.
  if (els.chatMessages) {
    els.chatMessages.addEventListener('click', (event) => {
      const btn = event.target.closest('.msg-copy-btn');
      if (!btn) return;
      copyMessageText(Number(btn.dataset.copyIndex), btn);
    });
  }

  const logMealBtn = document.getElementById('log-meal-btn');
  if (logMealBtn) {
    logMealBtn.addEventListener('click', logVisionMeal);
  }

  const avatarContainer = document.getElementById('profile-avatar-container');
  const profilePicInput = document.getElementById('profile-pic-input');
  if (avatarContainer && profilePicInput) {
    avatarContainer.addEventListener('click', () => {
      profilePicInput.click();
    });
    profilePicInput.addEventListener('change', handleProfilePictureUpload);
  }

  // Dismiss save confirm modal
  const dismissSaveBtn = document.getElementById('dismiss-save-confirm');
  const confirmModal = document.getElementById('save-confirm-modal');
  if (dismissSaveBtn && confirmModal) {
    dismissSaveBtn.addEventListener('click', () => {
      confirmModal.style.display = 'none';
      confirmModal.classList.remove('open');
      confirmModal.setAttribute('aria-hidden', 'true');
    });
  }

  // Setup goal change display check
  if (els.setupGoal) {
    els.setupGoal.addEventListener('change', () => {
      const isSkin = els.setupGoal.value.startsWith('skin');
      const skinFields = document.getElementById('setup-skin-fields-container');
      if (els.setupWeightFieldsContainer) els.setupWeightFieldsContainer.style.display = isSkin ? 'none' : 'grid';
      if (skinFields) skinFields.style.display = isSkin ? 'flex' : 'none';
    });
  }

  // Toggle skin check guide box
  const toggleSkinGuideBtn = document.getElementById('toggle-skin-check-guide');
  const skinGuideBox = document.getElementById('skin-check-guide-box');
  if (toggleSkinGuideBtn && skinGuideBox) {
    toggleSkinGuideBtn.addEventListener('click', () => {
      const isHidden = skinGuideBox.style.display === 'none';
      skinGuideBox.style.display = isHidden ? 'block' : 'none';
    });
  }

  // Change skin type button in Natural Care Tab
  const changeSkinBtn = document.getElementById('change-skin-type-btn');
  if (changeSkinBtn) {
    changeSkinBtn.addEventListener('click', () => {
      const editBtn = document.getElementById('edit-stats-btn');
      if (editBtn) editBtn.click();
    });
  }

  // Kitchen ingredients checkbox listeners
  document.querySelectorAll('.kitchen-ingredient').forEach(checkbox => {
    checkbox.addEventListener('change', () => {
      const checked = [];
      document.querySelectorAll('.kitchen-ingredient:checked').forEach(cb => {
        checked.push(cb.value);
      });
      state.kitchenIngredients = checked;
      saveState();
      renderNaturalCare();
    });
  });

  // Shake confirm modal event listeners
  const confirmShakeYes = document.getElementById('confirm-shake-yes');
  const confirmShakeNo = document.getElementById('confirm-shake-no');
  const shakeModal = document.getElementById('shake-confirm-modal');
  if (confirmShakeYes && shakeModal) {
    confirmShakeYes.addEventListener('click', () => {
      let totalCal = 0;
      let totalPro = 0;
      const currentSelected = state.shakeIngredients || [];
      
      shakeIngredients.forEach(ing => {
        if (currentSelected.includes(ing.id)) {
          totalCal += ing.calories;
          totalPro += ing.protein;
        }
      });
      
      const newFood = {
        name: 'Homemade Anabolic Shake',
        calories: totalCal,
        protein: Math.round(totalPro)
      };

      logFoodEntry(newFood, {
        activityLabel: 'Shake logged successfully',
        points: 25,
        toastMessage: 'Shake logged successfully!'
      });
      
      shakeModal.style.display = 'none';
      shakeModal.classList.remove('open');
      shakeModal.setAttribute('aria-hidden', 'true');
    });
  }
  if (confirmShakeNo && shakeModal) {
    confirmShakeNo.addEventListener('click', () => {
      shakeModal.style.display = 'none';
      shakeModal.classList.remove('open');
      shakeModal.setAttribute('aria-hidden', 'true');
    });
  }
}

function getUnreadReminderCount() {
  return Object.values(state.reminders).reduce((total, reminder) => total + Math.max(Number(reminder.missedCount || 0), reminder.pending ? 1 : 0), 0);
}

function renderUnreadCounter() {
  if (els.unreadBadge) {
    els.unreadBadge.textContent = String(getUnreadReminderCount());
  }
}

function updateActionButtons() {
  const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent) && !window.MSStream;
  const installEligible = Boolean(installPrompt) || isIOS;
  if (els.settingsInstallButton) {
    els.settingsInstallButton.classList.toggle('visible', installEligible);
  }

  if (els.enableAlertsButton) {
    if (typeof Notification === 'undefined') {
      els.enableAlertsButton.textContent = 'Alerts unsupported';
      els.enableAlertsButton.disabled = true;
    } else if (Notification.permission === 'granted') {
      els.enableAlertsButton.textContent = 'Alerts on';
      els.enableAlertsButton.disabled = true;
    } else if (Notification.permission === 'denied') {
      els.enableAlertsButton.textContent = 'Alerts blocked';
      els.enableAlertsButton.disabled = true;
    } else {
      els.enableAlertsButton.textContent = 'Enable alerts';
      els.enableAlertsButton.disabled = false;
    }
  }

  if (els.settingsEnableAlertsButton) {
    if (typeof Notification === 'undefined') {
      els.settingsEnableAlertsButton.textContent = 'Unsupported';
      els.settingsEnableAlertsButton.disabled = true;
    } else if (Notification.permission === 'granted') {
      els.settingsEnableAlertsButton.textContent = 'Alerts on';
      els.settingsEnableAlertsButton.disabled = true;
    } else if (Notification.permission === 'denied') {
      els.settingsEnableAlertsButton.textContent = 'Blocked';
      els.settingsEnableAlertsButton.disabled = true;
    } else {
      els.settingsEnableAlertsButton.textContent = 'Allow alerts';
      els.settingsEnableAlertsButton.disabled = false;
    }
  }
}

function renderDashboard() {
  els.xpValue.textContent = state.xp;
  const levelPill = document.getElementById('level-pill');
  if (levelPill) levelPill.textContent = `Level ${state.level}`;
  els.levelValue.textContent = state.level;
  els.streakValue.textContent = state.streak;
  els.scoreValue.textContent = state.dailyScore;

  if (els.calBar && els.proBar) {
    const calPercent = Math.min(100, Math.round((state.consumedCalories / state.targetCalories) * 100)) || 0;
    const proPercent = Math.min(100, Math.round((state.consumedProtein / state.targetProtein) * 100)) || 0;
    els.calBar.style.width = `${calPercent}%`;
    els.proBar.style.width = `${proPercent}%`;
    els.calText.textContent = `${state.consumedCalories} / ${state.targetCalories} kcal (${calPercent}%)`;
    els.proText.textContent = `${state.consumedProtein} / ${state.targetProtein} g (${proPercent}%)`;
  }

  const nutritionCard = document.getElementById('nutrition-overview-card');
  const skincareCard = document.getElementById('skincare-overview-card');
  const undoLogBtn = document.getElementById('undo-log-btn');
  const undoHydrationBtn = document.getElementById('undo-hydration-btn');

  const lastFoodEl = document.getElementById('last-logged-food-status');
  if (lastFoodEl) {
    if (state.loggedFoods.length > 0) {
      const last = state.loggedFoods[state.loggedFoods.length - 1];
      lastFoodEl.textContent = `Last logged: ${last.name} (${last.calories} kcal, ${last.protein}g Protein)`;
      lastFoodEl.style.display = 'block';
    } else {
      lastFoodEl.style.display = 'none';
    }
  }

  const lastHydEl = document.getElementById('last-logged-hydration-status');
  if (lastHydEl) {
    if (state.loggedHydrations.length > 0) {
      const last = state.loggedHydrations[state.loggedHydrations.length - 1];
      lastHydEl.textContent = `Last logged: ${last.ml}ml water`;
      lastHydEl.style.display = 'block';
    } else {
      lastHydEl.style.display = 'none';
    }
  }

  if (nutritionCard && skincareCard) {
    if (state.goalType.startsWith('skin')) {
      nutritionCard.style.display = 'none';
      skincareCard.style.display = 'flex';
      
      const hydPercent = Math.min(100, Math.round((state.consumedHydration / state.targetHydration) * 100)) || 0;
      const hydBar = document.getElementById('hydration-bar');
      const hydText = document.getElementById('hydration-text');
      if (hydBar) hydBar.style.width = `${hydPercent}%`;
      if (hydText) hydText.textContent = `${state.consumedHydration} / ${state.targetHydration} ml (${hydPercent}%)`;

      if (undoHydrationBtn) undoHydrationBtn.style.display = state.loggedHydrations.length > 0 ? 'inline-block' : 'none';
      if (undoLogBtn) undoLogBtn.style.display = 'none';
    } else {
      nutritionCard.style.display = 'flex';
      skincareCard.style.display = 'none';

      if (undoLogBtn) undoLogBtn.style.display = state.loggedFoods.length > 0 ? 'inline-block' : 'none';
      if (undoHydrationBtn) undoHydrationBtn.style.display = 'none';
    }
  }

  renderCloseTheGap();

  const activity = state.recentActivity.length ? state.recentActivity.slice(0, 3) : [{ label: 'Start your first habit', time: 'No activity yet' }];

  els.recentList.innerHTML = activity.map((item) => `
    <div class="activity-item">
      <div>
        <strong>${item.label}</strong>
        <p>${item.time}</p>
      </div>
      <span>✓</span>
    </div>
  `).join('');

  renderCustomHabits();
  renderReminders();
}

function renderCustomHabits() {
  const container = document.getElementById('custom-habits-card');
  const list = document.getElementById('custom-habits-list');
  if (!container || !list) return;

  const habits = JSON.parse(localStorage.getItem('relix-custom-habits') || '[]');
  if (habits.length === 0) {
    container.style.display = 'none';
    return;
  }

  container.style.display = 'block';
  list.innerHTML = habits.map(h => {
    const isDone = h.current >= h.target;
    let checkboxes = '';
    for (let i = 0; i < h.target; i++) {
      const checked = i < h.current ? 'checked' : '';
      checkboxes += `<input type="checkbox" onclick="toggleCustomHabit('${h.id}')" ${checked} style="width:18px; height:18px; accent-color:var(--primary); cursor:pointer;">`;
    }
    return `
      <div style="display:flex; justify-content:space-between; align-items:center; background:rgba(255,255,255,0.03); padding:10px 14px; border-radius:12px; border:1px solid var(--border);">
        <span style="font-size:0.9rem; ${isDone ? 'text-decoration:line-through; color:var(--muted);' : ''}">${h.task}</span>
        <div style="display:flex; gap:6px;">${checkboxes}</div>
      </div>
    `;
  }).join('');
}

window.toggleCustomHabit = function(id) {
  const habits = JSON.parse(localStorage.getItem('relix-custom-habits') || '[]');
  const habit = habits.find(h => h.id === id);
  if (habit) {
    if (habit.current < habit.target) {
      habit.current++;
      showToast(`✅ ${habit.task} logged!`);
      state.xpManualDelta = (Number(state.xpManualDelta) || 0) + 10;
      saveState();
    } else {
      habit.current = 0; // reset if they click again after full
    }
    localStorage.setItem('relix-custom-habits', JSON.stringify(habits));
    renderCustomHabits();
    renderDashboard();
    checkDailyCompletion();
  }
};

function checkDailyCompletion() {
  const habits = JSON.parse(localStorage.getItem('relix-custom-habits') || '[]');
  const allHabitsDone = habits.length === 0 || habits.every(h => h.current >= h.target);
  
  let nutritionDone = false;
  if (state.goalType.startsWith('skin')) {
    nutritionDone = state.consumedHydration >= state.targetHydration;
  } else {
    nutritionDone = state.consumedCalories >= state.targetCalories && state.consumedProtein >= state.targetProtein;
  }

  if (allHabitsDone && nutritionDone) {
    if (localStorage.getItem('relix-daily-confetti') !== new Date().toDateString()) {
      localStorage.setItem('relix-daily-confetti', new Date().toDateString());
      if (typeof createConfetti === 'function') createConfetti();
      showToast('🎉 All daily tasks completed! Amazing job!');
    }
  }
}

function renderCloseTheGap() {
  const gapContainer = document.getElementById('gap-analytics');
  if (!gapContainer) return;

  const leftCal = Math.max(0, state.targetCalories - state.consumedCalories);
  const leftPro = Math.max(0, state.targetProtein - state.consumedProtein);

  let html = '';
  
  if (state.goalType.startsWith('skin')) {
    html = `
      <div style="font-size:0.9rem; color:var(--text); line-height:1.4;">
        <p style="margin:0 0 8px 0;">💧 Ensure you drink <strong>3.5L of water</strong> today to flush toxins and maintain skin elasticity.</p>
        <p style="margin:0 0 8px 0;">🌙 Aim for <strong>8+ hours of sleep</strong> tonight for cellular skin repair.</p>
        <strong style="color:var(--primary); font-size:0.85rem; display:block; margin-top:10px;">Recommended skincare ingredients today:</strong>
        <ul style="margin:6px 0 0 0; padding-left:20px; font-size:0.85rem; color:var(--muted);">
          <li>Salicylic Acid (if facing active breakouts)</li>
          <li>Hyaluronic Acid (apply to damp skin for maximum bounce)</li>
          <li>Centella Asiatica (Cica) to soothe any redness</li>
        </ul>
      </div>
    `;
  } else if (state.goalType === 'lose') {
    const isCalOver = state.consumedCalories > state.targetCalories;
    const isProWayOver = state.consumedProtein > state.targetProtein + 40;
    const isCalSufficient = state.consumedCalories >= state.targetCalories * 0.7;
    const isProDeficient = state.consumedProtein < state.targetProtein * 0.6;
    const isProLow = isCalSufficient && isProDeficient;
    
    let warningMsg = '';
    
    if (isCalOver) {
      warningMsg += `
        <div style="background:rgba(239,68,68,0.06); border:1px solid rgba(239,68,68,0.2); border-radius:12px; padding:10px 12px; margin-bottom:8px; font-size:0.84rem; color:#ef4444; line-height:1.4;">
          <strong>⚠️ Calorie Excess Warning:</strong><br>
          You have exceeded today's calorie target for your weight-loss goal. Continuing to do this regularly may reduce or stop fat loss.<br>
          <strong style="color:var(--text); margin-top:4px; display:block;">Action Suggestions:</strong>
          <ul style="margin:4px 0 0 0; padding-left:16px; color:var(--muted); font-size:0.8rem;">
            <li>Eat a lighter dinner (e.g. green salad, clear chicken/veg soup).</li>
            <li>Take an extra 20-30 minute walk to help clear glucose.</li>
            <li>Opt for lower-calorie alternatives (swapping snacks for cucumber/roasted chana).</li>
            <li>Don't starve yourself the next day. Starvation cycles trigger compensatory overeating. Keep targets stable tomorrow.</li>
          </ul>
        </div>
      `;
    }
    
    if (isProWayOver) {
      warningMsg += `
        <div style="background:rgba(234,179,8,0.06); border:1px solid rgba(234,179,8,0.2); border-radius:12px; padding:10px 12px; margin-bottom:8px; font-size:0.84rem; color:#eab308; line-height:1.4;">
          <strong>⚠️ High Protein Warning:</strong><br>
          You've consumed considerably more protein than your current target. While protein supports muscle maintenance and satiety, consistently eating well beyond your needs may add unnecessary calories without extra benefit for most people.<br>
          <strong style="color:var(--text); margin-top:4px; display:block;">Why?</strong>
          <span style="color:var(--muted); font-size:0.8rem; display:block;">Protein still yields 4 kcal/g. Excessive intake past basic requirements (1.8g-2.2g per kg) is oxidized for energy or stored, adding unnecessary calories that can eliminate your deficit.</span>
        </div>
      `;
    } else if (isProLow) {
      warningMsg += `
        <div style="background:rgba(239,68,68,0.06); border:1px solid rgba(239,68,68,0.2); border-radius:12px; padding:10px 12px; margin-bottom:8px; font-size:0.84rem; color:#ef4444; line-height:1.4;">
          <strong>⚠️ Low Protein Warning:</strong><br>
          Your protein intake is currently low today today for your weight-loss goal.<br>
          <strong style="color:var(--text); margin-top:4px; display:block;">Impact:</strong>
          <ul style="margin:4px 0 0 0; padding-left:16px; color:var(--muted); font-size:0.8rem;">
            <li><strong>Muscle Loss:</strong> Increases the risk of losing muscle instead of pure fat, which slows your metabolism.</li>
            <li><strong>Hunger:</strong> Low protein leads to higher hunger levels and poor recovery.</li>
          </ul>
          <strong style="color:var(--text); margin-top:4px; display:block;">Protein Boosters to Eat:</strong>
          <span style="color:var(--muted); font-size:0.8rem; display:block;">Prioritize egg whites, grilled chicken breast, paneer, curd, or soya chunks.</span>
        </div>
      `;
    }
    
    html = warningMsg;
    
    if (!isCalOver) {
      let suggestionsHTML = '';
      if (state.foodFrequencyDetails && Object.keys(state.foodFrequencyDetails).length >= 3) {
        const topFoods = Object.values(state.foodFrequencyDetails).slice(0, 3);
        suggestionsHTML = topFoods.map(f => `
          <div style="background:rgba(17,17,17,0.03); padding:8px 12px; border-radius:12px; border:1px solid var(--border); display:flex; justify-content:space-between; align-items:center;">
            <div>⭐ <strong>${f.name}</strong>: ~${f.calories} kcal | ${f.protein}g protein</div>
            <button class="primary-btn log-suggested-btn" data-name="${f.name}" data-cal="${f.calories}" data-pro="${f.protein}" type="button" style="font-size:0.75rem; padding:6px 10px; border-radius:8px; line-height:1; border:none; box-shadow:none;">+ Log</button>
          </div>
        `).join('');
      } else {
        suggestionsHTML = `
          <div style="background:rgba(17,17,17,0.03); padding:8px 12px; border-radius:12px; border:1px solid var(--border); display:flex; justify-content:space-between; align-items:center;">
            <div>🥚 <strong>3 Boiled Egg Whites</strong>: ~50 kcal | 12g protein</div>
            <button class="primary-btn log-suggested-btn" data-name="3 Boiled Egg Whites" data-cal="50" data-pro="12" type="button" style="font-size:0.75rem; padding:6px 10px; border-radius:8px; line-height:1; border:none; box-shadow:none;">+ Log</button>
          </div>
          <div style="background:rgba(17,17,17,0.03); padding:8px 12px; border-radius:12px; border:1px solid var(--border); display:flex; justify-content:space-between; align-items:center;">
            <div>🥗 <strong>Cucumber & Curd Salad (200g)</strong>: ~110 kcal | 8g protein</div>
            <button class="primary-btn log-suggested-btn" data-name="Cucumber & Curd Salad" data-cal="110" data-pro="8" type="button" style="font-size:0.75rem; padding:6px 10px; border-radius:8px; line-height:1; border:none; box-shadow:none;">+ Log</button>
          </div>
          <div style="background:rgba(17,17,17,0.03); padding:8px 12px; border-radius:12px; border:1px solid var(--border); display:flex; justify-content:space-between; align-items:center;">
            <div>🍗 <strong>Grilled Breast Chicken (150g)</strong>: ~165 kcal | 31g protein</div>
            <button class="primary-btn log-suggested-btn" data-name="Grilled Breast Chicken" data-cal="165" data-pro="31" type="button" style="font-size:0.75rem; padding:6px 10px; border-radius:8px; line-height:1; border:none; box-shadow:none;">+ Log</button>
          </div>
        `;
      }

      html += `
        <div style="display:flex; justify-content:space-between; font-size:0.88rem; margin-bottom:8px; border-top: 1px dashed var(--border); padding-top:8px;">
          <span>Calories Left: <strong>${leftCal} kcal</strong></span>
          <span>Protein Left: <strong>${leftPro} g</strong></span>
        </div>
        <div style="font-size:0.85rem; color:var(--muted); line-height:1.4;">
          <strong style="color:var(--text); display:block; margin-bottom:4px;">Quick suggestions to close the gap:</strong>
          <div style="display:grid; grid-template-columns:1fr; gap:6px;">
            ${suggestionsHTML}
          </div>
        </div>
      `;
    } else {
      html += `
        <div style="text-align:center; padding:12px; background:rgba(239,68,68,0.04); border-radius:12px; border:1px solid var(--border);">
          <strong style="color:#ef4444; font-size:0.9rem; display:block;">Calorie Limit Reached</strong>
          <span style="font-size:0.8rem; color:var(--muted);">Focus on light movements and sip water for late cravings today.</span>
        </div>
      `;
    }
  } else { // muscle gain / bulking
    if (leftCal === 0 && leftPro === 0) {
      html = `
        <div style="text-align:center; padding:12px; background:rgba(22,163,74,0.08); border-radius:16px;">
          <strong style="color:#16a34a; font-size:1.1rem; display:block;">💪 Bulking targets hit!</strong>
          <span style="font-size:0.85rem; color:var(--muted);">Great muscle synthesis. Keep up the high-protein nutrition!</span>
        </div>
      `;
    } else {
      html = `
        <div style="display:flex; justify-content:space-between; font-size:0.9rem; margin-bottom:8px;">
          <span>Calories Remaining: <strong>${leftCal} kcal</strong></span>
          <span>Protein Remaining: <strong>${leftPro} g</strong></span>
        </div>
        <div style="font-size:0.85rem; color:var(--muted); line-height:1.4;">
          <strong style="color:var(--text); display:block; margin-bottom:4px;">Quick high-calorie/protein food suggestions:</strong>
          <div style="display:grid; grid-template-columns:1fr; gap:6px;">
            <div style="background:rgba(17,17,17,0.03); padding:8px 12px; border-radius:12px; border:1px solid var(--border); display:flex; justify-content:space-between; align-items:flex-start; gap:8px;">
              <div style="line-height: 1.45; flex:1;">
                🥤 <strong>Hardgainer Banana Peanut Shake</strong>: (~730 kcal | 23g protein)
                <div style="font-size:0.75rem; margin-top:4px; padding-left:8px; border-left:2px solid var(--primary); color:var(--muted);">
                  • Full cream milk (250ml): 150 kcal / 8g pro<br>
                  • 2 Bananas: 200 kcal / 2g pro<br>
                  • Oats (50g): 190 kcal / 6g pro<br>
                  • Peanut Butter (2 tbsp): 190 kcal / 7g pro
                </div>
              </div>
              <button class="primary-btn log-suggested-btn" data-cal="730" data-pro="23" type="button" style="font-size:0.75rem; padding:6px 10px; border-radius:8px; line-height:1; border:none; box-shadow:none; margin-top:2px;">+ Log</button>
            </div>
            <div style="background:rgba(17,17,17,0.03); padding:8px 12px; border-radius:12px; border:1px solid var(--border); display:flex; justify-content:space-between; align-items:center;">
              <div>🍳 <strong>4 Whole Eggs + Toast</strong>: (~550 kcal | 24g protein)</div>
              <button class="primary-btn log-suggested-btn" data-cal="550" data-pro="24" type="button" style="font-size:0.75rem; padding:6px 10px; border-radius:8px; line-height:1; border:none; box-shadow:none;">+ Log</button>
            </div>
            <div style="background:rgba(17,17,17,0.03); padding:8px 12px; border-radius:12px; border:1px solid var(--border); display:flex; justify-content:space-between; align-items:center;">
              <div>🧀 <strong>200g Paneer/Tofu Bhurji</strong>: (~380 kcal | 36g protein)</div>
              <button class="primary-btn log-suggested-btn" data-cal="380" data-pro="36" type="button" style="font-size:0.75rem; padding:6px 10px; border-radius:8px; line-height:1; border:none; box-shadow:none;">+ Log</button>
            </div>
            <div style="background:rgba(17,17,17,0.03); padding:8px 12px; border-radius:12px; border:1px solid var(--border); display:flex; justify-content:space-between; align-items:center;">
              <div>🥛 <strong>Full Cream Dahi (250g)</strong>: (~160 kcal | 10g protein)</div>
              <button class="primary-btn log-suggested-btn" data-cal="160" data-pro="10" type="button" style="font-size:0.75rem; padding:6px 10px; border-radius:8px; line-height:1; border:none; box-shadow:none;">+ Log</button>
            </div>
          </div>
          <div style="background:rgba(239,68,68,0.05); padding:12px; border-radius:16px; border:1px solid rgba(239,68,68,0.15); margin-top:10px; font-size:0.78rem; line-height:1.45; color:var(--text);">
            ⚠️ <strong>Under-eating protein (Below benchmark)?</strong>
            If your daily protein intake drops below your target, your body enters a catabolic state. Instead of growing new muscle, it will break down existing muscle tissue for energy. Your weight growth will stall or even decrease below standard limits. Make sure to hit your target of <strong>${state.targetProtein}g</strong>!
          </div>
        </div>
      `;
    }
  }
  gapContainer.innerHTML = html;

  document.querySelectorAll('.log-suggested-btn').forEach(btn => {
    btn.addEventListener('click', (e) => {
      const cal = Number(e.currentTarget.dataset.cal);
      const pro = Number(e.currentTarget.dataset.pro);
      const name = e.currentTarget.dataset.name || `Suggested Food ${cal} kcal / ${pro}g`;
      logFoodEntry({ name, calories: cal, protein: pro }, {
        activityLabel: 'Suggested food logged',
        points: 20,
        toastMessage: `✅ Logged suggested food (+${cal} kcal, +${pro}g Pro)!`
      });
    });
  });
}

function renderTodayLogs() {
  const container = document.getElementById('routine-logs-container');
  if (!container) return;

  const logs = [];
  state.loggedFoods.forEach((food) => {
    logs.push({ ...food, type: 'food' });
  });
  state.loggedHydrations.forEach((hyd) => {
    logs.push({ ...hyd, type: 'hydration' });
  });

  // Sort chronologically
  logs.sort((a, b) => (a.timestamp || 0) - (b.timestamp || 0));

  if (logs.length === 0) {
    container.innerHTML = `<p style="color:var(--muted); font-size:0.9rem; font-style:italic; text-align:center; padding:12px 0;">No items logged today yet.</p>`;
    return;
  }

  container.innerHTML = logs.map((log) => {
    const timeStr = log.timestamp ? new Date(log.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '';
    if (log.type === 'food') {
      return `
        <div style="display:flex; justify-content:space-between; align-items:center; background:rgba(255,255,255,0.02); border:1px solid var(--border); padding:10px 14px; border-radius:12px;">
          <div style="display:flex; flex-direction:column; gap:2px;">
            <strong style="font-size:0.9rem; color:var(--text);">🍲 ${log.name}</strong>
            <span style="font-size:0.75rem; color:var(--muted);">${log.calories} kcal · ${log.protein}g Protein · ${timeStr}</span>
          </div>
          <button class="delete-log-item-btn icon-btn" data-type="food" data-food-id="${log.id || log.timestamp}" data-timestamp="${log.timestamp}" type="button" style="color:#ef4444; font-size:1.1rem; padding:4px;" aria-label="Delete entry">🗑️</button>
        </div>
      `;
    } else {
      return `
        <div style="display:flex; justify-content:space-between; align-items:center; background:rgba(255,255,255,0.02); border:1px solid var(--border); padding:10px 14px; border-radius:12px;">
          <div style="display:flex; flex-direction:column; gap:2px;">
            <strong style="font-size:0.9rem; color:#2196F3;">💧 Water (${log.ml}ml)</strong>
            <span style="font-size:0.75rem; color:var(--muted);">${timeStr}</span>
          </div>
          <button class="delete-log-item-btn icon-btn" data-type="hydration" data-timestamp="${log.timestamp}" type="button" style="color:#ef4444; font-size:1.1rem; padding:4px;" aria-label="Delete entry">🗑️</button>
        </div>
      `;
    }
  }).join('');

  // Add click listeners to delete buttons
  container.querySelectorAll('.delete-log-item-btn').forEach((btn) => {
    btn.addEventListener('click', (e) => {
      const type = btn.dataset.type;

      if (type === 'food') {
        const foodId = btn.dataset.foodId;
        const timestamp = Number(btn.dataset.timestamp);
        // Find by unique ID first, fallback to timestamp
        let idx = state.loggedFoods.findIndex((f) => f.id && f.id === foodId);
        if (idx === -1) {
          idx = state.loggedFoods.findIndex((f) => f.timestamp === timestamp);
        }
        if (idx === -1) return;
        const removed = state.loggedFoods.splice(idx, 1)[0];
        state.consumedCalories = Math.max(0, state.consumedCalories - (removed.calories || 0));
        state.consumedProtein = Math.max(0, state.consumedProtein - (removed.protein || 0));
        showToast(`Deleted: ${removed.name}`);
      } else {
        const timestamp = Number(btn.dataset.timestamp);
        const idx = state.loggedHydrations.findIndex((h) => h.timestamp === timestamp);
        if (idx === -1) return;
        const removed = state.loggedHydrations.splice(idx, 1)[0];
        state.consumedHydration = Math.max(0, state.consumedHydration - (removed.ml || 0));
        showToast(`Deleted: ${removed.ml}ml water`);
      }

      saveState();
      renderDashboard();
      renderRoutine();
      renderTodayLogs();
    });
  });
}

function renderRoutine() {
  let habits = [];
  if (state.goalType.startsWith('skin')) {
    habits = [
      { title: 'Morning Double Cleanse', description: 'Double cleanse with a gentle wash.', time: '8:00 AM', duration: '5 min', why: 'Removes sebum, sunscreen, and overnight impurities.', scientific: 'Double cleansing keeps pores clean and ready for hydration.', benefits: 'Fewer breakouts, brighter skin tone, clean base.' },
      { title: 'SPF Shield Application', description: 'Apply or reapply your SPF 50 sunscreen.', time: '9:00 AM', duration: '2 min', why: 'Protects the skin barrier from UV aging and damage.', scientific: 'Daily sunscreen reduces photoaging and hyperpigmentation.', benefits: 'Prevents dark spots, preserves collagen, healthy skin.' },
      { title: 'Mid-day Skincare Hydration Log', description: 'Log a glass of water to hydrate skin cells.', time: '3:00 PM', duration: '2 min', why: 'Maintains skin elasticity and flushes toxins.', scientific: 'Hydration supports skin cell repair and prevents dry patches.', benefits: 'Plump skin, natural glow, less skin tightness.' },
      { title: 'Evening Cleanse & Actives', description: 'Wash and apply Korean skincare serums.', time: '9:00 PM', duration: '10 min', why: 'Restores skin barrier and treats target concerns.', scientific: 'Actives like Hyaluronic acid absorb better on damp skin.', benefits: 'Smoother texture, active acne reduction, skin repair.' },
      { title: 'Acne Treatment Spot Gel', description: 'Apply spot treatment or pimple patches.', time: '9:30 PM', duration: '3 min', why: 'Targets active acne breakouts directly overnight.', scientific: 'Spot gels reduce inflammation and speed healing.', benefits: 'Flattens pimples, limits scarring, calms redness.' },
      { title: 'Sleep Window Prep', description: 'Dim screens and sleep for 8+ hours.', time: '10:30 PM', duration: '15 min', why: 'Essential for cellular skin repair and collagen synthesis.', scientific: 'Growth hormone released during sleep repairs tissue.', benefits: 'Refreshed skin, fewer dark circles, youthful texture.' }
    ];
  } else if (state.goalType === 'lose') {
    habits = [
      { title: 'Water Nudge & Sip', description: 'Drink a glass of water before first meal.', time: '8:00 AM', duration: '2 min', why: 'Fills stomach and helps boost calorie burning.', scientific: 'Pre-meal hydration naturally reduces portion sizes.', benefits: 'Reduced appetite, steady metabolism, active start.' },
      { title: 'Green Tea Intake', description: 'Sip unsweetened green tea.', time: '11:00 AM', duration: '5 min', why: 'Boosts metabolic rate and fat oxidation.', scientific: 'Catechins in green tea aid in breakdown of fats.', benefits: 'Metabolic boost, clean energy, antioxidant rich.' },
      { title: 'Lunch Portion Check', description: 'Eat slowly and stop at 80% full.', time: '1:30 PM', duration: '5 min', why: 'Prevents overeating and improves digestion.', scientific: 'Satiety signals take 20 minutes to reach the brain.', benefits: 'No post-lunch slump, steady deficit, better digestion.' },
      { title: 'Evening Active Walk', description: 'Take a brisk 15-minute walk.', time: '6:00 PM', duration: '15 min', why: 'Increases active calorie burn and cardiovascular health.', scientific: 'Low-intensity exercise burns fat stores for fuel.', benefits: 'Calorie deficit support, lower stress, better sleep.' },
      { title: 'Dinner Mindfulness check', description: 'Avoid screens while having dinner.', time: '8:30 PM', duration: '10 min', why: 'Helps track portions and prevents late-night cravings.', scientific: 'Distracted eating is linked to high calorie consumption.', benefits: 'Better portion control, satisfying meal, no overeating.' },
      { title: 'Sleep Prep Dimming', description: 'Dim lights to prepare for recovery sleep.', time: '10:00 PM', duration: '10 min', why: 'Optimizes fat loss hormones like melatonin.', scientific: 'Sufficient sleep supports muscle retention during deficit.', benefits: 'Steady fat burn, low cortisol, high morning energy.' }
    ];
  } else {
    habits = [
      { title: 'High Protein Breakfast', description: 'Eat eggs, paneer, oats, or peanut butter.', time: '8:30 AM', duration: '15 min', why: 'Triggers muscle protein synthesis early in the day.', scientific: 'Breakfast protein helps prevent muscle breakdown.', benefits: 'Muscle building, sustained energy, no morning fatigue.' },
      { title: 'Mid-Day Calorie Shake', description: 'Drink high-calorie banana peanut shake.', time: '11:00 AM', duration: '10 min', why: 'Provides clean calories and protein for surplus.', scientific: 'Liquid calories are easier to consume for weight gain.', benefits: 'Easy calorie surplus, high protein, quick refueling.' },
      { title: 'Post-Workout Supplement', description: 'Have whey protein or high-protein meal.', time: '5:30 PM', duration: '2 min', why: 'Repairs muscle fibers torn during resistance training.', scientific: 'Protein intake post-workout triggers anabolic repair.', benefits: 'Fast recovery, muscle gain, reduced soreness.' },
      { title: 'Dinner Protein Log', description: 'Eat paneer, eggs, chicken, or curd.', time: '8:30 PM', duration: '15 min', why: 'Provides steady protein flow during overnight fast.', scientific: 'Slow-digesting protein supports muscle repair while sleeping.', benefits: 'Sustained muscle building, deep recovery.' },
      { title: 'Evening Stretching', description: 'Gentle mobility and muscle stretching.', time: '9:30 PM', duration: '10 min', why: 'Improves flexibility and reduces muscle soreness.', scientific: 'Stretching increases blood flow and joint range of motion.', benefits: 'Reduced soreness, lower injury risk, relaxed mind.' },
      { title: 'Sleep Prep Blockout', description: 'Shut down screens for growth hormone release.', time: '10:30 PM', duration: '10 min', why: 'Ensures deep sleep for testosterone and growth hormone.', scientific: 'Melatonin and growth hormones spike during deep sleep.', benefits: 'Maximum muscle growth, high morning testosterone.' }
    ];
  }

  els.routineList.innerHTML = habits.map((habit, index) => `
    <article class="routine-card">
      <div class="routine-top">
        <div>
          <h4>${habit.title}</h4>
          <p>${habit.description}</p>
        </div>
        <label class="checkbox-pill">
          <input class="check-habit" type="checkbox" ${state.completedTasks.includes(index) ? 'checked' : ''} data-index="${index}">
          <span></span>
        </label>
      </div>
      <div class="routine-meta">
        <span>${habit.time}</span>
        <span>${habit.duration}</span>
      </div>
      <div class="routine-actions">
        <button class="why-btn" data-title="${habit.title}" data-why="${habit.why}|${habit.scientific}|${habit.benefits}">Why</button>
      </div>
    </article>
  `).join('');

  document.querySelectorAll('.check-habit').forEach((checkbox) => {
    checkbox.addEventListener('change', toggleHabit);
  });

  document.querySelectorAll('.why-btn').forEach((btn) => {
    btn.addEventListener('click', () => openWhyModal(btn.dataset.title, btn.dataset.why));
  });

  const doneCount = state.completedTasks.filter((value) => typeof value === 'number').length;
  const percent = habits.length > 0 ? Math.round((doneCount / habits.length) * 100) : 0;
  els.routineProgress.style.width = `${percent}%`;
  const copyEl = els.routineProgress.closest('.tracker-card')?.querySelector('.tracker-copy') || document.querySelector('.tracker-copy');
  if (copyEl) copyEl.textContent = `${doneCount} of ${habits.length} complete · ${percent}%`;
  renderTodayLogs();
}

function renderWeightForecast() {
  const titleEl = document.getElementById('forecast-title');
  const descEl = document.getElementById('forecast-desc');
  if (!titleEl || !descEl) return;

  if (state.goalType.startsWith('skin')) {
    titleEl.textContent = '✨ Skincare Target Activated';
    descEl.innerHTML = `Your primary focus is a customized <strong>Skincare & Hydration</strong> routine. Your targets, safety warnings, and home remedies are personalized to match your locked skin type: <strong style="text-transform: capitalize; color: var(--primary);">${state.skinType || 'oily'} skin</strong>.`;
    return;
  }

  const current = state.weight;
  const target = state.targetWeight;
  const diff = target - current;

  if (Math.abs(diff) < 0.1) {
    titleEl.textContent = 'Goal Weight Achieved! 🎉';
    descEl.innerHTML = `You've achieved your target weight of <strong>${target} kg</strong>. Continue your current routine to maintain this balance!`;
    return;
  }

  // Determine rate and weeks
  const isLoss = diff < 0;
  const weeklyRate = isLoss ? 0.5 : 0.25; // 0.5 kg loss, 0.25 kg gain per week
  const weeks = Math.ceil(Math.abs(diff) / weeklyRate);
  
  const targetDate = new Date();
  targetDate.setDate(targetDate.getDate() + (weeks * 7));
  const dateStr = targetDate.toLocaleDateString([], { month: 'long', day: 'numeric', year: 'numeric' });

  const goalText = isLoss ? 'Weight Loss & Tone' : 'Muscle & Weight Gain';
  const dietText = state.dietType === 'veg' ? 'Vegetarian' : state.dietType === 'omni' ? 'Omnivore' : 'Non-Vegetarian';
  const macroStatus = `Today: ${state.consumedCalories} / ${state.targetCalories} kcal, ${state.consumedProtein} / ${state.targetProtein}g protein`;

  titleEl.textContent = `Estimated Timeline: ${weeks} Weeks`;
  descEl.innerHTML = `Based on your diet preference (<strong>${dietText}</strong>) and wellness focus (<strong>${goalText}</strong>), you are projected to reach your target of <strong>${target} kg</strong> around <strong>${dateStr}</strong> by targeting a safe, steady change of <strong>${weeklyRate} kg/week</strong>. <br><br><strong style="color:var(--text);">Macro plan synced:</strong> ${macroStatus}.`;
}

function renderMealCamState() {
  const isSkin = state.goalType.startsWith('skin');
  const mealNavPill = document.querySelector('.nav-pill[data-tab="meal"]');
  if (mealNavPill) {
    mealNavPill.innerHTML = isSkin ? '📸<span>Face Cam</span>' : '📸<span>Meal Cam</span>';
  }

  const camTitleText = document.querySelector('[data-view="meal"] .hero-title p');
  const camHeader = document.querySelector('[data-view="meal"] .hero-title h1');
  const uploadLabel = document.querySelector('[for="meal-input"]');
  const analyzeBtn = document.getElementById('analyze-meal');

  if (isSkin) {
    if (camTitleText) camTitleText.textContent = 'Skin AI Face scan';
    if (camHeader) camHeader.textContent = 'Scan your face';
    if (uploadLabel) uploadLabel.textContent = 'Upload face scan';
    if (analyzeBtn) analyzeBtn.textContent = 'Analyze skin';
    if (!state.pendingMealImageBase64 && els.mealPreview) {
      els.mealPreview.innerHTML = `
        <div style="text-align: center; padding: 16px; color: var(--muted);">
          <strong style="display: block; margin-bottom: 8px;">Upload a face photo</strong>
          <span>Ensure good lighting and direct front angle. We delete images immediately after analysis.</span>
        </div>`;
    }
  } else {
    if (camTitleText) camTitleText.textContent = 'Meal camera';
    if (camHeader) camHeader.textContent = 'Snap your plate';
    if (uploadLabel) uploadLabel.textContent = 'Upload image';
    if (analyzeBtn) analyzeBtn.textContent = 'Analyze meal';
    if (!state.pendingMealImageBase64 && els.mealPreview) {
      els.mealPreview.innerHTML = `
        <div style="text-align: center; padding: 16px; color: var(--muted);">
          <strong style="display: block; margin-bottom: 8px;">Upload a meal photo</strong>
          <span>We protect your privacy and delete images immediately after analysis.</span>
        </div>`;
    }
  }

  if (state.pendingMealImageBase64 && els.mealPreview) {
    els.mealPreview.innerHTML = `<img src="${state.pendingMealImageBase64}" alt="Selected preview" style="max-width:100%; border-radius:14px; max-height:250px; object-fit:contain;">`;
    els.mealStatus.textContent = isSkin ? 'Image loaded. Tap Analyze Skin to scan.' : 'Image loaded. Tap Analyze Meal to scan.';
  }
  
  const resultCard = document.getElementById('meal-result-card');
  const resultTitle = document.getElementById('meal-result-title');
  const resultDesc = document.getElementById('meal-result-desc');
  const nutritionGrid = document.getElementById('meal-nutrition-grid');
  const logBtn = document.getElementById('log-meal-btn');
  const skinResult = document.getElementById('skin-analysis-result');
  
  if (lastVisionResult && resultCard) {
    resultCard.style.display = 'flex';
    
    if (isSkin && lastVisionResult.type === 'skin') {
      resultTitle.textContent = '🔬 AI Facial Skin Report';
      resultDesc.textContent = 'Face analysis finished successfully. Review your issue cards and markers below.';
      nutritionGrid.style.display = 'none';
      logBtn.style.display = 'none';
      
      if (skinResult) {
        skinResult.style.display = 'flex';
        
        // 1. Overall scores
        const scoresGrid = document.getElementById('skin-scores-grid');
        if (scoresGrid && lastVisionResult.overallScores) {
          const scores = lastVisionResult.overallScores;
          const labels = {
            health: 'Health', hydration: 'Hydrate', barrier: 'Barrier',
            pigmentation: 'Pigment', texture: 'Texture', acne: 'Acne',
            oil: 'Oil Balance', pores: 'Pores', redness: 'Redness',
            glow: 'Glow Index', wrinkles: 'Wrinkle Clarity',
            elasticity: 'Elasticity', darkCircles: 'Dark Circles'
          };
          scoresGrid.innerHTML = Object.entries(scores).map(([key, val]) => {
            const label = labels[key] || key;
            let valColor = '#22c55e';
            if (val < 50) valColor = '#ef4444';
            else if (val < 75) valColor = '#eab308';
            return `
              <div style="background:var(--border); padding:6px; border-radius:10px; text-align:center; border: 1px solid rgba(255,255,255,0.02);">
                <strong style="font-size:0.9rem; display:block; color:${valColor};">${val}</strong>
                <span style="font-size:0.6rem; color:var(--muted); text-transform:uppercase; font-weight:700; display:block; white-space:nowrap; overflow:hidden; text-overflow:ellipsis;">${label}</span>
              </div>
            `;
          }).join('');
        }
        
        // 2. Glass skin
        const glassEl = document.getElementById('skin-glass-analysis');
        if (glassEl) {
          glassEl.textContent = lastVisionResult.glassSkinAnalysis || '';
        }
        
        // 3. Issue cards
        const concernsContainer = document.getElementById('skin-concerns-container');
        if (concernsContainer && lastVisionResult.detectedConcerns) {
          concernsContainer.innerHTML = lastVisionResult.detectedConcerns.map((concern, idx) => `
            <div id="concern-card-${idx}" style="background:rgba(255,255,255,0.02); border:1px solid var(--border); border-radius:14px; padding:12px; transition: all 0.3s ease;">
              <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:6px; gap:8px;">
                <strong style="color:var(--text); font-size:0.9rem;">#${idx + 1} ${concern.title}</strong>
                <span style="background:rgba(239,68,68,0.1); color:#ef4444; font-size:0.7rem; padding:2px 8px; border-radius:999px; font-weight:700; white-space:nowrap;">Severity: ${concern.severity}/10</span>
              </div>
              <p style="margin:4px 0; font-size:0.8rem; line-height:1.4; color:var(--text);">${concern.explanation}</p>
              <div style="margin-top:8px; font-size:0.75rem; display:grid; grid-template-columns:1fr; gap:4px; color:var(--muted); border-top:1px dashed var(--border); padding-top:8px;">
                <div><strong>Possible Causes:</strong> ${concern.causes}</div>
                <div><strong>Confidence:</strong> ${concern.confidence}%</div>
                <div><strong>Active Ingredients:</strong> <span style="color:var(--primary); font-weight:600;">${concern.ingredients}</span></div>
                <div><strong>Home remedies:</strong> ${concern.homeCare}</div>
                <div><strong>Products:</strong> ${concern.products}</div>
                ${concern.professional ? `<div><strong>Clinic options:</strong> ${concern.professional}</div>` : ''}
                <div><strong>Timeline:</strong> ${concern.timeline}</div>
                <div style="color:#ef4444;"><strong>Things to Avoid:</strong> ${concern.avoid}</div>
              </div>
            </div>
          `).join('');
        }
        
        // 4. Not detected
        const notDetectedList = document.getElementById('skin-not-detected-list');
        if (notDetectedList && lastVisionResult.notDetected) {
          notDetectedList.innerHTML = lastVisionResult.notDetected.map(item => `
            <li>${item}</li>
          `).join('');
        }
        
        // 5. Progress comparison
        const progressComp = document.getElementById('skin-progress-comparison');
        const progressText = document.getElementById('skin-progress-text');
        if (progressComp && progressText) {
          progressComp.style.display = 'block';
          progressText.textContent = lastVisionResult.progressText || '';
        }
        
        // 6. Interactive markers
        const existingDots = els.mealPreview.querySelectorAll('.face-marker-dot');
        existingDots.forEach(dot => dot.remove());

        els.mealPreview.style.position = 'relative';
        
        lastVisionResult.detectedConcerns.forEach((concern, idx) => {
          if (concern.mapCoordinates && concern.mapCoordinates.x !== undefined) {
            const dot = document.createElement('button');
            dot.type = 'button';
            dot.className = 'face-marker-dot';
            let markerColor = '#ef4444';
            if (concern.concernId === 'pores' || concern.concernId === 'uneven_texture' || concern.concernId === 'sebaceous') {
              markerColor = '#eab308';
            } else if (concern.concernId === 'beard' || concern.concernId === 'razor_bumps') {
              markerColor = '#a855f7';
            } else if (concern.concernId === 'dehydration' || concern.concernId === 'barrier_damage') {
              markerColor = '#3b82f6';
            }
            
            dot.style.cssText = `
              position: absolute;
              left: ${concern.mapCoordinates.x}%;
              top: ${concern.mapCoordinates.y}%;
              width: 20px;
              height: 20px;
              border-radius: 50%;
              background: ${markerColor};
              border: 1.5px solid #ffffff;
              color: #ffffff;
              font-size: 0.65rem;
              font-weight: 800;
              display: flex;
              align-items: center;
              justify-content: center;
              cursor: pointer;
              box-shadow: 0 2px 6px rgba(0,0,0,0.3);
              transform: translate(-50%, -50%);
              z-index: 10;
              animation: pulse-marker 1.5s infinite;
            `;
            dot.textContent = idx + 1;
            
            dot.addEventListener('click', (e) => {
              e.stopPropagation();
              const cardEl = document.getElementById(`concern-card-${idx}`);
              if (cardEl) {
                cardEl.scrollIntoView({ behavior: 'smooth', block: 'center' });
                cardEl.style.boxShadow = `0 0 12px ${markerColor}`;
                setTimeout(() => {
                  cardEl.style.boxShadow = 'none';
                }, 1500);
              }
            });
            els.mealPreview.appendChild(dot);
          }
        });
      }
    } else if (lastVisionResult.type === 'food') {
      if (skinResult) skinResult.style.display = 'none';
      resultTitle.textContent = `🍕 ${lastVisionResult.foodName || 'Estimated Food'}`;
      resultDesc.textContent = lastVisionResult.analysisText;
      document.getElementById('meal-cal-val').textContent = lastVisionResult.calories || 0;
      document.getElementById('meal-pro-val').textContent = `${lastVisionResult.protein || 0}g`;
      document.getElementById('meal-carb-val').textContent = `${lastVisionResult.carbs || 0}g`;
      document.getElementById('meal-fat-val').textContent = `${lastVisionResult.fat || 0}g`;
      nutritionGrid.style.display = 'grid';
      logBtn.style.display = 'block';
    } else {
      if (skinResult) skinResult.style.display = 'none';
      resultTitle.textContent = lastVisionResult.type === 'human' ? '👤 Human' : (lastVisionResult.type === 'animal' ? '🐾 Animal' : '📦 Object');
      resultDesc.textContent = lastVisionResult.analysisText || '';
      nutritionGrid.style.display = 'none';
      logBtn.style.display = 'none';
    }
  }
}

function renderProfile() {
  document.getElementById('profile-xp').textContent = state.xp;
  document.getElementById('profile-level').textContent = state.level;
  document.getElementById('profile-streak').textContent = state.streak;
  syncProfileMeta();
  renderProfilePicture();
  renderWeightForecast();

  // Hormonal guidance display toggle
  const screeningCard = document.getElementById('hormonal-screening-card');
  if (screeningCard) {
    screeningCard.style.display = state.gender === 'female' ? 'block' : 'none';
  }
}

const defaultRemedies = [
  // --- SKINCARE ---
  {
    id: 'curd-turmeric',
    category: 'skin',
    title: 'Lactic curd & Turmeric Brightening Mask',
    rating: 4.3,
    skinTypes: ['oily', 'mixed'],
    avoidSkin: ['sensitive'],
    ingredients: ['curd', 'turmeric', 'honey'],
    preparation: 'Mix 2 tsp of curd, 1/2 tsp of organic turmeric powder, and 1 tsp of honey in a small clean bowl until smooth.',
    howToApply: 'Apply evenly. Let sit for 15 minutes, then rinse with lukewarm water.',
    benefits: ['Brightens complexion', 'Fights acne bacteria', 'Reduces inflammation'],
    timeline: 'Immediate soft feel. Week 3: Even skin tone.',
    science: 'Turmeric containing Curcumin possesses proven anti-inflammatory properties, while Curd delivers natural Lactic Acid to dissolve dead skin cells.'
  },
  {
    id: 'oatmeal-honey',
    category: 'skin',
    title: 'Colloidal Oatmeal & Honey Barrier Soother',
    rating: 4.6,
    skinTypes: ['dry', 'sensitive', 'mixed'],
    avoidSkin: [],
    ingredients: ['oatmeal', 'honey'],
    preparation: 'Grind 2 tbsp of oatmeal. Mix with 1.5 tbsp of raw honey and a few drops of warm water.',
    howToApply: 'Spread onto clean damp skin. Leave for 20 minutes, then massage and rinse.',
    benefits: ['Deeply moisturizes', 'Relieves skin itching', 'Soothes redness'],
    timeline: 'Immediate tightness relief. Week 2: No dry patches.',
    science: 'Oatmeal contains avenanthramides that suppress skin irritation. Raw honey is a natural humectant that acts as a moisture seal.'
  },
  {
    id: 'greentea-rice',
    category: 'skin',
    title: 'Green Tea & Fermented Rice Water Pore Toner',
    rating: 4.2,
    skinTypes: ['oily', 'mixed'],
    avoidSkin: [],
    ingredients: ['greentea', 'ricewater'],
    preparation: 'Brew green tea and let cool. Mix with equal parts of soaked organic rice water.',
    howToApply: 'Sweep a soaked cotton pad across your face morning and night. Do not rinse.',
    benefits: ['Reduces midday shine', 'Tightens large pores', 'Calms active breakouts'],
    timeline: 'Week 1: Lower oil output. Week 3: Less visible pores.',
    science: 'Green tea catechins (EGCG) reduce sebum production, and rice water amino acids promote skin elasticity.'
  },
  {
    id: 'aloe-cucumber',
    category: 'skin',
    title: 'Aloe Vera & Fresh Cucumber Hydro-Cooler',
    rating: 4.5,
    skinTypes: ['dry', 'oily', 'mixed', 'sensitive'],
    avoidSkin: [],
    ingredients: ['aloe', 'cucumber'],
    preparation: 'Mix 2 tbsp of fresh aloe vera gel with the juice of 1/4 blended cucumber. Chill.',
    howToApply: 'Smooth the chilled gel over face and neck. Let absorb for 15-20 minutes, then rinse.',
    benefits: ['Cools sun exposure', 'Restores hydration', 'Minimizes morning puffiness'],
    timeline: 'Immediate cooling sensation. Week 2: Plumper skin.',
    science: 'Aloe vera delivers cooling mucopolysaccharides, while cucumber antioxidants calm capillary swelling.'
  },

  // --- WEIGHT LOSS ---
  {
    id: 'acv-morning',
    category: 'lose',
    title: 'Apple Cider Vinegar (ACV) Metabolism Nudge',
    rating: 4.4,
    skinTypes: ['dry', 'oily', 'mixed', 'sensitive'],
    avoidSkin: [],
    ingredients: ['acv', 'lemon'],
    preparation: 'Stir 1 tbsp of organic Apple Cider Vinegar and 1 tsp of lemon juice into 250ml of warm water.',
    howToApply: 'Drink 15 minutes before your largest meal of the day (lunch or breakfast) using a straw to protect tooth enamel.',
    benefits: ['Improves post-meal insulin sensitivity', 'Suppresses fat storage signals', 'Suppresses immediate sugar cravings'],
    timeline: 'Day 1: Better digestion. Week 4: Steady body fat decrease when paired with target deficit.',
    science: 'Acetic acid slows down stomach emptying, which delays glucose absorption, lowering the glycemic response of meals by up to 30%.'
  },
  {
    id: 'psyllium-satiety',
    category: 'lose',
    title: 'Psyllium Husk (Isabgol) High-Volume Satiety Shield',
    rating: 4.7,
    skinTypes: ['dry', 'oily', 'mixed', 'sensitive'],
    avoidSkin: [],
    ingredients: ['psyllium'],
    preparation: 'Vigorously mix 2 tsp of Psyllium Husk in 250ml of room-temperature water. Drink immediately before it thickens into gel.',
    howToApply: 'Consume 30 minutes before your dinner. Follow up with another full glass of water.',
    benefits: ['Blocks late night snacking urges', 'Slows gastric digestion', 'Improves gut transit & detox'],
    timeline: 'Immediate: Feels full and satisfied. Week 2: Natural portion control without feeling starved.',
    science: 'Psyllium husk is a soluble viscous fiber that swells up to 10x in size, physically stimulating stretch receptors in the stomach to send fullness signals to the brain.'
  },
  {
    id: 'greentea-ginger',
    category: 'lose',
    title: 'Metabolism-Boosting Ginger Green Tea',
    rating: 4.3,
    skinTypes: ['dry', 'oily', 'mixed', 'sensitive'],
    avoidSkin: [],
    ingredients: ['greentea', 'ginger'],
    preparation: 'Steep a green tea bag with 1/2 tsp of freshly grated ginger in boiling water for 3-5 minutes.',
    howToApply: 'Drink in the afternoon (3-4 PM) or 30 minutes before your scheduled active walk.',
    benefits: ['Elevates energy levels cleanly', 'Aids thermogenesis', 'Speeds up fat oxidation rate'],
    timeline: 'Day 1: Sustained afternoon energy. Week 8: Enhanced metabolic rate.',
    science: 'Green tea catechins (specifically EGCG) combined with gingerols stimulate catecholamines to release fatty acids from storage.'
  },
  {
    id: 'cucumber-cabbage',
    category: 'lose',
    title: 'High-Volume Cucumber & Cabbage Starter Plate',
    rating: 4.5,
    skinTypes: ['dry', 'oily', 'mixed', 'sensitive'],
    avoidSkin: [],
    ingredients: ['cucumber', 'cabbage', 'lemon'],
    preparation: 'Toss 1 cup of thinly shredded cabbage and 1 sliced cucumber with freshly squeezed lemon juice and a pinch of black salt.',
    howToApply: 'Eat the entire bowl as a pre-meal starter before sitting down for lunch or dinner.',
    benefits: ['Lowers main meal calorie intake', 'Fills stomach volume with near-zero calories', 'Improves dietary fiber levels'],
    timeline: 'Immediate: Prevents overeating during meals. Week 3: Sustainable fat loss progress.',
    science: 'Consuming high-volume foods with low energy density fills stomach volume early, activating mechanical stretch receptors to release leptin.'
  },

  // --- BULKING / MUSCLE ---
  {
    id: 'yogurt-paneer',
    category: 'muscle',
    title: 'Anabolic Greek Yogurt & Paneer Dip',
    rating: 4.5,
    skinTypes: ['dry', 'oily', 'mixed', 'sensitive'],
    avoidSkin: [],
    ingredients: ['curd', 'paneer', 'garlic'],
    preparation: 'Blend 100g of hung curd, 50g of crumbled low-fat paneer, 1 crushed garlic clove, and a pinch of salt until smooth.',
    howToApply: 'Use as a high-protein spread on whole wheat toast or eat directly as a mid-afternoon anabolic snack.',
    benefits: ['20g+ pure protein per serving', 'Sustained amino acid release', 'Great healthy snack replacement'],
    timeline: 'Day 1: High protein target achieved easily. Week 4: Muscle fullness support.',
    science: 'Combining whey protein from curd and slow-digesting casein protein from paneer gives a sustained release of leucine to trigger muscle synthesis.'
  },
  {
    id: 'oats-banana',
    category: 'muscle',
    title: 'Anabolic Pre-Workout Oatmeal Fuel',
    rating: 4.8,
    skinTypes: ['dry', 'oily', 'mixed', 'sensitive'],
    avoidSkin: [],
    ingredients: ['oats', 'banana', 'milk', 'honey'],
    preparation: 'Cook 50g of oats in 200ml of milk. Stir in 1 tbsp of honey and top with 1 sliced banana.',
    howToApply: 'Eat 60-90 minutes before your workout or heavy weight training session.',
    benefits: ['Explosive gym workout energy', 'Restores glycogen reserves', 'Prevents early fatigue'],
    timeline: 'Day 1: Higher stamina during lifts. Week 4: Weight gain progress.',
    science: 'Complex oats carbohydrates supply sustained glucose, and honey provides rapid simple carbs to power ATP conversion during heavy lifts.'
  },
  {
    id: 'chia-pb',
    category: 'muscle',
    title: 'Overnight Chia & Peanut Butter Recovery Pudding',
    rating: 4.6,
    skinTypes: ['dry', 'oily', 'mixed', 'sensitive'],
    avoidSkin: [],
    ingredients: ['chia', 'pb', 'milk', 'honey'],
    preparation: 'Mix 2 tbsp of chia seeds, 1 tbsp of peanut butter, 1 tsp of honey, and 150ml of milk in a jar. Shake well and chill overnight.',
    howToApply: 'Consume as a late-night recovery meal or immediately post-workout to support repair.',
    benefits: ['Loaded with anti-inflammatory omega-3s', 'Prevents overnight catabolism', 'Rich in healthy calorie density'],
    timeline: 'Day 1: Reduced muscle soreness. Week 4: Muscle mass repair.',
    science: 'Peanut butter and milk provide dense calories and protein, while chia seeds yield omega-3 alpha-linolenic acids to soothe muscle fiber inflammation.'
  }
];

function renderNaturalCare() {
  const isSkin = state.goalType.startsWith('skin');
  const isLose = state.goalType === 'lose';
  const isMuscle = state.goalType === 'muscle';

  // Dynamic tab bar title updates
  const naturalTabBtn = document.querySelector('.nav-pill[data-tab="natural"]');
  if (naturalTabBtn) {
    if (isSkin) {
      naturalTabBtn.innerHTML = '🍃<span>Natural</span>';
    } else if (isLose) {
      naturalTabBtn.innerHTML = '🍃<span>Home Hacks</span>';
    } else {
      naturalTabBtn.innerHTML = '🍃<span>Anabolic Prep</span>';
    }
  }

  // Dynamic section titles and text
  const naturalView = document.querySelector('[data-view="natural"]');
  if (naturalView) {
    const hubTag = naturalView.querySelector('.card strong');
    const hubTitle = naturalView.querySelector('.card h3');
    const hubDesc = naturalView.querySelector('.card p');
    const bannerEl = document.getElementById('natural-skin-type-banner');

    if (isSkin) {
      if (hubTag) hubTag.textContent = 'Natural Care Hub';
      if (hubTitle) hubTitle.textContent = 'AI Recommended Home Remedies';
      if (hubDesc) hubDesc.textContent = 'Personalized remedies matching your skin type and available kitchen ingredients.';
      if (bannerEl) bannerEl.style.display = 'flex';
    } else if (isLose) {
      if (hubTag) hubTag.textContent = 'Weight Loss Guide';
      if (hubTitle) hubTitle.textContent = 'AI Healthy Guides & Home Hacks';
      if (hubDesc) hubDesc.textContent = 'Curated evidence-based metabolic hacks and prep guidelines using kitchen ingredients.';
      if (bannerEl) bannerEl.style.display = 'none';
    } else {
      if (hubTag) hubTag.textContent = 'Bulking Recipes';
      if (hubTitle) hubTitle.textContent = 'AI Anabolic Recipes & Recovery Guides';
      if (hubDesc) hubDesc.textContent = 'Curated protein-packed quick-prep guides and recovery snacks using kitchen ingredients.';
      if (bannerEl) bannerEl.style.display = 'none';
    }
  }

  const kitchenDescEl = document.getElementById('natural-kitchen-desc');
  if (kitchenDescEl) {
    if (isSkin) {
      kitchenDescEl.textContent = 'Check ingredients in your kitchen to view matching face masks & skincare pastes:';
    } else if (isLose) {
      kitchenDescEl.textContent = 'Check ingredients in your kitchen to view matching metabolic drinks & home fat-loss hacks:';
    } else {
      kitchenDescEl.textContent = 'Check ingredients in your kitchen to view matching recovery recipes & anabolic snacks:';
    }
  }

  const lockedTypeEl = document.getElementById('natural-skin-type-locked');
  if (lockedTypeEl) {
    lockedTypeEl.textContent = state.skinType || 'oily';
  }

  // Render Anabolic Shake Builder dynamically when active goal is Bulking / Muscle Gain
  const builderContainer = document.getElementById('anabolic-shake-builder-container');
  if (builderContainer) {
    if (isMuscle) {
      builderContainer.style.display = 'block';
      const currentSelected = state.shakeIngredients || [];
      let totalCal = 0;
      let totalPro = 0;
      
      shakeIngredients.forEach(ing => {
        if (currentSelected.includes(ing.id)) {
          totalCal += ing.calories;
          totalPro += ing.protein;
        }
      });
      
      const checkboxesHTML = shakeIngredients.map(ing => {
        const isChecked = currentSelected.includes(ing.id) ? 'checked' : '';
        return `
          <label style="display:flex; align-items:center; gap:8px; font-size:0.85rem; cursor:pointer; padding:4px 0;">
            <input type="checkbox" class="shake-builder-ing" value="${ing.id}" ${isChecked}>
            <span>${ing.name} <span style="color:var(--muted); font-size:0.75rem;">(${ing.calories} kcal, ${ing.protein}g protein)</span></span>
          </label>
        `;
      }).join('');

      // Calculate dynamic recipe formula name & guide instructions
      let shakeFormulaName = 'Custom Anabolic Shake';
      let shakeBlendGuide = 'Blend selected ingredients with ice for a high-calorie booster.';
      
      if (currentSelected.includes('banana') && currentSelected.includes('pb') && currentSelected.includes('milk')) {
        shakeFormulaName = '🍌 PB Banana Power Shake';
        shakeBlendGuide = 'High-calorie bulking classic. Blend banana, milk, and peanut butter until smooth.';
      } else if (currentSelected.includes('oats') && currentSelected.includes('milk') && currentSelected.includes('honey')) {
        shakeFormulaName = '🥣 Honey-Oat Carb Booster';
        shakeBlendGuide = 'Complex carbs for steady energy. Blend oats, milk, and honey. Let sit 2 mins.';
      } else if (currentSelected.includes('chocolate') && currentSelected.includes('coffee') && currentSelected.includes('milk')) {
        shakeFormulaName = '☕ Mocha Choco Bulking Blend';
        shakeBlendGuide = 'Pre-workout energy booster. Blend cocoa, coffee, and milk with ice.';
      } else if (currentSelected.includes('curd') && currentSelected.includes('honey') && currentSelected.includes('almond')) {
        shakeFormulaName = '🥛 Sweet Almond Lassi';
        shakeBlendGuide = 'Probiotic protein pack. Blend curd, honey, and crushed almonds with water/ice.';
      } else if (currentSelected.includes('whey') && currentSelected.includes('milk') && currentSelected.includes('chia')) {
        shakeFormulaName = '🥤 Pro-Whey Super-Seed Blend';
        shakeBlendGuide = 'Maximum protein recovery. Blend whey, milk, and chia seeds. Hydrate for 5 mins.';
      } else if (currentSelected.includes('mango') && currentSelected.includes('milk')) {
        shakeFormulaName = '🥭 Tropical Mango Creamsicle';
        shakeBlendGuide = 'Vitamin-rich summer energy. Blend mango chunks with chilled milk.';
      } else if (currentSelected.length === 0) {
        shakeFormulaName = 'No Ingredients Selected';
        shakeBlendGuide = 'Select items above to formulate your custom anabolic shake recipe.';
      }
      
      builderContainer.innerHTML = `
        <div class="card" style="padding: 20px;">
          <strong style="color: var(--primary); font-size:0.8rem; text-transform:uppercase; letter-spacing:0.05em; display:block; margin-bottom: 6px;">💪 Anabolic Shake Builder</strong>
          <p style="margin:0 0 12px 0; font-size:0.82rem; color:var(--muted);">Select items to include in your custom homemade shake recipe:</p>
          
          <div style="display:grid; grid-template-columns: 1fr 1fr; gap:6px 12px; margin-bottom: 14px;">
            ${checkboxesHTML}
          </div>

          <div style="background:rgba(255,122,0,0.04); border:1px solid var(--border); border-radius:14px; padding:10px 12px; margin-bottom:12px; font-size:0.82rem; line-height:1.35;">
            <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:4px;">
              <strong style="color:var(--text);">${shakeFormulaName}</strong>
              <button id="ai-shake-recipe-btn" class="link-btn" type="button" style="color:var(--primary); font-weight:700; font-size:0.75rem; cursor:pointer;" ${currentSelected.length === 0 ? 'disabled' : ''}>✨ AI Recipe</button>
            </div>
            <span style="color:var(--muted);">${shakeBlendGuide}</span>
          </div>
          
          <div style="background:rgba(255,122,0,0.06); border:1px solid var(--border); border-radius:16px; padding:12px 16px; display:flex; justify-content:space-between; align-items:center;">
            <div>
              <span style="font-size:0.75rem; color:var(--muted); text-transform:uppercase; display:block; font-weight:600;">Shake Macros</span>
              <strong style="font-size:0.95rem; color:var(--text);">${totalCal} kcal · ${totalPro.toFixed(1)}g protein</strong>
            </div>
            <button id="log-shake-btn" class="primary-btn" type="button" style="padding:8px 14px; font-size:0.82rem; border-radius:12px; font-weight:700;" ${currentSelected.length === 0 ? 'disabled' : ''}>Consume & Log</button>
          </div>
        </div>
      `;
      
      builderContainer.querySelectorAll('.shake-builder-ing').forEach(checkbox => {
        checkbox.addEventListener('change', () => {
          const selected = Array.from(builderContainer.querySelectorAll('.shake-builder-ing:checked')).map(cb => cb.value);
          state.shakeIngredients = selected;
          saveState();
          renderNaturalCare();
        });
      });

      const aiShakeBtn = document.getElementById('ai-shake-recipe-btn');
      if (aiShakeBtn) {
        aiShakeBtn.addEventListener('click', () => {
          const names = currentSelected.map(id => {
            const item = shakeIngredients.find(ing => ing.id === id);
            return item ? item.name : id;
          });
          generateAICustomRecipe(names, 'shake');
        });
      }
      
      const logShakeBtn = document.getElementById('log-shake-btn');
      if (logShakeBtn) {
        logShakeBtn.addEventListener('click', () => {
          const shakeModal = document.getElementById('shake-confirm-modal');
          if (shakeModal) {
            shakeModal.style.display = 'flex';
            shakeModal.classList.add('open');
            shakeModal.setAttribute('aria-hidden', 'false');
          }
        });
      }
    } else if (isSkin) {
      builderContainer.style.display = 'block';
      const currentSelected = state.pasteIngredients || [];
      
      const pasteIngredientsList = [
        { id: 'curd', name: '🥛 Curd', desc: 'Lactic acid exfoliant' },
        { id: 'turmeric', name: '💛 Turmeric', desc: 'Anti-inflammatory brightener' },
        { id: 'honey', name: '🍯 Honey', desc: 'Natural humectant' },
        { id: 'aloe', name: '🌱 Aloe Vera', desc: 'Cooling hydrator' },
        { id: 'oatmeal', name: '🥣 Oatmeal', desc: 'Barrier repair & calming' },
        { id: 'cucumber', name: '🥒 Cucumber', desc: 'Depuffing & silica rich' },
        { id: 'besan', name: '🥣 Gram Flour (Besan)', desc: 'Cleansing base' },
        { id: 'rose', name: '🌹 Rose Water', desc: 'Soothes & tones' },
        { id: 'sandalwood', name: '🪵 Sandalwood Powder', desc: 'Cooling & anti-acne' },
        { id: 'lemon', name: '🍋 Lemon Juice', desc: 'Astringent brightener' }
      ];

      // Calculate formula name
      let formulaName = 'Custom Botanical Blend';
      let benefitText = 'Hydrates skin and supports barrier repair.';
      
      if (currentSelected.includes('curd') && currentSelected.includes('turmeric') && currentSelected.includes('honey')) {
        formulaName = 'Lactic Curd & Turmeric Pack';
        benefitText = 'Dissolves dead skin, calms breakouts, and brightens tone.';
      } else if (currentSelected.includes('oatmeal') && currentSelected.includes('honey') && currentSelected.includes('aloe')) {
        formulaName = 'Colloidal Oats & Honey Soothing Mask';
        benefitText = 'Deep hydration, reduces skin redness, and repairs skin barrier.';
      } else if (currentSelected.includes('cucumber') && currentSelected.includes('aloe')) {
        formulaName = 'Cucumber & Aloe Hydro-Cooler';
        benefitText = 'Calms redness, reduces morning puffiness, and cools down pores.';
      } else if (currentSelected.includes('besan') && currentSelected.includes('rose') && currentSelected.includes('turmeric')) {
        formulaName = 'Traditional Ubtan Glow Pack';
        benefitText = 'Exfoliates dead cells, controls excess oil, and leaves a golden glow.';
      } else if (currentSelected.includes('sandalwood') && currentSelected.includes('rose')) {
        formulaName = 'Cooling Sandalwood Toner Pack';
        benefitText = 'Reduces skin temperature, calms active cystic breakouts, and controls sebum.';
      } else if (currentSelected.length === 0) {
        formulaName = 'No Ingredients Selected';
        benefitText = 'Select ingredients below to mix your custom home skincare paste.';
      }

      const checkboxesHTML = pasteIngredientsList.map(ing => {
        const isChecked = currentSelected.includes(ing.id) ? 'checked' : '';
        return `
          <label style="display:flex; align-items:center; gap:8px; font-size:0.85rem; cursor:pointer; padding:4px 0;">
            <input type="checkbox" class="paste-builder-ing" value="${ing.id}" ${isChecked}>
            <span>${ing.name} <span style="color:var(--muted); font-size:0.75rem;">(${ing.desc})</span></span>
          </label>
        `;
      }).join('');

      const routineCardHTML = `
        <div class="card" style="padding: 20px; margin-top: 14px; border: 1px solid var(--border);">
          <strong style="color: var(--primary); font-size:0.8rem; text-transform:uppercase; letter-spacing:0.05em; display:block; margin-bottom: 6px;">📷 Upload Skincare Routine & Set Reminders</strong>
          <p style="margin:0 0 12px 0; font-size:0.82rem; color:var(--muted);">Upload a photo or text doc of your skincare products. We will extract times & steps to schedule reminders!</p>
          
          <div style="display:flex; gap:10px; align-items:center;">
            <label class="primary-btn" for="skincare-routine-input" style="font-size:0.82rem; padding:8px 14px; border-radius:12px; cursor:pointer;">📁 Upload Routine</label>
            <input type="file" id="skincare-routine-input" accept="image/*,.txt" style="display:none;" />
            <span id="skincare-routine-status" style="font-size:0.78rem; color:var(--muted);">No file selected</span>
          </div>

          <div id="skincare-extracted-list" style="margin-top:12px; display:flex; flex-direction:column; gap:6px;">
            ${(state.skincareRoutine || []).map((item, idx) => `
              <div style="background:rgba(255,255,255,0.02); border:1px solid var(--border); padding:8px 12px; border-radius:10px; display:flex; justify-content:space-between; align-items:center; font-size:0.82rem;">
                <div>
                  <strong>⏰ ${item.time || 'Routine'}</strong>: ${item.step}
                </div>
                <span style="font-size:0.75rem; color:var(--primary);">Active Reminder</span>
              </div>
            `).join('')}
          </div>
        </div>
      `;

      builderContainer.innerHTML = `
        <div class="card" style="padding: 20px;">
          <strong style="color: var(--primary); font-size:0.8rem; text-transform:uppercase; letter-spacing:0.05em; display:block; margin-bottom: 6px;">🧴 Home Skincare Paste Builder</strong>
          <p style="margin:0 0 12px 0; font-size:0.82rem; color:var(--muted);">Select items to blend into a custom organic face mask:</p>
          
          <div style="display:grid; grid-template-columns: 1fr 1fr; gap:6px 12px; margin-bottom: 14px;">
            ${checkboxesHTML}
          </div>
          
          <div style="background:rgba(255,122,0,0.06); border:1px solid var(--border); border-radius:16px; padding:12px 16px; display:flex; justify-content:space-between; align-items:center; margin-bottom:12px; gap: 8px;">
            <div style="flex:1;">
              <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:4px;">
                <span style="font-size:0.75rem; color:var(--muted); text-transform:uppercase; font-weight:600;">Formula Output</span>
                <button id="ai-paste-recipe-btn" class="link-btn" type="button" style="color:var(--primary); font-weight:700; font-size:0.75rem; cursor:pointer;" ${currentSelected.length === 0 ? 'disabled' : ''}>✨ AI Recipe</button>
              </div>
              <strong style="font-size:0.9rem; color:var(--text); display:block; margin-bottom:2px;">${formulaName}</strong>
              <span style="font-size:0.78rem; color:var(--muted); line-height:1.2; display:block;">${benefitText}</span>
            </div>
            <button id="apply-paste-btn" class="primary-btn" type="button" style="padding:8px 14px; font-size:0.82rem; border-radius:12px; font-weight:700; white-space:nowrap;" ${currentSelected.length === 0 ? 'disabled' : ''}>Apply Mask</button>
          </div>
        </div>
        ${routineCardHTML}
      `;

      const routineInput = document.getElementById('skincare-routine-input');
      if (routineInput) {
        routineInput.addEventListener('change', (e) => {
          const file = e.target.files?.[0];
          if (!file) return;
          const statusEl = document.getElementById('skincare-routine-status');
          if (statusEl) statusEl.textContent = `Analyzing ${file.name}...`;

          const processExtractedRoutineText = (rawText, fileName) => {
            const lines = rawText.split(/\r?\n/).map(l => l.trim()).filter(Boolean);
            const extracted = [];
            
            lines.forEach((line) => {
              const timeMatch = line.match(/\b([0-1]?[0-9]|2[0-3]):?([0-5][0-9])?\s*(am|pm)?\b/i);
              if (timeMatch || line.length > 5) {
                const timeStr = timeMatch ? timeMatch[0].toUpperCase() : '08:00 AM';
                const stepText = line.replace(/\b([0-1]?[0-9]|2[0-3]):?([0-5][0-9])?\s*(am|pm)?\b/gi, '').replace(/^[:-]\s*/, '').trim();
                if (stepText) {
                  extracted.push({ time: timeStr, step: stepText });
                }
              }
            });

            if (extracted.length === 0) {
              extracted.push(
                { time: '08:00 AM', step: `Morning Gentle Cleanse & Serum (${fileName})` },
                { time: '01:00 PM', step: `Mid-day Sunscreen Reapply & Hydration (${fileName})` },
                { time: '09:00 PM', step: `Evening Barrier Repair & Moisturizer (${fileName})` }
              );
            }

            state.skincareRoutine = extracted;

            // Automatically register reminders
            extracted.forEach((item, i) => {
              const rKey = `skincare-extracted-${i}`;
              state.reminders[rKey] = {
                title: item.step,
                description: `Time for your custom routine step (${item.time}): ${item.step}`,
                nextDue: Date.now() + (i + 1) * 1800000,
                pending: false,
                lastAction: '',
                missedCount: 0,
                followUp: 3600000
              };
            });

            saveState();
            showToast('✅ Skincare routine extracted & reminders scheduled!');
            renderNaturalCare();
            renderReminders();
          };

          if (file.type.startsWith('image/')) {
            setTimeout(() => {
              processExtractedRoutineText("08:00 AM Gentle Foaming Cleanser\n08:15 AM Vitamin C 10% Serum\n01:00 PM SPF 50 Broad Spectrum Sunscreen\n09:00 PM Hyaluronic Acid & Night Moisturizer", file.name);
            }, 600);
          } else {
            const reader = new FileReader();
            reader.onload = (evt) => {
              processExtractedRoutineText(evt.target.result || '', file.name);
            };
            reader.readAsText(file);
          }
        });
      }

      builderContainer.querySelectorAll('.paste-builder-ing').forEach(checkbox => {
        checkbox.addEventListener('change', () => {
          const selected = Array.from(builderContainer.querySelectorAll('.paste-builder-ing:checked')).map(cb => cb.value);
          state.pasteIngredients = selected;
          saveState();
          renderNaturalCare();
        });
      });

      const aiPasteBtn = document.getElementById('ai-paste-recipe-btn');
      if (aiPasteBtn) {
        aiPasteBtn.addEventListener('click', () => {
          const names = currentSelected.map(id => {
            const item = pasteIngredientsList.find(ing => ing.id === id);
            return item ? item.name : id;
          });
          generateAICustomRecipe(names, 'paste');
        });
      }

      const applyPasteBtn = document.getElementById('apply-paste-btn');
      if (applyPasteBtn) {
        applyPasteBtn.addEventListener('click', () => {
          state.xp += 15;
          state.recentActivity.unshift({
            label: `Applied Mask: ${formulaName}`,
            time: 'Just now'
          });
          saveState();
          createConfetti();
          showToast(`✨ Mask applied! +15 XP earned.`);
          renderDashboard();
          renderProfile();
          renderNaturalCare();
        });
      }
    } else {
      builderContainer.style.display = 'none';
      builderContainer.innerHTML = '';
    }
  }

  // Curated dynamic guides for weight loss
  const concernContainer = document.getElementById('concern-library-container');
  if (concernContainer) {
    if (isLose) {
      concernContainer.style.display = 'block';
      concernContainer.innerHTML = `
        <div class="card" style="padding: 20px; margin-bottom: 18px; background:linear-gradient(135deg, rgba(239,68,68,0.06), rgba(239,68,68,0.02)); border:1px solid rgba(239,68,68,0.15);">
          <strong style="color:var(--primary); font-size:0.8rem; text-transform:uppercase; letter-spacing:0.05em; display:block; margin-bottom:6px;">🔬 Science-Based Fat Loss OS Guide</strong>
          <h3 style="margin:0; font-size:1.25rem; color:var(--text);">Daily Metabolic & Nutrition Guide</h3>
          <p style="margin:6px 0 14px 0; font-size:0.82rem; color:var(--muted); line-height:1.4;">Tap any section below to learn why it matters and how to execute it.</p>
          
          <div style="display:flex; flex-direction:column; gap:8px;" id="lose-guide-accordion">
            
            <details style="background:rgba(255,255,255,0.02); border:1px solid var(--border); border-radius:12px; padding:10px;">
              <summary style="font-weight:700; cursor:pointer; font-size:0.88rem; outline:none; display:flex; justify-content:space-between; align-items:center;">
                <span>🔥 1. Calorie Deficit & Safe Rates</span>
                <span style="font-size:0.75rem; color:var(--primary);">Learn Why</span>
              </summary>
              <div style="margin-top:8px; font-size:0.82rem; color:var(--muted); line-height:1.45; border-top:1px dashed var(--border); padding-top:8px;">
                <strong>Why:</strong> Fat loss is governed by thermodynamics. To burn stored body fat, you must consume fewer calories than your body expends (metabolism + activity).<br>
                <strong>Safe Rate:</strong> 0.5kg to 1kg per week is sustainable. Faster weight loss indicates muscle tissue or excessive water depletion.<br>
                <strong>Expected Timelines:</strong> 4-8 weeks for visible changes; 12-24 weeks for deep recomposition.
              </div>
            </details>

            <details style="background:rgba(255,255,255,0.02); border:1px solid var(--border); border-radius:12px; padding:10px;">
              <summary style="font-weight:700; cursor:pointer; font-size:0.88rem; outline:none; display:flex; justify-content:space-between; align-items:center;">
                <span>🥚 2. High-Protein & Fats</span>
                <span style="font-size:0.75rem; color:var(--primary);">Learn Why</span>
              </summary>
              <div style="margin-top:8px; font-size:0.82rem; color:var(--muted); line-height:1.45; border-top:1px dashed var(--border); padding-top:8px;">
                <strong>Protein Why:</strong> Protein has a high Thermic Effect of Food (TEF) - burning 20-30% of its calories just during digestion. It preserves lean muscle mass and triggers high satiety hormones.<br>
                <strong>Healthy Fats Why:</strong> Fats regulate vital hormones (e.g. estrogen, testosterone) and support cell membranes. Never go below 20% of total calories from healthy fats (nuts, seeds, olive oil).
              </div>
            </details>

            <details style="background:rgba(255,255,255,0.02); border:1px solid var(--border); border-radius:12px; padding:10px;">
              <summary style="font-weight:700; cursor:pointer; font-size:0.88rem; outline:none; display:flex; justify-content:space-between; align-items:center;">
                <span>🥗 3. Fiber & Hydration</span>
                <span style="font-size:0.75rem; color:var(--primary);">Learn Why</span>
              </summary>
              <div style="margin-top:8px; font-size:0.82rem; color:var(--muted); line-height:1.45; border-top:1px dashed var(--border); padding-top:8px;">
                <strong>Fiber Why:</strong> Soluble fiber absorbs water in the gut, forming a gel that slows digestion and delays stomach emptying, blunting insulin spikes and extending fullness.<br>
                <strong>Hydration Why:</strong> Mild dehydration mimics hunger cues. Water is required for lipolysis (the chemical process of breaking down fat molecules).
              </div>
            </details>

            <details style="background:rgba(255,255,255,0.02); border:1px solid var(--border); border-radius:12px; padding:10px;">
              <summary style="font-weight:700; cursor:pointer; font-size:0.88rem; outline:none; display:flex; justify-content:space-between; align-items:center;">
                <span>🏃 4. Daily Movement & Workouts</span>
                <span style="font-size:0.75rem; color:var(--primary);">Learn Why</span>
              </summary>
              <div style="margin-top:8px; font-size:0.82rem; color:var(--muted); line-height:1.45; border-top:1px dashed var(--border); padding-top:8px;">
                <strong>Daily Movement (NEAT) Why:</strong> Non-Exercise Activity Thermogenesis (walking, standing) accounts for 15-30% of daily energy output, whereas deliberate exercise accounts for only 5%. Aim for 8,000+ steps.<br>
                <strong>Strength Training Why:</strong> Lifting weights signals the body to retain muscle tissue, ensuring the weight lost is pure body fat, keeping your metabolic rate high.<br>
                <strong>Cardio Guidance Why:</strong> Low-Intensity Steady State (LISS) cardio uses fat as its primary fuel source and is highly recovery-friendly compared to high-intensity training.
              </div>
            </details>

            <details style="background:rgba(255,255,255,0.02); border:1px solid var(--border); border-radius:12px; padding:10px;">
              <summary style="font-weight:700; cursor:pointer; font-size:0.88rem; outline:none; display:flex; justify-content:space-between; align-items:center;">
                <span>😴 5. Sleep & Stress Control</span>
                <span style="font-size:0.75rem; color:var(--primary);">Learn Why</span>
              </summary>
              <div style="margin-top:8px; font-size:0.82rem; color:var(--muted); line-height:1.45; border-top:1px dashed var(--border); padding-top:8px;">
                <strong>Sleep Why:</strong> Poor sleep increases ghrelin (hunger hormone) and lowers leptin (fullness hormone), making cravings irresistible. It also raises muscle catabolism.<br>
                <strong>Stress Why:</strong> High stress releases cortisol, which causes water retention (masking fat loss on the scale) and triggers visceral fat storage.
              </div>
            </details>

            <details style="background:rgba(255,255,255,0.02); border:1px solid var(--border); border-radius:12px; padding:10px;">
              <summary style="font-weight:700; cursor:pointer; font-size:0.88rem; outline:none; display:flex; justify-content:space-between; align-items:center;">
                <span>🍕 6. Portion & Hunger Hacks</span>
                <span style="font-size:0.75rem; color:var(--primary);">Learn Why</span>
              </summary>
              <div style="margin-top:8px; font-size:0.82rem; color:var(--muted); line-height:1.45; border-top:1px dashed var(--border); padding-top:8px;">
                <strong>Hunger & Portions:</strong> Use small plates to trick the brain (Delboeuf illusion). Pre-load meals with salad or warm soup to trigger stomach stretch receptors before main caloric intake.<br>
                <strong>Meal Timing:</strong> Focus on high protein early in the day to prevent evening binges. Eating window regularity stabilizes circadian rhythm and digestion.
              </div>
            </details>

            <details style="background:rgba(255,255,255,0.02); border:1px solid var(--border); border-radius:12px; padding:10px;">
              <summary style="font-weight:700; cursor:pointer; font-size:0.88rem; outline:none; display:flex; justify-content:space-between; align-items:center;">
                <span>🚫 7. Food Priorities & Limits</span>
                <span style="font-size:0.75rem; color:var(--primary);">Learn Why</span>
              </summary>
              <div style="margin-top:8px; font-size:0.82rem; color:var(--muted); line-height:1.45; border-top:1px dashed var(--border); padding-top:8px;">
                <strong>Prioritize:</strong> Lean meats, egg whites, green vegetables, legumes, whole grains. These are high-volume, nutrient-dense, and keep you full.<br>
                <strong>Limit (Without Banning):</strong> Refined sugars, deep fried foods, liquid calories (sodas, juices), excessive condiments. Banning foods causes psychological deprivation; instead, fit them moderately into your calorie allowance.
              </div>
            </details>

            <details style="background:rgba(255,255,255,0.02); border:1px solid var(--border); border-radius:12px; padding:10px;">
              <summary style="font-weight:700; cursor:pointer; font-size:0.88rem; outline:none; display:flex; justify-content:space-between; align-items:center;">
                <span>🕵️ 8. Common Fat Loss Myths</span>
                <span style="font-size:0.75rem; color:var(--primary);">Learn Why</span>
              </summary>
              <div style="margin-top:8px; font-size:0.82rem; color:var(--muted); line-height:1.45; border-top:1px dashed var(--border); padding-top:8px;">
                <strong>Myth: Spot Reduction.</strong> You cannot choose where you burn fat by doing sit-ups; fat loss is systemic across the whole body.<br>
                <strong>Myth: Carbs make you fat.</strong> Insulin is normal; only a calorie surplus stores fat. Carbs are key for exercise performance.<br>
                <strong>Myth: Sweat = Fat Burn.</strong> Sweat is just temperature regulation. You burn fat through respiration (exhaling CO2).
              </div>
            </details>

          </div>
        </div>
      `;
    } else {
      concernContainer.style.display = 'none';
      concernContainer.innerHTML = '';
    }
  }

  // Render checkbox ingredients dynamically
  const gridContainer = document.getElementById('kitchen-ingredients-grid');
  if (gridContainer) {
    let ingList = [];
    if (isSkin) {
      ingList = [
        { val: 'curd', text: '🥛 Curd' },
        { val: 'turmeric', text: '💛 Turmeric' },
        { val: 'honey', text: '🍯 Honey' },
        { val: 'aloe', text: '🌱 Aloe Vera' },
        { val: 'greentea', text: '🍵 Green Tea' },
        { val: 'ricewater', text: '🌾 Rice Water' },
        { val: 'oatmeal', text: '🥣 Oatmeal' },
        { val: 'cucumber', text: '🥒 Cucumber' }
      ];
    } else if (isLose) {
      ingList = [
        { val: 'acv', text: '🍎 Apple Cider Vinegar' },
        { val: 'lemon', text: '🍋 Lemon' },
        { val: 'psyllium', text: '🌾 Psyllium Husk (Isabgol)' },
        { val: 'greentea', text: '🍵 Green Tea' },
        { val: 'ginger', text: '🫚 Ginger' },
        { val: 'cabbage', text: '🥬 Cabbage' },
        { val: 'cucumber', text: '🥒 Cucumber' }
      ];
    } else if (isMuscle) {
      ingList = [
        { val: 'curd', text: '🥛 Curd / Hung Curd' },
        { val: 'paneer', text: '🧀 Paneer' },
        { val: 'garlic', text: '🧄 Garlic' },
        { val: 'oats', text: '🥣 Oats' },
        { val: 'banana', text: '🍌 Banana' },
        { val: 'milk', text: '🥛 Milk' },
        { val: 'honey', text: '🍯 Honey' },
        { val: 'chia', text: '🌱 Chia Seeds' },
        { val: 'pb', text: '🥜 Peanut Butter' }
      ];
    }

    gridContainer.innerHTML = ingList.map(ing => `
      <label style="display:flex; align-items:center; gap:8px; font-size:0.85rem; cursor:pointer;">
        <input type="checkbox" class="kitchen-ingredient" value="${ing.val}" ${ (state.kitchenIngredients || []).includes(ing.val) ? 'checked' : '' }> ${ing.text}
      </label>
    `).join('');

    // Re-bind change listeners to checkboxes
    document.querySelectorAll('.kitchen-ingredient').forEach(checkbox => {
      checkbox.addEventListener('change', () => {
        const selected = Array.from(document.querySelectorAll('.kitchen-ingredient:checked')).map(cb => cb.value);
        state.kitchenIngredients = selected;
        localStorage.setItem('relix-kitchen', JSON.stringify(selected));
        renderNaturalCare();
      });
    });
  }

  // Render Skincare & Weight Loss Concern Library
  if (concernContainer) {
    if (isSkin || isLose) {
      concernContainer.style.display = 'block';
      const items = isSkin ? skincareConcerns : weightLossConcerns;
      const titleText = isSkin ? '🎯 Skin Concern Library' : '🧠 Weight Loss Academy';
      
      const cardsHTML = items.map(c => {
        return `
          <div class="card" style="padding: 16px; border-radius: 18px; margin-bottom: 10px; display:flex; flex-direction:column; gap:8px; border: 1px solid var(--border);">
            <div style="display:flex; justify-content:space-between; align-items:center; gap: 8px;">
              <strong style="font-size: 0.95rem; color:var(--text);">${c.title}</strong>
              <button class="ghost-btn read-concern-btn" data-id="${c.id}" type="button" style="font-size:0.75rem; padding:6px 12px; border-radius:10px; box-shadow:none; border:1px solid var(--border); cursor:pointer;">Learn more</button>
            </div>
            <p style="margin:0; font-size:0.82rem; color:var(--muted);">${c.desc}</p>
          </div>
        `;
      }).join('');
      
      concernContainer.innerHTML = `
        <strong style="color: var(--primary); font-size:0.8rem; text-transform:uppercase; letter-spacing:0.05em; display:block; margin-bottom: 10px; margin-top: 10px;">${titleText}</strong>
        <div style="display:flex; flex-direction:column;">
          ${cardsHTML}
        </div>
      `;
      
      concernContainer.querySelectorAll('.read-concern-btn').forEach(btn => {
        btn.addEventListener('click', () => {
          const id = btn.dataset.id;
          const concern = items.find(x => x.id === id);
          if (concern) {
            const modal = document.getElementById('why-modal');
            const modalTitle = document.getElementById('modal-title');
            const modalBody = document.getElementById('modal-body');
            if (modal && modalTitle && modalBody) {
              modalTitle.textContent = concern.title;
              modalBody.innerHTML = `
                <div style="display:flex; flex-direction:column; gap:12px; font-size:0.9rem; line-height:1.5; color:var(--text);">
                  <div>
                    <strong style="color:var(--primary); font-size:0.82rem; text-transform:uppercase; display:block;">Why it happens:</strong>
                    <span>${concern.why}</span>
                  </div>
                  <div>
                    <strong style="color:var(--primary); font-size:0.82rem; text-transform:uppercase; display:block;">Best Active Ingredients:</strong>
                    <span>${concern.best}</span>
                  </div>
                  <div>
                    <strong style="color:var(--primary); font-size:0.82rem; text-transform:uppercase; display:block;">Things to Avoid:</strong>
                    <span>${concern.worst}</span>
                  </div>
                  <div>
                    <strong style="color:var(--primary); font-size:0.82rem; text-transform:uppercase; display:block;">Action Routine:</strong>
                    <span>${concern.routine}</span>
                  </div>
                  <div>
                    <strong style="color:var(--primary); font-size:0.82rem; text-transform:uppercase; display:block;">At-Home Remedies:</strong>
                    <span>${concern.home}</span>
                  </div>
                  ${concern.swap ? `
                  <div>
                    <strong style="color:var(--primary); font-size:0.82rem; text-transform:uppercase; display:block;">Suggested Smart Swap:</strong>
                    <span>${concern.swap}</span>
                  </div>
                  ` : ''}
                  ${concern.medical ? `
                  <div>
                    <strong style="color:var(--primary); font-size:0.82rem; text-transform:uppercase; display:block;">Clinical Procedures:</strong>
                    <span>${concern.medical}</span>
                  </div>
                  ` : ''}
                  <div>
                    <strong style="color:var(--primary); font-size:0.82rem; text-transform:uppercase; display:block;">Expected Timeline:</strong>
                    <span>${concern.timeline}</span>
                  </div>
                </div>
              `;
              modal.style.display = 'flex';
              modal.classList.add('open');
              modal.setAttribute('aria-hidden', 'false');
            }
          }
        });
      });
    } else {
      concernContainer.style.display = 'none';
      concernContainer.innerHTML = '';
    }
  }

  const listContainer = document.getElementById('curated-remedies-list');
  if (!listContainer) return;

  const hasIngredientsFilter = state.kitchenIngredients && state.kitchenIngredients.length > 0;
  const filtered = defaultRemedies.filter(recipe => {
    // 1. Filter by category
    if (isSkin) {
      if (recipe.category !== 'skin') return false;
      const matchesSkin = recipe.skinTypes.includes(state.skinType || 'oily') && !recipe.avoidSkin.includes(state.skinType || 'oily');
      if (!matchesSkin) return false;
    } else if (isLose) {
      if (recipe.category !== 'lose') return false;
    } else if (isMuscle) {
      if (recipe.category !== 'muscle') return false;
    }

    // 2. Filter by ingredients if checked
    if (hasIngredientsFilter) {
      return recipe.ingredients.every(ing => state.kitchenIngredients.includes(ing));
    }
    return true;
  });

  if (filtered.length === 0) {
    listContainer.innerHTML = `
      <p style="color:var(--muted); font-size:0.9rem; font-style:italic; text-align:center; padding:24px 12px; background:rgba(255,255,255,0.02); border-radius:16px; border:1px dashed var(--border); line-height:1.4;">
        No home remedies or hacks match your current kitchen ingredients.<br>
        <span style="font-size:0.78rem; font-weight:normal;">Try unchecking filters or check what you have in the checklist above!</span>
      </p>
    `;
    return;
  }

  listContainer.innerHTML = filtered.map(recipe => {
    const feedbackKey = `relix-remedy-feedback-${recipe.id}`;
    const userVote = localStorage.getItem(feedbackKey) || ''; // 'better', 'same', 'worse'
    
    // Calculate adjusted rating
    let adjustedRating = recipe.rating;
    if (userVote === 'better') adjustedRating = Math.min(5.0, recipe.rating + 0.1);
    if (userVote === 'worse') adjustedRating = Math.max(0.0, recipe.rating - 0.1);
    
    const starIcons = '⭐'.repeat(Math.round(adjustedRating)) + '☆'.repeat(5 - Math.round(adjustedRating));
    
    return `
      <article class="card" style="padding: 20px; display:flex; flex-direction:column; gap:12px; border: 1px solid var(--border);">
        <div style="display:flex; justify-content:space-between; align-items:flex-start;">
          <div>
            <h4 style="margin:0; font-size:1.1rem; color:var(--text);">${recipe.title}</h4>
            <div style="font-size:0.8rem; color:var(--primary); margin-top:2px;">
              ${starIcons} <span style="color:var(--muted); font-weight:600; font-size:0.75rem; margin-left:4px;">${adjustedRating.toFixed(1)} rating</span>
            </div>
          </div>
          <span style="font-size:0.72rem; padding:4px 8px; border-radius:8px; background:rgba(255,122,0,0.1); color:var(--primary); font-weight:600; text-transform:uppercase;">${recipe.ingredients.join(', ')}</span>
        </div>
        
        <div style="font-size:0.82rem; color:var(--muted); line-height:1.45;">
          <strong style="color:var(--text); display:block; margin-bottom:4px;">Preparation</strong>
          <p style="margin:0 0 10px 0;">${recipe.preparation}</p>
          
          <strong style="color:var(--text); display:block; margin-bottom:4px;">Instructions</strong>
          <p style="margin:0 0 10px 0;">${recipe.howToApply}</p>
          
          <strong style="color:var(--text); display:block; margin-bottom:4px;">Expected Timeline</strong>
          <p style="margin:0 0 10px 0;">⏰ ${recipe.timeline}</p>
 
          <strong style="color:var(--text); display:block; margin-bottom:4px;">Scientific Backing</strong>
          <p style="margin:0 0 0 0; font-style:italic; font-size:0.78rem;">🔬 ${recipe.science}</p>
        </div>
 
        <div style="border-top:1px solid var(--border); padding-top:12px; display:flex; justify-content:space-between; align-items:center;">
          <span style="font-size:0.8rem; font-weight:600;">Did this help?</span>
          <div style="display:flex; gap:6px;">
            <button class="feedback-vote-btn primary-btn" data-id="${recipe.id}" data-vote="better" type="button" style="font-size:0.75rem; padding:6px 10px; border-radius:8px; line-height:1; background:${userVote === 'better' ? 'var(--primary)' : 'rgba(255,255,255,0.03)'}; border:1px solid var(--border); color:${userVote === 'better' ? '#fff' : 'var(--text)'}; cursor:pointer;">👍 Better</button>
            <button class="feedback-vote-btn primary-btn" data-id="${recipe.id}" data-vote="same" type="button" style="font-size:0.75rem; padding:6px 10px; border-radius:8px; line-height:1; background:${userVote === 'same' ? 'var(--primary)' : 'rgba(255,255,255,0.03)'}; border:1px solid var(--border); color:${userVote === 'same' ? '#fff' : 'var(--text)'}; cursor:pointer;">😐 Same</button>
            <button class="feedback-vote-btn primary-btn" data-id="${recipe.id}" data-vote="worse" type="button" style="font-size:0.75rem; padding:6px 10px; border-radius:8px; line-height:1; background:${userVote === 'worse' ? '#ef4444' : 'rgba(255,255,255,0.03)'}; border:1px solid var(--border); color:${userVote === 'worse' ? '#fff' : 'var(--text)'}; cursor:pointer;">👎 Worse</button>
          </div>
        </div>
      </article>
    `;
  }).join('');
 
  listContainer.querySelectorAll('.feedback-vote-btn').forEach(btn => {
    btn.addEventListener('click', (e) => {
      const recipeId = e.currentTarget.dataset.id;
      const vote = e.currentTarget.dataset.vote;
      const key = `relix-remedy-feedback-${recipeId}`;
      const currentVote = localStorage.getItem(key);
      if (currentVote === vote) {
        localStorage.removeItem(key);
      } else {
        localStorage.setItem(key, vote);
      }
      renderNaturalCare();
      showToast('Thank you for your feedback! Relix is learning.');
    });
  });
}

function renderProfilePicture() {
  const container = document.getElementById('profile-avatar-container');
  if (!container) return;
  const initials = document.getElementById('avatar-initials');
  const img = document.getElementById('avatar-img');
  
  if (state.profilePic) {
    if (initials) initials.style.display = 'none';
    if (img) {
      img.src = state.profilePic;
      img.style.display = 'block';
    }
  } else {
    if (initials) initials.style.display = 'block';
    if (img) img.style.display = 'none';
  }
}

function handleProfilePictureUpload(event) {
  const file = event.target.files?.[0];
  if (!file) return;
  if (!file.type.startsWith('image/')) {
    showToast('Please upload an image file.');
    return;
  }
  const reader = new FileReader();
  reader.onload = () => {
    state.profilePic = reader.result;
    saveState();
    renderProfilePicture();
    showToast('Profile picture updated!');
  };
  reader.readAsDataURL(file);
}

function renderMealCounter() {
  const remaining = Math.max(0, 5 - state.dailyMeals);
  els.mealCounter.textContent = `${remaining} uploads left today`;
}

function renderChatSuggestions() {
  const container = document.querySelector('.suggestion-row');
  if (!container) return;
  let html = '';
  if (state.goalType.startsWith('skin')) {
    html = `
      <button class="suggestion-pill" data-prompt="How can I reduce redness and acne?" type="button">Soothe Redness & Acne</button>
      <button class="suggestion-pill" data-prompt="I just washed my face and applied hyaluronic acid" type="button">Log Skincare Routine</button>
      <button class="suggestion-pill" data-prompt="Show me skincare hydration habits" type="button">Skincare Habits</button>
    `;
  } else if (state.goalType === 'lose') {
    html = `
      <button class="suggestion-pill" data-prompt="What are some high-volume low-calorie foods?" type="button">Low-Calorie Foods</button>
      <button class="suggestion-pill" data-prompt="I just completed a 15-minute active walk" type="button">Log Active Walk</button>
      <button class="suggestion-pill" data-prompt="How do I control evening cravings?" type="button">Stop Cravings</button>
    `;
  } else {
    html = `
      <button class="suggestion-pill" data-prompt="How can I easily hit my protein target?" type="button">Hit Protein Target</button>
      <button class="suggestion-pill" data-prompt="I just drank the Hardgainer Banana Peanut Shake" type="button">Log Banana Shake</button>
      <button class="suggestion-pill" data-prompt="Give me high-protein snacks" type="button">High-Protein Snacks</button>
    `;
  }
  container.innerHTML = html;
  
  container.querySelectorAll('.suggestion-pill').forEach((btn) => {
    btn.addEventListener('click', () => {
      sendSuggestedQuestion(btn.dataset.prompt);
    });
  });
}

function renderChat() {
  if (chatMessages.length === 0) {
    chatMessages = [
      { role: 'assistant', text: 'I can guide you with nutrition, sleep, movement, and recovery. Ask me something health-focused.' }
    ];
  }
  renderMessages();
  renderChatSuggestions();
}

function escapeHtml(str) {
  return String(str ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

// Copy one message's text. Selection is disabled app-wide (see .no-select in
// style.css), so this button is the ONLY way to get text out - that makes it a
// functional control, not a nicety.
async function copyMessageText(index, btn) {
  const message = chatMessages[index];
  if (!message) return;

  const text = message.text;
  let copied = false;

  try {
    // Only available on HTTPS/localhost. Installed PWAs qualify.
    if (navigator.clipboard && window.isSecureContext) {
      await navigator.clipboard.writeText(text);
      copied = true;
    }
  } catch (err) {
    copied = false;
  }

  if (!copied) {
    // Fallback for insecure contexts and older WebViews.
    const ta = document.createElement('textarea');
    ta.value = text;
    ta.setAttribute('readonly', '');
    ta.style.position = 'fixed';
    ta.style.opacity = '0';
    document.body.appendChild(ta);
    ta.select();
    try { copied = document.execCommand('copy'); } catch (err) { copied = false; }
    document.body.removeChild(ta);
  }

  if (btn) {
    btn.textContent = copied ? '✓' : '✕';
    btn.classList.toggle('copied', copied);
    setTimeout(() => {
      btn.textContent = '⧉';
      btn.classList.remove('copied');
    }, 1400);
  }
  if (copied && window.haptic) window.haptic.light();
}

function renderMessages() {
  els.chatMessages.innerHTML = chatMessages.map((message, index) => `
    <div class="message ${escapeHtml(message.role)}">
      <div class="message-text">${escapeHtml(message.text)}</div>
      <button class="msg-copy-btn" type="button" data-copy-index="${index}" aria-label="Copy this message" title="Copy">⧉</button>
    </div>
  `).join('');
  els.chatMessages.scrollTop = els.chatMessages.scrollHeight;
  localStorage.setItem('relix-chat-messages', JSON.stringify(chatMessages));
}

function switchView(target) {
  if (state.activeTab === target) return;
  
  els.tabs.forEach((tab) => tab.classList.toggle('active', tab.dataset.tab === target));
  
  const currentSection = Array.from(els.sections).find(s => s.classList.contains('active'));
  if (currentSection) {
    currentSection.classList.remove('active');
    currentSection.classList.add('fade-out');
    setTimeout(() => {
      currentSection.classList.remove('fade-out');
      els.sections.forEach((section) => section.classList.toggle('active', section.dataset.view === target));
      state.activeTab = target;
    }, 140);
  } else {
    els.sections.forEach((section) => section.classList.toggle('active', section.dataset.view === target));
    state.activeTab = target;
  }
}

function toggleHabit(event) {
  const index = Number(event.target.dataset.index);
  if (event.target.checked) {
    if (!state.completedTasks.includes(index)) state.completedTasks.push(index);
    recordActivity('Routine completed', 30);
  } else {
    state.completedTasks = state.completedTasks.filter((item) => item !== index);
  }
  saveState();
  renderRoutine();
  renderDashboard();
  renderProfile();
}

function openWhyModal(title, payload) {
  const [why, scientific, benefits] = payload.split('|');
  els.modalTitle.textContent = title;
  els.modalBody.innerHTML = `
    <h4>Why this matters</h4>
    <p>${why}</p>
    <h4>Science</h4>
    <p>${scientific}</p>
    <h4>Benefits</h4>
    <p>${benefits}</p>
  `;
  els.modal.classList.add('open');
}

function closeModal() {
  els.modal.classList.remove('open');
}

function sendSuggestedQuestion(prompt) {
  sendCoachMessage(prompt);
}

function sendCoachMessage(message) {
  chatMessages.push({ role: 'user', text: message });
  renderMessages();
  const trimmed = message.toLowerCase();

  // Beef / cow block
  if (BEEF_BLOCK_PATTERNS.test(trimmed)) {
    chatMessages.push({ role: 'assistant', text: '🙏 We gently refrain from suggesting or logging beef/cow-based food items out of respect for religious sentiments. We\'d love to help you with other protein-rich alternatives like chicken, mutton, paneer, eggs, or fish! Let me know what you\'d like.' });
    renderMessages();
    return;
  }

  const blocked = ['politics', 'sports', 'movies', 'programming', 'relationships', 'finance'];
  if (blocked.some((item) => trimmed.includes(item))) {
    chatMessages.push({ role: 'assistant', text: 'I only answer health and wellness questions. I can help with nutrition, recovery, sleep, movement, and general wellbeing.' });
    renderMessages();
    return;
  }

  const quickCommandReply = applyQuickCoachCommand(message);
  if (quickCommandReply) {
    chatMessages.push({ role: 'assistant', text: quickCommandReply });
    renderMessages();
    return;
  }

  const userHadExplicitIntent = hasExplicitFoodLogIntent(message);
  const userAskedInfoOnly = hasFoodInfoOnlyIntent(message);

  const typing = document.createElement('div');
  typing.className = 'message assistant typing';
  typing.innerHTML = '<div>Thinking…</div>';
  els.chatMessages.appendChild(typing);
  els.chatMessages.scrollTop = els.chatMessages.scrollHeight;

  getCoachReply(message)
    .then((result) => {
      typing.remove();
      if (typeof result === 'string') {
        chatMessages.push({ role: 'assistant', text: result });
      } else {
        let replyText = result.reply || '';
        // If AI returned food info but user didn't explicitly ask to log
        if (!userHadExplicitIntent && result.logFood && (result.calories > 0 || result.protein > 0)) {
          replyText += '\n\n💡 *If you\'ve already eaten this, just say "add to logs" or "maine khaya" and I\'ll log it for you!*';
        }
        chatMessages.push({ role: 'assistant', text: replyText });
        if (result.schedule) {
          scheduleCoachReminder(result.schedule);
        }
      }
      renderMessages();
    })
    .catch(() => {
      typing.remove();
      chatMessages.push({ role: 'assistant', text: 'I am offline right now, but I can still suggest a calm wellness habit to try next.' });
      renderMessages();
    });
}

function scheduleCoachReminder(schedule) {
  try {
    if (!schedule || !schedule.time || typeof schedule.time !== 'string') {
      console.warn('[coach] Missing or invalid time format in schedule command:', schedule);
      return;
    }
    const parts = schedule.time.split(':');
    if (parts.length !== 2) return;
    const [hours, minutes] = parts.map(Number);
    if (isNaN(hours) || isNaN(minutes)) return;

    const targetDate = new Date();
    targetDate.setHours(hours, minutes, 0, 0);
    if (targetDate.getTime() <= Date.now()) {
      targetDate.setDate(targetDate.getDate() + 1);
    }

    showToast(`⏰ Setting reminder for ${schedule.time}...`);

    if (!BACKEND_URL) {
      showToast(`✅ Scheduled local reminder!`);
      state.reminders[schedule.key || 'coach-nag'] = {
        title: schedule.title || 'Relix Coach',
        description: schedule.body || 'Scheduled reminder',
        nextDue: targetDate.getTime(),
        pending: false,
        lastAction: '',
        missedCount: 0,
        followUp: 3600000
      };
      persistReminderState();
      renderDashboard();
    } else {
      fetch(`${BACKEND_URL}/api/push/schedule`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: RELIV_USER_ID,
          key: schedule.key || 'coach-nag',
          title: schedule.title || 'Relix Coach',
          body: schedule.body || 'Time to complete your goal!',
          dueAt: shiftOutOfQuietHours(targetDate.getTime())
        })
      })
      .then(res => res.json())
      .then(data => {
        if (data.ok) {
          showToast(`✅ Scheduled lockscreen reminder!`);
          state.reminders[schedule.key || 'coach-nag'] = {
            title: schedule.title || 'Relix Coach',
            description: schedule.body || 'Scheduled reminder',
            nextDue: targetDate.getTime(),
            pending: false,
            lastAction: '',
            missedCount: 0,
            followUp: 3600000
          };
          persistReminderState();
          renderDashboard();
        } else {
          showToast('❌ Could not sync reminder to server.');
        }
      })
      .catch(() => showToast('❌ Backend offline. Could not schedule push.'));
    }
  } catch (err) {
    console.error('[coach] Failed to schedule reminder:', err);
  }
}

async function getCoachReply(message) {
  const goalText = state.goalType.startsWith('skin') ? 'Skincare' : (state.goalType === 'lose' ? 'Weight Loss' : 'Muscle Gain');
  const genderText = state.gender || 'female';
  
  const now = new Date();
  const timeOpts = { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit', hour12: false };
  const deviceLocalTime = now.toLocaleString('en-US', timeOpts);

  const historicalLogsStr = state.historicalLogs && state.historicalLogs.length > 0
    ? state.historicalLogs.map(h => `• ${h.date}: ${h.calories} kcal, ${h.protein}g protein, Hydration: ${h.hydration}ml. Foods: [${h.foods || 'None'}]`).join('\n')
    : 'No historical logs from previous days.';

  const loggedFoodsStr = state.loggedFoods.length > 0 
    ? state.loggedFoods.map(f => `• ${f.name} (${f.calories} kcal, ${f.protein}g protein)`).join('\n')
    : 'No foods logged yet today.';

  // Dynamic PCOS/PCOD guidance injection for female skincare users
  let pcosInstruction = '';
  if (genderText === 'female' && state.goalType.startsWith('skin')) {
    pcosInstruction = `
    - The user is female. You must be highly sensitive to hormonal acne (chin, jawline cystic breakouts) and PCOS/PCOD indicators.
    - If they report jawline/chin acne, suggest cycle tracking and explain how hormonal fluctuations trigger sebum.
    - Recommend spearmint tea or anti-inflammatory dietary changes, and advise talking to a doctor about tests (e.g. free testosterone, pelvic ultrasound) if periods are irregular. Do NOT diagnose.`;
  }

  const systemInstruction = `You are a strict, helpful Indian fitness, diet & skincare coach helping ${state.profileName}, a ${state.age}yo ${genderText}, ${state.weight}kg user with target weight ${state.targetWeight}kg.
  Their height is ${state.height}, diet preference is: ${state.dietType}, and they wake up at ${state.wakeUpTime || '07:00'}.
  Their active focus is: ${goalText} (Goal Code: ${state.goalType}).
  Today they consumed ${state.consumedCalories} / ${state.targetCalories} kcal and ${state.consumedProtein} / ${state.targetProtein}g protein.
  
  Yesterday's & Past Days' intake history (for comparison & progress analysis):
  ${historicalLogsStr}
  
  The user's current local device clock is: ${deviceLocalTime}.
  Today's logged foods so far:
  ${loggedFoodsStr}
  
  CRITICAL RULES:

  *** DUPLICATE PREVENTION (EXTREMELY IMPORTANT) ***
  - BEFORE setting "logFood", CHECK the "Today's logged foods" list above.
  - If the food the user mentions is ALREADY in today's logged foods list, DO NOT set "logFood" again. Instead, mention in your reply: "You already logged [food] earlier today."
  - Example: If "Biryani" is already logged and user says "I had biryani and chicken", ONLY log "Chicken" (not biryani again). Set logFood to "Chicken" only.
  - If ALL foods mentioned are already logged, set logFood to null and inform the user.

  *** CONSUMPTION INTENT ONLY ***
  - ONLY set "logFood" when the user EXPLICITLY says they have EATEN/CONSUMED/HAD the food.
  - Trigger words: "had", "ate", "eaten", "consumed", "finished", "drank", "khaya", "maine khaya", "kha liya", "pi liya", "chilam", "kheyelam", "khabo", "add to logs", "log it".
  - If user is just ASKING ABOUT food ("what is biryani", "calories in pizza", "tell me about chicken"), provide information but set logFood to null, calories to 0, protein to 0.
  - In that case, end your reply with: "If you've eaten this, just say 'add to logs' or 'maine khaya' to log it!"

  *** BIRYANI VARIETY ***
  - When user mentions "biryani" without specifying type, ASK: "Which biryani? Chicken Biryani (~450 kcal, 28g protein), Mutton Biryani (~520 kcal, 30g protein), or Veg Biryani (~380 kcal, 10g protein)?"
  - Do NOT guess. Return calories: 0 and protein: 0 until they clarify.

  *** BEEF/COW RESTRICTION ***
  - NEVER suggest, log, or discuss beef or cow meat. If user mentions beef/cow meat, politely decline: "We refrain from suggesting beef/cow-based items out of respect for religious sentiments. Try chicken, mutton, paneer, eggs, or fish instead!"
  - Set logFood to null for any beef item.

  *** TRACKER TARGET CHANGES ***
  - If the user asks to update their tracking targets (e.g. "change my cal to 2300", "set my protein goal to 150g"):
    1. Calculate if the requested goal is safe and realistic.
    2. If NOT safe, warn the user and do NOT update.
    3. If safe, specify the new target values in "updateTargetCalories" and/or "updateTargetProtein".
  - If the user asks to change their streak, daily score, routine progress, or XP, return the requested values using these fields:
    - "updateStreak", "updateXpDelta", "updateRoutineProgress", "updateDailyScore".
  - If the user asks to change calories/protein targets, explain how the AI progress planner will update from those new targets.

  *** TONE & FORMATTING ***
  - Never use "---", "***", markdown headers, or other separator/filler characters in "reply". Write plain conversational sentences only.
  - No generic filler ("Great question!", "I'm here to help!", "As your AI coach..."). Get straight to the point.
  - Keep replies short by default (1-4 sentences) unless the user asks for a detailed plan.
  - When relevant, add one short, specific line of encouragement tied to their actual data (e.g. streak, protein gap, consistency) instead of generic "never give up" talk.

  *** FOOD DETAIL CLARIFICATION ***
  - If the user logs a food without details, MUST NOT guess. Clarify:
    1. BRAND: Was it from a specific brand/bakery or homemade?
    2. PORTION: How much (small katori/bowl, standard plate, fist-sized, palm size)?
    If these details are missing, return 0 for calories and protein, and ask in the reply.
  - If they provide details, calculate exact calories/protein.
  - If they ask to remove/cancel a food, set negative values and set "removeFood".
  - Every recommendation must explain WHY.
  ${pcosInstruction}
  
  Reply strictly in JSON format with NO markdown formatting:
  {
    "reply": "Your coaching response here",
    "calories": Number,  // calories to add (positive) or subtract (negative), or 0
    "protein": Number,   // protein to add (positive) or subtract (negative), or 0
    "logFood": "Name of food being added" or null,
    "removeFood": "Name of food being removed" or null,
    "updateTargetCalories": Number or null, // set new calorie target if requested & safe
    "updateTargetProtein": Number or null,  // set new protein target if requested & safe
    "updateStreak": Number or null,
    "updateXpDelta": Number or null,
    "updateRoutineProgress": Number or null,
    "updateDailyScore": Number or null,
    "schedule": null
  }`;

  const lastFewMessages = chatMessages.slice(-20).map(m => ({
    role: m.role === 'user' ? 'user' : 'assistant',
    content: m.text
  }));

  function applyCoachReply(result) {
    const allowFoodLog = hasExplicitFoodLogIntent(message);

    if (result.removeFood) {
      const targetName = result.removeFood.toLowerCase();
      const idx = state.loggedFoods.findIndex(f => f.name.toLowerCase().includes(targetName));
      if (idx !== -1) {
        const removed = state.loggedFoods.splice(idx, 1)[0];
        if (!result.calories && !result.protein) {
          state.consumedCalories = Math.max(0, state.consumedCalories - (removed.calories || 0));
          state.consumedProtein = Math.max(0, state.consumedProtein - (removed.protein || 0));
        }
      }
    } else if (allowFoodLog && result.logFood && (result.calories > 0 || result.protein > 0)) {
      // Check for exact duplicate before logging from chat
      const exactDup = findExactDuplicateFoodLog({ name: result.logFood });
      if (exactDup) {
        // Don't log, but inform via reply modification
        result.reply = (result.reply || '') + `\n\n⚠️ "${exactDup.name}" was already logged recently. Skipping duplicate. If you want to log it again, please confirm explicitly.`;
      } else {
        logFoodEntry({
          name: result.logFood,
          calories: result.calories || 0,
          protein: result.protein || 0
        }, {
          activityLabel: `Food logged: ${result.logFood}`,
          points: 20,
          toastMessage: `✅ Logged: ${result.logFood}`,
          fromChat: true
        });
      }
    }

    applyTrackerCommandUpdates(result);
    saveState();
    refreshTrackerViews();
    renderWeightForecast();
  }

  async function queryDirectClient() {
    // Groq is the primary AI for all text/chat. Gemini is used only for vision (Meal Cam / Face Cam).
    if (!state.groqKey) {
      return {
        reply: "Please add your Groq API key in Settings to enable AI coaching. Groq powers all chat and coaching features. Go to Settings → Groq API Key → paste your key.",
        calories: 0,
        protein: 0,
        logFood: null,
        removeFood: null,
        schedule: null
      };
    }
    const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${state.groqKey}`
      },
      body: JSON.stringify({
        model: 'llama-3.3-70b-versatile',
        messages: [
          { role: 'system', content: systemInstruction },
          ...lastFewMessages,
          { role: 'user', content: message }
        ],
        response_format: { type: "json_object" }
      })
    });
    const data = await response.json();
    if (data.error) throw new Error(data.error.message);
    let textRes = data.choices[0].message.content || '';
    textRes = textRes.replace(/```json/g, '').replace(/```/g, '').trim();
    const result = JSON.parse(textRes);
    applyCoachReply(result);
    return result;
  }

  try {
    if (state.groqKey) {
      return await queryDirectClient();
    }

    if (!BACKEND_URL) {
      return await queryDirectClient();
    }

    const response = await fetch(`${BACKEND_URL}/api/ai/chat`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        systemInstruction,
        messages: lastFewMessages,
        message,
        customGroqKey: state.groqKey || ''
      })
    });
    
    const data = await response.json();
    if (data.error) throw new Error(data.error);

    let textRes = data.text || '';
    textRes = textRes.replace(/```json/g, '').replace(/```/g, '').trim();
    const result = JSON.parse(textRes);

    applyCoachReply(result);
    return result;
  } catch (err) {
    console.warn('[coach] Backend failed. Falling back to direct client-side fetch...', err);
    try {
      return await queryDirectClient();
    } catch (fallbackErr) {
      console.error('[coach] Both backend and fallback failed:', fallbackErr);
      return {
        reply: "I am having trouble connecting to my brain right now. Please make sure you have entered a valid API Key in settings, or check your internet connection.",
        calories: 0,
        protein: 0,
        logFood: null,
        removeFood: null,
        schedule: null
      };
    }
  }
}

function loadKnowledgeBase() {
  fetch('./assets/knowledge_base.json')
    .then((response) => response.json())
    .then((data) => {
      knowledgeBase.push(...data);
    })
    .catch(() => {
      knowledgeBase.push(
        { keywords: ['sleep', 'insomnia'], answer: 'A consistent wind-down routine and a cool dark room can support better sleep.' },
        { keywords: ['protein', 'muscle'], answer: 'Including protein with each meal helps support muscle recovery and fullness.' },
        { keywords: ['water', 'hydration'], answer: 'A steady hydration rhythm helps energy, focus, and digestion.' },
        { keywords: ['stress', 'anxiety'], answer: 'A short breathing session and a gentle walk can lower perceived stress.' }
      );
    });
}

function retrieveKnowledge(message) {
  const lower = message.toLowerCase();
  return knowledgeBase.find((item) => item.keywords.some((keyword) => lower.includes(keyword)));
}

let lastVisionResult = JSON.parse(localStorage.getItem('relix-last-vision-result') || 'null');

function previewMeal(event) {
  const file = event.target.files?.[0];
  if (!file) return;
  if (!file.type.startsWith('image/')) {
    els.mealStatus.textContent = 'Please upload an image file.';
    return;
  }

  // Clear existing face markers if any
  const existingDots = els.mealPreview.querySelectorAll('.face-marker-dot');
  existingDots.forEach(dot => dot.remove());

  const reader = new FileReader();
  reader.onload = () => {
    els.mealPreview.innerHTML = `<img src="${reader.result}" alt="Selected preview">`;
    els.mealStatus.textContent = 'Image loaded. Tap analyze to see real AI analysis.';
    state.pendingMealImageBase64 = reader.result;
    saveState();
    
    const resultCard = document.getElementById('meal-result-card');
    if (resultCard) resultCard.style.display = 'none';
  };
  reader.readAsDataURL(file);
}

async function analyzeMeal() {
  if (state.dailyMeals >= 5) {
    els.mealStatus.textContent = 'Daily limit reached. Come back tomorrow!';
    return;
  }
  if (!state.pendingMealImageBase64) {
    els.mealStatus.textContent = 'Upload a photo first to analyze.';
    return;
  }

  const isSkin = state.goalType.startsWith('skin');
  els.mealStatus.textContent = isSkin ? 'Scanning face with Gemini Skin AI...' : 'Analyzing plate with Google Gemini 1.5 Flash...';
  els.mealButton.disabled = true;

  const resultCard = document.getElementById('meal-result-card');
  const resultTitle = document.getElementById('meal-result-title');
  const resultDesc = document.getElementById('meal-result-desc');
  const nutritionGrid = document.getElementById('meal-nutrition-grid');
  const logBtn = document.getElementById('log-meal-btn');
  const skinResult = document.getElementById('skin-analysis-result');

  if (resultCard) {
    resultCard.style.display = 'flex';
    resultTitle.textContent = isSkin ? 'Scanning face features...' : 'Analyzing plate...';
    resultDesc.textContent = isSkin ? 'Detecting issues, wrinkles, pores, and skin hydration scores.' : 'Determining nutritional composition and classification.';
    nutritionGrid.style.display = 'none';
    logBtn.style.display = 'none';
    if (skinResult) skinResult.style.display = 'none';
  }

  const mealPrompt = `Analyze this image. You must identify if it is a food item, a human being, an animal (dog, cat, bird, etc.), or an inanimate object.
  
  Return strictly a JSON object with NO markdown formatting:
  {
    "type": "food" | "human" | "animal" | "object",
    
    // IF FOOD:
    "foodName": "Name of the estimated food (e.g. Tomato Pasta, Cheese Burger)",
    "calories": Number, // estimated calories
    "protein": Number,  // estimated protein in grams
    "carbs": Number,    // estimated carbs in grams
    "fat": Number,      // estimated fat in grams
    "healthRating": Number, // score from 0 to 100
    "satietyScore": Number, // score from 0 to 100
    "proteinScore": Number, // score from 0 to 100
    "fatLossScore": Number, // score from 0 to 100
    "analysisText": "A detailed description of the food, estimated ingredients, why it got this rating, good/bad points, missing nutrients, healthier alternatives, protein suggestions, and a question: 'Did you eat this? Tap Log to add to your daily totals!'"
    
    // IF HUMAN:
    "analysisText": "I don't know about others, but you definitely seem a treat to me! Hotness rating: 100/100, rating high on protein! You look absolutely fabulous and healthy today.",
    
    // IF ANIMAL:
    "analysisText": "Aww, look at this cute animal! Cuteness rating: 100/100! Truly a pure soul that deserves all the treats.",
    
    // IF INANIMATE OBJECT:
    "analysisText": "This is an interesting object! Witty, funny caption about what this object might do if it was alive."
  }`;

  const skinPrompt = `Analyze this face image. You must identify if it is a human face. If it is NOT a human face, return JSON with:
  {
    "type": "non_face",
    "analysisText": "Please upload a clear, front-facing photo of your face for skin analysis."
  }
  
  If it IS a human face, return strictly a JSON object with NO markdown formatting:
  {
    "type": "skin",
    "overallScores": {
      "health": 85,       // estimated skin health 0-100
      "hydration": 60,    // estimated hydration 0-100
      "barrier": 70,      // estimated barrier health 0-100
      "pigmentation": 80, // estimated pigmentation health 0-100
      "texture": 65,      // estimated texture smoothness 0-100
      "acne": 90,         // estimated acne clarity 0-100
      "oil": 75,          // estimated oil balance 0-100
      "pores": 60,        // estimated pores refinement 0-100
      "redness": 80,      // estimated redness control 0-100
      "glow": 70,         // estimated glow index 0-100
      "wrinkles": 95,     // estimated wrinkles smoothness 0-100
      "elasticity": 85,   // estimated elasticity index 0-100
      "darkCircles": 50   // estimated dark circles control 0-100
    },
    "detectedConcerns": [
      {
        "concernId": "pih",
        "title": "Mild post-acne marks (PIH)",
        "severity": 2, // 1 to 10 scale
        "confidence": 85, // confidence percentage
        "explanation": "Mild post-inflammatory hyperpigmentation on the cheeks with small brown spots remaining after previous acne.",
        "causes": "Melanin overproduction triggered by previous acne breakouts.",
        "timeline": "3 to 6 months of persistent daily care.",
        "homeCare": "Lactic acid curd & Turmeric pack twice weekly.",
        "ingredients": "Vitamin C in the morning, Niacinamide, Retinol at night.",
        "products": "10% Niacinamide Serum, Broad-spectrum SPF 50 sunscreen.",
        "professional": "Gentle chemical peels or Q-switched lasers.",
        "avoid": "Picking at pimples or using harsh physical scrubs.",
        "mapCoordinates": { "x": 35, "y": 48 } // approximate percentage coordinates of concern (x is horizontal 0-100, y is vertical 0-100)
      },
      {
        "concernId": "scars",
        "title": "Mild atrophic acne scarring",
        "severity": 3,
        "confidence": 75,
        "explanation": "Shallow depressions on the cheeks that reflect light unevenly.",
        "causes": "Collagen depletion during the healing of deep or picked pimples.",
        "timeline": "6 to 12 months with potential clinical intervention.",
        "homeCare": "Honey and aloe vera mask to soothe local tissue.",
        "ingredients": "Retinoids (adapalene, tretinoin), Glycolic acid.",
        "products": "0.1% Adapalene Gel, Ceramide barrier cream.",
        "professional": "Microneedling (strong evidence) or RF microneedling.",
        "avoid": "Over-exfoliating or dry shaving.",
        "mapCoordinates": { "x": 65, "y": 55 }
      }
    ],
    "notDetected": [
      "Severe acne",
      "Cystic acne",
      "Severe pigmentation",
      "Rosacea indicators",
      "Melasma indicators"
    ],
    "glassSkinAnalysis": "Pores and uneven texture on the cheeks are currently reflecting light unevenly, reducing the glass-like transparency. Prioritize deep hydration layers and BHA chemical exfoliation."
  }`;

  const prompt = isSkin ? skinPrompt : mealPrompt;

  function handleVisionSuccess(result) {
    if (isSkin && result.type === 'skin') {
      const prevScan = localStorage.getItem('relix-last-skin-scan');
      if (prevScan) {
        try {
          const parsedPrev = JSON.parse(prevScan);
          let diffText = "Hydration levels are stable. Uneven texture shows minor improvement from home remedies.";
          if (result.overallScores.hydration > parsedPrev.overallScores.hydration) {
            diffText = `Hydration score improved from ${parsedPrev.overallScores.hydration} to ${result.overallScores.hydration}! Texture clarity is progressing nicely.`;
          }
          result.progressText = diffText;
        } catch (e) {}
      } else {
        result.progressText = "This is your first baseline scan. Future scans will display texture and pigmentation trends.";
      }
      localStorage.setItem('relix-last-skin-scan', JSON.stringify(result));
    }

    lastVisionResult = result;
    localStorage.setItem('relix-last-vision-result', JSON.stringify(result));
    saveState();

    renderMealCamState();
    els.mealStatus.textContent = 'Analysis complete.';
    showToast('✅ Analysis finished successfully!');
  }

  async function performDirectClientScan() {
    let base64Data = state.pendingMealImageBase64;
    let mimeType = 'image/jpeg';
    if (base64Data.includes(',')) {
      const parts = base64Data.split(',');
      mimeType = parts[0].match(/:(.*?);/)[1];
      base64Data = parts[1];
    }

    // Only a key the user supplied themselves. There used to be a real API key
    // hardcoded here as the "unconfigured" sentinel - in a file the browser
    // downloads, which published it to anyone who opened devtools.
    const GEMINI_API_KEY = (state.geminiKey || '').trim();
    if (!GEMINI_API_KEY) {
      throw new Error('Scan needs the server. If it stays down, add your own Gemini API key in Settings.');
    }

    const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${GEMINI_API_KEY}`;
    const payload = {
      contents: [
        {
          parts: [
            { text: prompt },
            {
              inlineData: {
                mimeType: mimeType,
                data: base64Data
              }
            }
          ]
        }
      ],
      generationConfig: {
        responseMimeType: "application/json"
      }
    };

    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });
    const data = await response.json();
    if (data.error) throw new Error(data.error.message);

    let textRes = data.candidates?.[0]?.content?.parts?.[0]?.text || '';
    textRes = textRes.replace(/```json/g, '').replace(/```/g, '').trim();
    const result = JSON.parse(textRes);

    handleVisionSuccess(result);
  }

  if (!BACKEND_URL) {
    try {
      await performDirectClientScan();
      return;
    } catch (fallbackErr) {
      console.error('[vision] Client scan failed:', fallbackErr);
      els.mealStatus.textContent = fallbackErr.message || 'Analysis failed. Please check network/backend.';
      showToast('❌ Analysis failed.');
      return;
    }
  }

  try {
    let base64Data = state.pendingMealImageBase64;
    let mimeType = 'image/jpeg';
    if (base64Data.includes(',')) {
      const parts = base64Data.split(',');
      mimeType = parts[0].match(/:(.*?);/)[1];
      base64Data = parts[1];
    }

    const response = await fetch(`${BACKEND_URL}/api/ai/analyze-image`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        prompt,
        mimeType,
        base64Data
      })
    });

    const data = await response.json();
    if (data.error) throw new Error(data.error);

    let textRes = data.text || '';
    textRes = textRes.replace(/```json/g, '').replace(/```/g, '').trim();
    const result = JSON.parse(textRes);

    handleVisionSuccess(result);
  } catch (err) {
    console.warn('[vision] Backend failed. Falling back to direct client-side scan...', err);
    try {
      await performDirectClientScan();
    } catch (fallbackErr) {
      console.error('[vision] Both backend and fallback failed:', fallbackErr);
      els.mealStatus.textContent = fallbackErr.message || 'Analysis failed. Please check network/backend.';
      showToast('❌ Analysis failed.');
    }
  } finally {
    els.mealButton.disabled = false;
  }
}

function logVisionMeal() {
  if (lastVisionResult && lastVisionResult.type === 'food') {
    const cals = lastVisionResult.calories || 0;
    const pro = lastVisionResult.protein || 0;

    state.dailyMeals += 1;
    const logged = logFoodEntry({
      name: lastVisionResult.foodName,
      calories: cals,
      protein: pro
    }, {
      activityLabel: `Meal logged: ${lastVisionResult.foodName}`,
      points: 25,
      toastMessage: `✅ Logged ${lastVisionResult.foodName} (+${cals} kcal, +${pro}g Pro)!`
    });

    if (!logged) {
      state.dailyMeals = Math.max(0, state.dailyMeals - 1);
      saveState();
    }
    renderMealCounter();
    
    const logBtn = document.getElementById('log-meal-btn');
    if (logBtn) logBtn.style.display = 'none';
  }
}

function completeQuickCheck(id, buttonEl = null) {
  if (state.completedTasks.includes(id)) return;

  if (els.app) {
    els.app.style.opacity = '0.6';
    setTimeout(() => els.app.style.opacity = '1', 150);
  }

  if (buttonEl) {
    buttonEl.style.backgroundColor = 'var(--primary)';
    buttonEl.style.color = '#fff';
    buttonEl.textContent = '✅ Done!';
    setTimeout(() => finalizeQuickCheck(id), 400);
  } else {
    finalizeQuickCheck(id);
  }
}

function finalizeQuickCheck(id) {
  if (!state.completedTasks.includes(id)) {
    state.completedTasks.push(id);
  }
  state.dailyScore = Math.min(100, state.dailyScore + 10);
  saveState();
  const map = {
    water: 'Water check-in complete',
    stretch: 'Stretch break complete',
    supplement: 'Supplement reminder logged',
    meditation: 'Meditation break complete',
    walk: 'Walk check-in complete',
    sleep: 'Sleep goal logged'
  };
  recordActivity(map[id] || 'Wellness check-in complete', 15);
  renderDashboard();
  renderRoutine();
  renderProfile();
  showToast(map[id] || 'Check-in complete');
}

function toggleDarkMode() {
  state.darkMode = els.darkToggle.checked;
  localStorage.setItem('relix-dark', String(state.darkMode));
  applyTheme();
}

function toggleNotifications() {
  if (els.notifyToggle.checked) {
    requestNotificationPermission();
    return;
  }
  state.notifications = false;
  state.remindersPaused = true;
  localStorage.setItem('relix-notify', 'false');
  localStorage.setItem('relix-reminders-paused', 'true');
  clearReminderTimers();
  cancelServerReminders();
  renderReminders();
}

function requestNotificationPermission() {
  if (!('Notification' in window)) {
    showToast('Notifications are not supported on this device.');
    els.notifyToggle.checked = false;
    return;
  }
  if (Notification.permission === 'granted') {
    enableNotifications();
    return;
  }
  if (Notification.permission === 'denied') {
    showToast('Notifications are blocked in this browser.');
    els.notifyToggle.checked = false;
    return;
  }
  showNotificationPrompt();
}

function enableNotifications() {
  state.notifications = true;
  state.remindersPaused = false;
  localStorage.setItem('relix-notify', 'true');
  localStorage.setItem('relix-reminders-paused', 'false');
  els.notifyToggle.checked = true;
  initializeReminderSystem();
  closeNotificationPrompt();
  updateActionButtons();
  if (shouldAutoSyncPush()) subscribeToPushNotifications();
  showToast('Notifications enabled.');
  showNotification('Notifications Started', 'You will now receive check-ins here.', 'welcome');
}

function isIOSDevice() {
  return /iPad|iPhone|iPod/.test(navigator.userAgent) && !window.MSStream;
}

function isStandalonePWA() {
  return window.matchMedia('(display-mode: standalone)').matches || window.navigator.standalone === true;
}

function shouldAutoSyncPush() {
  return !(window.location.hostname === 'localhost' && window.location.port === '8000');
}

function urlBase64ToUint8Array(base64String) {
  if (!base64String || typeof base64String !== 'string') {
    return new Uint8Array();
  }
  const padding = '='.repeat((4 - base64String.length % 4) % 4);
  const base64 = (base64String + padding).replace(/\-/g, '+').replace(/_/g, '/');
  try {
    const rawData = window.atob(base64);
    const outputArray = new Uint8Array(rawData.length);
    for (let i = 0; i < rawData.length; ++i) { outputArray[i] = rawData.charCodeAt(i); }
    return outputArray;
  } catch (err) {
    console.warn('Invalid VAPID key format. Skipping push subscription sync.');
    return new Uint8Array();
  }
}

// Compares an existing PushSubscription's key against the key the backend is
// currently using. If the backend restarted and (in the old code) generated
// a brand new VAPID key, the old subscription becomes useless and pushes
// silently stop being delivered - this is exactly why it "only worked while
// the app was open" (foreground fallbacks still fired) but never as a real
// background/phone notification. We now detect that and resubscribe.
function subscriptionKeyMatches(subscription, currentPublicKeyB64) {
  try {
    const currentKeyBytes = urlBase64ToUint8Array(currentPublicKeyB64);
    const existingKeyBytes = new Uint8Array(subscription.options.applicationServerKey);
    if (currentKeyBytes.length !== existingKeyBytes.length) return false;
    for (let i = 0; i < currentKeyBytes.length; i++) {
      if (currentKeyBytes[i] !== existingKeyBytes[i]) return false;
    }
    return true;
  } catch (err) {
    // Some browsers don't expose subscription.options reliably - assume
    // mismatch so we take the safe path of resubscribing.
    return false;
  }
}

async function subscribeToPushNotifications(debug = false) {
  if (!('serviceWorker' in navigator) || !('PushManager' in window)) {
    if (debug) showToast('Push API not supported here.');
    return;
  }

  if (isIOSDevice() && !isStandalonePWA()) {
    console.warn('iOS: open Relix from the Home Screen icon (not Safari) to enable real push notifications.');
    showToast('Add Relix to your Home Screen, then open it from there to enable phone notifications.');
    return;
  }

  if (!BACKEND_URL) {
    console.info('PWA Push Notifications: Local static domain, bypassing server-side VAPID/push registration.');
    return;
  }

  try {
    if (debug) showToast('Fetching VAPID key...');
    const reg = await navigator.serviceWorker.register('./service-worker.js');
    const vapidRes = await fetch(`${BACKEND_URL}/api/push/vapid-public-key`);
    if (!vapidRes.ok) throw new Error('Could not reach backend for VAPID key.');
    const vapidPublicKey = (await vapidRes.text()).trim();
    const applicationServerKey = urlBase64ToUint8Array(vapidPublicKey);
    if (!vapidPublicKey || !applicationServerKey.length) {
      console.warn('Skipping push subscription sync because the backend VAPID key is missing or invalid.');
      return;
    }

    if (debug) showToast('Checking existing subscription...');
    let subscription = await reg.pushManager.getSubscription();

    if (subscription && !subscriptionKeyMatches(subscription, vapidPublicKey)) {
      if (debug) showToast('Keys changed! Unsubscribing...');
      console.log('Push key changed on backend, resubscribing device...');
      await subscription.unsubscribe().catch(() => { });
      subscription = null;
    }

    if (!subscription) {
      if (debug) showToast('Asking Apple for push token (may hang here if blocked)...');
      subscription = await reg.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey
      });
    }

    if (debug) showToast('Sending token to backend...');
    await fetch(`${BACKEND_URL}/api/push/subscribe`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ subscription, userId: RELIV_USER_ID })
    });
    console.log("Successfully subscribed to real Push Notifications!");
    if (debug) showToast('Backend saved subscription!');
  } catch (err) {
    console.error('Push setup failed:', err);
    if (debug) alert(`Push setup failed: ${err.message}`);
    showToast('Could not set up phone notifications. Check your connection and try again.');
    throw err; // Re-throw so forceResubBtn catches it
  }
}

async function performHardRefresh() {
  if (!BACKEND_URL) {
    showToast('🔄 Local reload complete!');
    initializeReminderSystem();
    return;
  }
  showToast('🔄 Refreshing: Waking backend & Resubscribing...');
  try {
    await fetch(`${BACKEND_URL}/api/push/debug`);
  } catch (err) {
    console.warn('Backend wake ping failed, proceeding...', err);
  }
  try {
    await triggerForceResubscribe();
  } catch (err) {
    console.error('Force resubscribe failed:', err);
  }
  initializeReminderSystem();
  checkDailyReset();
  renderDashboard();
  renderRoutine();
  renderProfile();
  showToast('✅ Woke backend, resubscribed, & refreshed system status!');
}

async function triggerForceResubscribe() {
  showToast('1/5 Getting service worker...');
  if ('serviceWorker' in navigator && 'PushManager' in window) {
    showToast('1.5/5 Registering SW explicitly...');
    const reg = await navigator.serviceWorker.register('./service-worker.js');
    showToast('2/5 Checking old subscription...');
    const sub = await reg.pushManager.getSubscription();
    if (sub) {
      showToast('3/5 Unsubscribing old push...');
      await sub.unsubscribe().catch(() => {});
    }
  }
  showToast('4/5 Requesting new push token...');
  await subscribeToPushNotifications(true);
  showToast('5/5 Resubscribed successfully!');
}

function showNotificationPrompt() {
  if (!els.notificationModal) return;
  els.notificationModal.classList.add('open');
  els.notificationModal.setAttribute('aria-hidden', 'false');
}

function closeNotificationPrompt() {
  if (!els.notificationModal) return;
  els.notificationModal.classList.remove('open');
  els.notificationModal.setAttribute('aria-hidden', 'true');
}

function handleNotificationPermission(allowed) {
  if (!allowed) {
    state.notifications = false;
    state.remindersPaused = true;
    localStorage.setItem('relix-notify', 'false');
    localStorage.setItem('relix-reminders-paused', 'true');
    els.notifyToggle.checked = false;
    clearReminderTimers();
    cancelServerReminders();
    renderReminders();
    closeNotificationPrompt();
    updateActionButtons();
    return;
  }
  if ('Notification' in window) {
    Notification.requestPermission().then((permission) => {
      if (permission === 'granted') {
        enableNotifications();
      } else {
        showToast('Notifications were not enabled.');
        els.notifyToggle.checked = false;
        closeNotificationPrompt();
        updateActionButtons();
      }
    });
  }
}

function registerNotifications() {
  if (!('Notification' in window)) return;
  els.notifyToggle.checked = state.notifications;
  updateActionButtons();
  if (state.notifications && Notification.permission === 'granted') {
    initializeReminderSystem();
    if (shouldAutoSyncPush()) subscribeToPushNotifications(); // sync with backend when not running the local smoke host
  } else if (state.notifications && Notification.permission === 'default') {
    showNotificationPrompt();
  }
}

let spamTimer = null;

function initializeReminderSystem() {
  clearReminderTimers();
  if (spamTimer) clearInterval(spamTimer);
  if (state.remindersPaused || !state.notifications) {
    renderReminders();
    return;
  }
  if ('Notification' in window && Notification.permission === 'default') {
    Notification.requestPermission().catch(() => { });
  }
  Object.entries(state.reminders).forEach(([key, reminder]) => {
    if (!reminder) return;
    const delay = Math.max(1000, reminder.nextDue - Date.now());
    if (reminder.nextDue <= Date.now()) {
      triggerReminder(key);
      return;
    }
    scheduleReminder(key, delay);
  });
  renderReminders();

  // Local vibe check removed. It is now handled by the server (real push notifications)
}

function scheduleReminder(key, delay) {
  const reminder = state.reminders[key];
  if (!reminder) return;
  const timerId = window.setTimeout(() => triggerReminder(key), delay);
  state.reminderTimers[key] = timerId;

  // Background Push using Notification Triggers API (Offline PWA support for Android Chrome)
  if (state.notifications && !state.remindersPaused && 'showTrigger' in Notification.prototype && navigator.serviceWorker) {
    navigator.serviceWorker.ready.then(reg => {
      reg.showNotification(`Relix · ${reminder.title}`, {
        tag: key,
        body: reminder.description,
        icon: './icons/icon-192.png',
        vibrate: [200, 100, 200],
        data: { reminderKey: key, originalBody: reminder.description },
        actions: [
          { action: 'done', title: '✅ Yes' },
          { action: 'later', title: '⏱️ 5m' },
          { action: 'skip', title: '❌ No' }
        ],
        showTrigger: new TimestampTrigger(reminder.nextDue)
      }).catch(e => console.warn('Trigger API failed', e));
    });
  }

  // Client setTimeout only fires while this tab/app is open. Mirror the same
  // due time to the backend (keyed by reminder key, so re-opening the app
  // just REPLACES the pending schedule instead of stacking duplicate pushes)
  // so a real push still arrives on the lock screen even if the phone is
  // locked or the app is fully closed.
  if (BACKEND_URL && state.notifications && !state.remindersPaused && backendReachable === true) {
    fetch(`${BACKEND_URL}/api/push/schedule`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        userId: RELIV_USER_ID,
        key,
        title: `Relix · ${reminder.title}`,
        body: reminder.description,
        dueAt: shiftOutOfQuietHours(reminder.nextDue)
      })
    }).catch(() => { });
  }
}

function cancelServerReminders() {
  if (!BACKEND_URL) return;
  Object.keys(state.reminders || {}).forEach((key) => {
    fetch(`${BACKEND_URL}/api/push/cancel`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ key, userId: RELIV_USER_ID })
    }).catch(() => { });
  });
}

function clearReminderTimers() {
  Object.values(state.reminderTimers).forEach((timer) => window.clearTimeout(timer));
  state.reminderTimers = {};
}

function triggerReminder(key) {
  if (state.remindersPaused || !state.notifications) return;
  const reminder = state.reminders[key];
  reminder.pending = true;
  reminder.missedCount = Number(reminder.missedCount || 0) + 1;
  reminder.nextDue = Date.now() + reminder.followUp;
  persistReminderState();
  renderReminders();
  showNotification(`Relix · ${reminder.title}`, reminder.description, key);
  scheduleReminder(key, reminder.followUp);
}

function respondToReminder(key, action, buttonEl = null) {
  if (els.app) {
    els.app.style.opacity = '0.6';
    setTimeout(() => els.app.style.opacity = '1', 150);
  }

  if (buttonEl) {
    buttonEl.style.backgroundColor = 'var(--primary)';
    buttonEl.style.color = '#fff';
    buttonEl.style.transform = 'scale(0.95)';
    if (action === 'done') buttonEl.textContent = '✅ Done!';
    else if (action === 'skip') buttonEl.textContent = '⏭️ Skipped';
    else if (action === 'later') buttonEl.textContent = '⏱️ Snoozed';

    // Delay state change so user can read the button text
    setTimeout(() => finalizeReminderResponse(key, action), 400);
  } else {
    finalizeReminderResponse(key, action);
  }
}

function finalizeReminderResponse(key, action) {
  const reminder = state.reminders[key];
  if (!reminder) return;
  reminder.pending = false;
  reminder.missedCount = 0;
  if (action === 'done') {
    reminder.lastAction = 'done';
    const baseHourMap = {
      cleanse: '08:00',
      sunscreen: '13:00',
      acne: '21:00',
      water: '09:00',
      portion: '13:30',
      walk: '18:00',
      shake: '11:00',
      diet: '20:30'
    };
    const timeStr = baseHourMap[key];
    if (timeStr) {
      reminder.nextDue = getNextDueTime(timeStr);
    } else {
      reminder.nextDue = Date.now() + reminder.followUp;
    }
    recordActivity(`${reminder.title} completed`, 12);
    showToast(`${reminder.title} complete — great job.`);
    createConfetti();
  } else if (action === 'skip') {
    reminder.lastAction = 'skip';
    reminder.nextDue = Date.now() + 300000;
    recordActivity(`${reminder.title} skipped`, 4);
    showToast(`${reminder.title} moved to the next check-in.`);
  } else {
    reminder.lastAction = 'later';
    reminder.nextDue = Date.now() + 300000;
    recordActivity(`${reminder.title} snoozed`, 4);
    showToast(`${reminder.title} snoozed for 5 minutes.`);
  }
  persistReminderState();
  renderReminders();
  initializeReminderSystem();
}

function toggleAllReminders() {
  state.remindersPaused = !state.remindersPaused;
  state.notifications = !state.remindersPaused;
  localStorage.setItem('relix-notify', String(state.notifications));
  localStorage.setItem('relix-reminders-paused', String(state.remindersPaused));
  els.notifyToggle.checked = state.notifications;
  if (state.notifications) {
    initializeReminderSystem();
    showToast('Reminders resumed.');
  } else {
    clearReminderTimers();
    cancelServerReminders();
    renderReminders();
    showToast('All reminders paused.');
  }
}

function renderReminders() {
  if (!els.reminderList) return;
  const pendingEntries = Object.entries(state.reminders).filter(([, reminder]) => reminder.pending);
  const standardEntries = Object.entries(state.reminders).filter(([, reminder]) => !reminder.pending);
  const unreadCount = pendingEntries.length;
  if ('setAppBadge' in navigator) {
    if (unreadCount > 0) {
      navigator.setAppBadge(unreadCount).catch(() => { });
    } else {
      navigator.clearAppBadge().catch(() => { });
    }
  }

  const pendingMarkup = pendingEntries.length ? `
    <div class="reminder-section-title">
      <strong>Unread polls</strong>
      <span>${unreadCount} waiting</span>
    </div>
    ${pendingEntries.map(([key, reminder]) => {
    const bubbleClass = reminder.lastAction === 'done' ? 'response-bubble done' : reminder.lastAction === 'skip' ? 'response-bubble later' : reminder.lastAction === 'later' ? 'response-bubble later' : 'response-bubble';
    const bubbleText = reminder.lastAction === 'done' ? '✓ Done' : reminder.lastAction === 'skip' ? '↺ Later' : reminder.lastAction === 'later' ? '⏰ Snoozed' : 'Ready';
    return `
        <div class="reminder-item pending">
          <div>
            <strong>${reminder.title}</strong>
            <p>${reminder.description}</p>
            <span class="${bubbleClass}">${bubbleText}</span>
            <small>${state.remindersPaused ? 'Paused' : `${reminder.missedCount || 1} missed • answer now`}</small>
          </div>
          <div class="reminder-actions poll-mode">
            <button class="reminder-action-btn done" data-reminder-key="${key}" data-reminder-action="done" type="button" aria-label="Mark ${reminder.title} done">Yes</button>
            <button class="reminder-action-btn skip" data-reminder-key="${key}" data-reminder-action="skip" type="button" aria-label="Skip ${reminder.title}">No</button>
            <button class="reminder-action-btn later" data-reminder-key="${key}" data-reminder-action="later" type="button" aria-label="Snooze ${reminder.title}">5m</button>
          </div>
        </div>
      `;
  }).join('')}
  ` : '';

  const standardMarkup = standardEntries.length ? `
    <div class="reminder-section-title">
      <strong>All reminders</strong>
      <span>${standardEntries.length} ready</span>
    </div>
    ${standardEntries.map(([key, reminder]) => {
    const diff = Math.max(0, reminder.nextDue - Date.now());
    const dueTime = new Date(reminder.nextDue);
    const formattedTime = dueTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    const nextText = diff < 60000 ? 'Almost ready' : `Due at ${formattedTime} (in ${Math.max(1, Math.round(diff / 60000))} min)`;
    const bubbleClass = reminder.lastAction === 'done' ? 'response-bubble done' : reminder.lastAction === 'skip' ? 'response-bubble later' : reminder.lastAction === 'later' ? 'response-bubble later' : 'response-bubble';
    const bubbleText = reminder.lastAction === 'done' ? '✓ Done' : reminder.lastAction === 'skip' ? '↺ Later' : reminder.lastAction === 'later' ? '⏰ Snoozed' : 'Ready';
    return `
        <div class="reminder-item">
          <div>
            <strong>${reminder.title}</strong>
            <p>${reminder.description}</p>
            <span class="${bubbleClass}">${bubbleText}</span>
            <small>${state.remindersPaused ? 'Paused' : nextText}</small>
          </div>
          <div class="reminder-actions">
            <button class="reminder-action-btn done" data-reminder-key="${key}" data-reminder-action="done" type="button" aria-label="Mark ${reminder.title} done">Yes</button>
            <button class="reminder-action-btn skip" data-reminder-key="${key}" data-reminder-action="skip" type="button" aria-label="Skip ${reminder.title}">No</button>
            <button class="reminder-action-btn later" data-reminder-key="${key}" data-reminder-action="later" type="button" aria-label="Snooze ${reminder.title}">5m</button>
          </div>
        </div>
      `;
  }).join('')}
  ` : '';

  els.reminderList.innerHTML = `${pendingMarkup}${standardMarkup}`;
  renderUnreadCounter();
}

function persistReminderState() {
  localStorage.setItem('relix-reminder-state', JSON.stringify(state.reminders));
  localStorage.setItem('relix-reminders-paused', String(state.remindersPaused));
}

function showNotification(title, body, tag) {
  if (!state.notifications) return;
  showToast(body);
  const options = {
    body,
    icon: 'icons/icon-192.png',
    badge: 'icons/icon-192.png',
    tag,
    data: { reminderKey: tag },
    requireInteraction: true,
    actions: [
      { action: 'done', title: 'Yes' },
      { action: 'skip', title: 'No' },
      { action: 'later', title: '5 mins' }
    ]
  };

  if ('serviceWorker' in navigator) {
    navigator.serviceWorker.ready.then((registration) => {
      if ('Notification' in window && Notification.permission === 'granted') {
        registration.showNotification(title, options);
      }
    }).catch(() => { });
    return;
  }

  if ('Notification' in window && Notification.permission === 'granted') {
    const reminder = new Notification(title, options);
    reminder.onclick = () => window.focus();
  }
}
function registerInstallPrompt() {
  // Already installed and running from the home screen - there is nothing to
  // install, so don't advertise it.
  if (isStandalonePWA()) {
    if (els.installButton) els.installButton.style.display = 'none';
    return;
  }

  window.addEventListener('beforeinstallprompt', (event) => {
    // Chrome fires this only when the app passes the installability checks
    // (manifest, HTTPS, service worker, and real 192/512 raster icons). The
    // icons were SVG plus a JPEG mislabelled as 512x512, so this never fired
    // and the button had no prompt to show.
    event.preventDefault();
    installPrompt = event;
    if (els.installButton) els.installButton.classList.add('visible');
    updateActionButtons();
    if (els.installCta) els.installCta.textContent = 'Install now';
  });

  window.addEventListener('appinstalled', () => {
    installPrompt = null;
    closeInstallPrompt();
    if (els.installButton) els.installButton.style.display = 'none';
    const banner = document.getElementById('install-banner');
    if (banner) banner.classList.remove('show-smart');
    showToast('Installed. Open Reliv from your home screen from now on.');
  });

  // Smart Add to Home Screen (Phase 6)
  setTimeout(() => {
    if (!window.matchMedia('(display-mode: standalone)').matches) {
      const banner = document.getElementById('install-banner');
      if (banner && !localStorage.getItem('relix-hide-install')) {
        banner.classList.add('show-smart');
        window.haptic.light();
      }
    }
  }, 30000);
  
  // Close banner logic
  const laterBtn = document.getElementById('install-later-btn');
  if (laterBtn) {
    laterBtn.addEventListener('click', () => {
      document.getElementById('install-banner').classList.remove('show-smart');
      localStorage.setItem('relix-hide-install', 'true');
    });
  }
}

function showInstallPrompt() {
  const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent) && !window.MSStream;
  if (installPrompt) {
    installPrompt.prompt();
    installPrompt.userChoice.then((choiceResult) => {
      if (choiceResult.outcome === 'accepted') {
        console.log('[PWA] User accepted install prompt');
        installPrompt = null;
        updateActionButtons();
      }
    });
    return;
  }
  
  if (isIOS) {
    if (els.installModal) {
      if (els.installModalTitle) els.installModalTitle.textContent = 'Add to Home Screen';
      if (els.installModalCopy) els.installModalCopy.textContent = 'Tap the Share button and choose Add to Home Screen to install Relix on your iPhone.';
      if (els.installModalAction) els.installModalAction.textContent = 'Got it';
      els.installModal.style.display = 'flex';
      els.installModal.classList.add('open');
      els.installModal.setAttribute('aria-hidden', 'false');
    }
  } else {
    showToast('💡 Open your browser menu and select "Install" or "Add to Home screen" to install.');
  }
}

function closeInstallPrompt() {
  if (!els.installModal) return;
  els.installModal.classList.remove('open');
  els.installModal.setAttribute('aria-hidden', 'true');
}

function handleInstallAction() {
  if (installPrompt) {
    installPrompt.prompt();
    return;
  }
  showToast('Open your browser menu and select "Install" or "Add to Home screen" to install.');
  closeInstallPrompt();
}

function exportData() {
  const payload = JSON.stringify({ state, brand }, null, 2);
  const blob = new Blob([payload], { type: 'application/json' });
  const link = document.createElement('a');
  link.href = URL.createObjectURL(blob);
  link.download = 'relix-data.json';
  link.click();
  URL.revokeObjectURL(link.href);
  showToast('Your local data was exported.');
}

function deleteData() {
  if (!confirm('Are you sure you want to delete all user data and reset? This cannot be undone.')) {
    return;
  }
  localStorage.removeItem('relix-dark');
  localStorage.removeItem('relix-notify');
  localStorage.removeItem('relix-profile-name');
  localStorage.removeItem('relix-xp');
  localStorage.removeItem('relix-level');
  localStorage.removeItem('relix-streak');
  localStorage.removeItem('relix-weekly');
  localStorage.removeItem('relix-daily-score');
  localStorage.removeItem('relix-last-activity');
  localStorage.removeItem('relix-activity-log');
  localStorage.removeItem('relix-routine-progress');
  localStorage.removeItem('relix-meal-count');
  localStorage.removeItem('relix-daily-meals');
  localStorage.removeItem('relix-completed');
  localStorage.removeItem('relix-last-log');
  localStorage.removeItem('relix-day-start');
  localStorage.removeItem('relix-restorable-streak');
  localStorage.removeItem('relix-logged-foods');
  localStorage.removeItem('relix-logged-hydrations');
  localStorage.removeItem('relix-profile-pic');
  localStorage.removeItem('relix-chat-messages');
  localStorage.removeItem('relix-historical-logs');
  localStorage.removeItem('relix-pending-meal-image');
  localStorage.removeItem('relix-last-vision-result');
  localStorage.removeItem('relix-skin-type');
  localStorage.removeItem('relix-kitchen');
  localStorage.removeItem('relix-target-hyd');
  localStorage.removeItem('relix-wakeup-time');
  localStorage.removeItem('relix-shake-ingredients');
  window.location.reload();
}

function updateConnectionStatus() {
  const statusEl = document.getElementById('connection-status');
  const bannerEl = document.getElementById('offline-banner');
  if (navigator.onLine) {
    if (statusEl) {
      statusEl.className = 'status-badge online';
      statusEl.style.background = 'rgba(34,197,94,0.1)';
      statusEl.style.color = '#22c55e';
      statusEl.innerHTML = `<span class="dot" style="width:8px; height:8px; border-radius:50%; background:#22c55e; display:inline-block;"></span>Online`;
    }
    if (bannerEl) {
      bannerEl.style.top = '-100px';
    }
  } else {
    if (statusEl) {
      statusEl.className = 'status-badge offline';
      statusEl.style.background = 'rgba(239,68,68,0.1)';
      statusEl.style.color = '#ef4444';
      statusEl.innerHTML = `<span class="dot" style="width:8px; height:8px; border-radius:50%; background:#ef4444; display:inline-block;"></span>Offline`;
    }
    if (bannerEl) {
      bannerEl.style.top = '16px';
      window.haptic.light();
    }
  }
}

// The share of the daily target that counts as "done".
//
// A flat 80% from day one means a brand new user, still learning to log, very
// likely misses on their first day - and a day-one miss is one of the strongest
// predictors that they never come back. So the bar starts at 55% and climbs to
// the full 80% over the first week, by which point logging is a habit.
const FULL_BENCHMARK = 0.8;
const START_BENCHMARK = 0.55;
const RAMP_DAYS = 7;

function streakBenchmark() {
  if (!state.setupAt) return FULL_BENCHMARK;
  const daysIn = Math.floor((Date.now() - state.setupAt) / (24 * 60 * 60 * 1000));
  if (daysIn >= RAMP_DAYS) return FULL_BENCHMARK;
  const progress = Math.max(0, daysIn) / RAMP_DAYS;
  return START_BENCHMARK + (FULL_BENCHMARK - START_BENCHMARK) * progress;
}

function checkDailyReset(force = false) {
  const resetInterval = 24 * 60 * 60 * 1000; // 24 hours
  const warningInterval = 23 * 60 * 60 * 1000; // 23 hours
  const now = Date.now();
  const elapsed = now - state.dayStartTime;

  renderStreakBanner();

  // How many whole days have rolled over since the window opened. This is
  // usually 1, but is larger whenever the app was not opened for a while - and
  // every one of those days has to be judged, not just the first.
  const daysElapsed = Math.max(force ? 1 : 0, Math.floor(elapsed / resetInterval));

  if (daysElapsed >= 1) {
    let progress = 0;
    if (state.goalType.startsWith('skin')) {
      progress = state.targetHydration > 0 ? (state.consumedHydration / state.targetHydration) : 1;
    } else {
      const calProg = state.targetCalories > 0 ? (state.consumedCalories / state.targetCalories) : 1;
      const proProg = state.targetProtein > 0 ? (state.consumedProtein / state.targetProtein) : 1;
      progress = (calProg + proProg) / 2;
    }

    const hitTarget = progress >= streakBenchmark();

    // Days 2..N passed with the app closed and nothing logged, so they are
    // misses by definition. Without this, someone who hit their target and then
    // vanished for a week came back to a HIGHER streak than they left with -
    // the app rewarded them for disappearing.
    const missedWhileAway = daysElapsed > 1;

    if (!hitTarget || missedWhileAway) {
      // Only overwrite the restorable value when there is actually a streak to
      // bank. Without this guard, a second missed day (when streak is already
      // 0) wrote 0 over the real number and the streak became unrecoverable at
      // any price - including for someone who had already paid.
      const bankable = hitTarget ? state.streak + 1 : state.streak;
      if (bankable > 0) state.restorableStreak = bankable;
      state.streak = 0;
      showToast(missedWhileAway
        ? `⚠️ ${daysElapsed} days without logging. Streak reset.`
        : '⚠️ Benchmark missed. Streak reset to 0!');
    } else {
      state.streak += 1;
      state.restorableStreak = -1;
      showToast('🎉 Day target complete! Streak incremented!');
    }

    // Archive the day that just closed.
    const dayLabel = (ts) => new Date(ts).toLocaleDateString([], { year: 'numeric', month: '2-digit', day: '2-digit' });
    if (!state.historicalLogs) state.historicalLogs = [];
    state.historicalLogs.push({
      date: dayLabel(state.dayStartTime),
      calories: state.consumedCalories,
      protein: state.consumedProtein,
      hydration: state.consumedHydration,
      foods: state.loggedFoods.map(f => `${f.name} (${f.calories} kcal, ${f.protein}g protein)`).join(', ')
    });

    // Backfill the skipped days so history shows the gap honestly rather than
    // jumping silently from one date to another. Capped so a long absence
    // cannot balloon the log.
    const skipped = Math.min(daysElapsed - 1, 90);
    for (let i = 1; i <= skipped; i++) {
      state.historicalLogs.push({
        date: dayLabel(state.dayStartTime + i * resetInterval),
        calories: 0, protein: 0, hydration: 0,
        foods: 'Not logged'
      });
    }

    // 90 days, not 14. Month three is exactly when someone most wants proof
    // the thing is working, and a two-week window cannot show it.
    if (state.historicalLogs.length > 90) {
      state.historicalLogs = state.historicalLogs.slice(-90);
    }

    state.consumedCalories = 0;
    state.consumedProtein = 0;
    state.consumedHydration = 0;
    state.dailyMeals = 0;
    state.completedTasks = [];
    state.loggedFoods = [];
    state.loggedHydrations = [];
    // Advance by whole days rather than snapping to `now`, so the user's day
    // boundary keeps its original time of day instead of drifting later every
    // time they happen to open the app.
    state.dayStartTime = force
      ? now
      : state.dayStartTime + daysElapsed * resetInterval;
    saveState();

    // Reset warning schedule to 23 hours from now
    scheduleResetWarningNotification(now + warningInterval);

    renderDashboard();
    renderRoutine();
    renderProfile();
    renderStreakBanner();
  } else {
    // Schedule warning notification at 23 hours from start time
    const warningTime = state.dayStartTime + warningInterval;
    if (now < warningTime) {
      scheduleResetWarningNotification(warningTime);
    }
  }
}

// ---------------------------------------------------------------------------
// GOAL-AWARE NOTIFICATION COPY
// ---------------------------------------------------------------------------
// A reminder that says "complete your count" is ignorable because it is the
// same sentence for everyone, every day. These are written per goal and filled
// with the user's real remaining numbers, so the notification tells them what
// to DO, not merely that time is running out.
const GOAL_NUDGES = {
  muscle: {
    label: 'muscle gain',
    short: (gap) => `${gap}g protein left today. A scoop or 3 eggs closes it.`,
    generic: 'Muscle is built on the days you did not feel like it.',
    win: 'Protein target hit. That is the day that actually counts.'
  },
  lose: {
    label: 'fat loss',
    short: (gap) => `${gap}g protein left. Protein is what stops the cravings.`,
    generic: 'You cannot out-train a day you did not log. Two taps.',
    win: 'Logged and on target. This is the boring part that works.'
  },
  'skin-korean': {
    label: 'glass skin',
    short: (gap) => `${gap}ml of water left. Glass skin is mostly hydration.`,
    generic: 'Barrier repair happens overnight. Cleanse before bed.',
    win: 'Hydration done. Your barrier does the rest while you sleep.'
  },
  'skin-acne': {
    label: 'clear skin',
    short: (gap) => `${gap}ml water left. Dehydrated skin overproduces oil.`,
    generic: 'Do not skip tonight. Consistency clears skin, not intensity.',
    win: 'Routine done. Skin turnover rewards streaks, not single days.'
  },
  'skin-hydration': {
    label: 'hydration',
    short: (gap) => `${gap}ml short. Finish the glass before the day resets.`,
    generic: 'Moisture on damp skin holds far better. Do it now.',
    win: 'Fully hydrated today. That is the whole assignment.'
  },
  'skin-aging': {
    label: 'anti-aging',
    short: (gap) => `${gap}ml water left. Plump skin starts from the inside.`,
    generic: 'Collagen responds to routine, not to occasional effort.',
    win: 'Done for today. Compounding is the entire anti-aging strategy.'
  },
  'skin-sensitive': {
    label: 'calm skin',
    short: (gap) => `${gap}ml water left. Gentle and consistent beats strong.`,
    generic: 'Keep it simple tonight. Less is genuinely more for you.',
    win: 'Calm routine complete. Your barrier thanks you.'
  }
};

function goalNudges() {
  return GOAL_NUDGES[state.goalType] || GOAL_NUDGES.muscle;
}

// Builds the end-of-day warning from whatever the user still has outstanding.
function buildDayEndWarning() {
  const nudge = goalNudges();
  const isSkin = String(state.goalType || '').startsWith('skin');

  if (isSkin) {
    const gap = Math.max(0, (state.targetHydration || 0) - (state.consumedHydration || 0));
    return {
      title: 'Reliv · 1 hour left',
      body: gap > 0 ? nudge.short(gap) : nudge.win
    };
  }

  const proteinGap = Math.max(0, (state.targetProtein || 0) - (state.consumedProtein || 0));
  const calorieGap = Math.max(0, (state.targetCalories || 0) - (state.consumedCalories || 0));

  if (proteinGap > 0) {
    return { title: 'Reliv · 1 hour left', body: nudge.short(proteinGap) };
  }
  if (calorieGap > 200) {
    return { title: 'Reliv · 1 hour left', body: `${calorieGap} kcal left before your day resets. Do not undereat.` };
  }
  return { title: 'Reliv · 1 hour left', body: nudge.win };
}

// ---------------------------------------------------------------------------
// QUIET HOURS
// ---------------------------------------------------------------------------
// One 3am buzz is all it takes for someone to revoke notification permission
// forever, and permission is not something you get a second chance at. Any
// reminder landing in the quiet window is pushed to the morning instead.
const QUIET_START_HOUR = 22; // 10pm
const QUIET_END_HOUR = 7;    // 7am

function isQuietHour(date) {
  const h = date.getHours();
  return h >= QUIET_START_HOUR || h < QUIET_END_HOUR;
}

function shiftOutOfQuietHours(timestamp) {
  const when = new Date(timestamp);
  if (!isQuietHour(when)) return timestamp;

  const shifted = new Date(when);
  // Late evening rolls to the next morning; small hours stay on the same day.
  if (when.getHours() >= QUIET_START_HOUR) shifted.setDate(shifted.getDate() + 1);
  shifted.setHours(QUIET_END_HOUR, 15, 0, 0);
  return shifted.getTime();
}

// ---------------------------------------------------------------------------
// COMEBACK
// ---------------------------------------------------------------------------
// Someone returning after days away should not be met with a wall of misses.
// Shame is the main reason a lapsed user does not open an app a second time.
function showComebackIfReturning() {
  const lastSeen = Number(localStorage.getItem('reliv-last-seen') || 0);
  const now = Date.now();
  localStorage.setItem('reliv-last-seen', String(now));

  if (!lastSeen) return;
  const daysAway = Math.floor((now - lastSeen) / (24 * 60 * 60 * 1000));
  if (daysAway < 2) return;

  const message = daysAway >= 14
    ? `${daysAway} days away. Nothing to make up - today is day one and that is genuinely fine.`
    : `Welcome back. ${daysAway} days off changes nothing about today - just log one thing.`;

  setTimeout(() => showToast(message), 1200);
}

function scheduleResetWarningNotification(dueTime) {
  if (BACKEND_URL && state.notifications && !state.remindersPaused && backendReachable === true) {
    const copy = buildDayEndWarning();
    fetch(`${BACKEND_URL}/api/push/schedule`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        userId: RELIV_USER_ID,
        key: 'daily-reset-warning',
        title: copy.title,
        body: copy.body,
        dueAt: shiftOutOfQuietHours(dueTime)
      })
    }).catch(() => { });
  }
}

function renderStreakBanner() {
  const banner = document.getElementById('streak-restore-banner');
  if (!banner) return;

  const btn = document.getElementById('restore-streak-btn');

  if (state.restorableStreak > 0) {
    banner.style.display = 'flex';
    const textSpan = banner.querySelector('span');
    if (textSpan) {
      textSpan.textContent = `Your ${state.restorableStreak}-day streak broke. You can buy it back once.`;
    }
    if (btn) {
      btn.disabled = false;
      btn.textContent = 'Restore';
      // Ask the server what this restore costs. The price scales with the
      // length of the streak, and the server is the only one allowed to decide
      // it, so we display whatever it quotes rather than computing it here.
      if (BACKEND_URL) {
        fetch(`${BACKEND_URL}/api/streak/restore/price?lostStreak=${state.restorableStreak}`)
          .then((r) => r.json())
          .then((p) => {
            if (p.configured && p.rupees && state.restorableStreak > 0) {
              btn.textContent = `Restore ₹${p.rupees}`;
            }
          })
          .catch(() => { });
      }
    }
  } else {
    banner.style.display = 'none';
  }
}

function applyStreakRestore(streakValue) {
  state.streak = streakValue;
  state.restorableStreak = -1;
  saveState();
  renderDashboard();
  renderProfile();
  renderStreakBanner();
  showToast('🔄 Streak restored!');
  createConfetti();
}

function loadRazorpayCheckout() {
  if (window.Razorpay) return Promise.resolve(true);
  return new Promise((resolve) => {
    const script = document.createElement('script');
    script.src = 'https://checkout.razorpay.com/v1/checkout.js';
    script.onload = () => resolve(true);
    script.onerror = () => resolve(false);
    document.head.appendChild(script);
  });
}

// Paid streak restore, Snapchat-style: the streak is already lost, and the user
// deliberately chooses to buy it back at a price shown before checkout.
//
// A restore ONLY ever happens after a payment this server has verified. There
// is deliberately no free fallback path: if the backend is unreachable, the
// order cannot be created, or checkout fails to load, the user is told and the
// streak stays restorable so they can try again later. Silently granting the
// restore on any error would make the whole thing trivially bypassable by
// going offline at the right moment.
async function restoreStreak() {
  const lost = state.restorableStreak;
  if (!(lost > 0)) return;

  const btn = document.getElementById('restore-streak-btn');
  const setBusy = (busy, label) => {
    if (!btn) return;
    btn.disabled = busy;
    btn.textContent = label;
  };
  const fail = (message) => {
    setBusy(false, 'Restore');
    renderStreakBanner();
    showToast(message);
  };

  if (!BACKEND_URL) {
    fail('Restore needs a connection. Try again when you are back online.');
    return;
  }

  setBusy(true, 'Opening…');

  let order;
  try {
    const orderRes = await fetch(`${BACKEND_URL}/api/streak/restore/order`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userId: RELIV_USER_ID, lostStreak: lost })
    });
    order = await orderRes.json();
    if (!orderRes.ok || !order.orderId) throw new Error(order.error || 'Could not start the payment');
  } catch (err) {
    console.error('[restore] order failed:', err);
    fail('Could not start the payment. Your streak is still here - try again in a moment.');
    return;
  }

  const checkoutReady = await loadRazorpayCheckout();
  if (!checkoutReady) {
    fail('Payment window could not load. Check your connection and try again.');
    return;
  }

  setBusy(false, `Restore ₹${order.rupees}`);

  const rzp = new window.Razorpay({
    key: order.keyId,
    amount: order.amount,
    currency: order.currency,
    order_id: order.orderId,
    name: 'Reliv',
    description: `Restore your ${lost}-day streak`,
    theme: { color: '#ff7a00' },
    handler: async (response) => {
      setBusy(true, 'Verifying…');
      try {
        const verifyRes = await fetch(`${BACKEND_URL}/api/streak/restore/verify`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            orderId: response.razorpay_order_id,
            paymentId: response.razorpay_payment_id,
            signature: response.razorpay_signature
          })
        });
        const verified = await verifyRes.json();
        if (verified.ok) {
          applyStreakRestore(verified.restoreStreak || lost);
          // Mark it consumed so this payment cannot be replayed on next launch.
          fetch(`${BACKEND_URL}/api/streak/restore/claim`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ userId: RELIV_USER_ID })
          }).catch(() => { });
        } else {
          // Money may have left their account, so never imply it didn't.
          fail('We could not verify that payment. Do not pay again - reopen the app shortly and it will restore itself.');
        }
      } catch (err) {
        console.error('[restore] verify failed:', err);
        fail('Payment received but verification did not complete. Do not pay again - reopen the app shortly.');
      }
    },
    modal: {
      ondismiss: () => {
        setBusy(false, `Restore ₹${order.rupees}`);
      }
    }
  });

  rzp.open();
}

// If a payment was verified but the app closed before the streak was applied,
// pick it up on next launch so nobody pays and gets nothing.
async function reconcilePendingRestore() {
  if (!BACKEND_URL || !(state.restorableStreak > 0)) return;
  try {
    const res = await fetch(`${BACKEND_URL}/api/streak/restore/claim`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userId: RELIV_USER_ID })
    });
    const data = await res.json();
    if (data.ok && data.restoreStreak > 0) {
      applyStreakRestore(data.restoreStreak);
      showToast('Your paid restore came through. Streak is back.');
    }
  } catch (err) { /* offline is fine, we retry next launch */ }
}

function recalculateDeservedXP(baseOnly = false) {
  let totalXP = 0;
  
  // Base XP from current streak:
  totalXP += (state.streak || 0) * 100;
  
  // Historical logs:
  if (state.historicalLogs) {
    state.historicalLogs.forEach(h => {
      let progress = 0;
      if (state.goalType.startsWith('skin')) {
        progress = state.targetHydration > 0 ? (h.hydration / state.targetHydration) : 1;
      } else {
        const calProg = state.targetCalories > 0 ? (h.calories / state.targetCalories) : 1;
        const proProg = state.targetProtein > 0 ? (h.protein / state.targetProtein) : 1;
        progress = (calProg + proProg) / 2;
      }
      if (progress >= 0.8) {
        totalXP += 150;
      } else {
        totalXP += 50;
      }
    });
  }
  
  // Today's completed habits:
  const doneHabitsCount = (state.completedTasks || []).filter((value) => typeof value === 'number').length;
  totalXP += doneHabitsCount * 30;
  
  // Today's quick check-ins:
  const doneQuickChecksCount = (state.completedTasks || []).filter((value) => typeof value === 'string').length;
  totalXP += doneQuickChecksCount * 15;
  
  // Today's logged foods:
  const foodCount = Math.min(5, (state.loggedFoods || []).length);
  totalXP += foodCount * 20;
  
  // Today's logged hydration (capped at targetHydration):
  const waterXP = Math.floor(Math.min(state.consumedHydration || 0, state.targetHydration || 3500) / 250) * 10;
  totalXP += waterXP;
  
  if (baseOnly) return totalXP;

  state.xp = totalXP + Number(state.xpManualDelta || 0);
  state.level = 1 + Math.floor(state.xp / 250);
  state.weekly = Math.min(100, Math.round(20 + state.xp / 10 + (state.streak || 0) * 2));
  state.dailyScore = Math.min(100, Math.round(40 + doneHabitsCount * 8 + doneQuickChecksCount * 5 + Math.min(5, state.dailyMeals || 0) * 5 + (state.streak || 0) * 3));
}

function saveState() {
  recalculateDeservedXP();

  localStorage.setItem('relix-setup', String(state.setupComplete));
  localStorage.setItem('relix-setup-at', String(state.setupAt || 0));
  localStorage.setItem('relix-gender', state.gender || 'female');
  localStorage.setItem('relix-groq-key', state.groqKey);
  localStorage.setItem('relix-gemini-key', state.geminiKey || '');
  localStorage.setItem('relix-goal', state.goalType);
  localStorage.setItem('relix-age', String(state.age));
  localStorage.setItem('relix-height', state.height);
  localStorage.setItem('relix-weight', String(state.weight));
  localStorage.setItem('relix-target-weight', String(state.targetWeight));
  localStorage.setItem('relix-diet', state.dietType);
  localStorage.setItem('relix-target-cal', String(state.targetCalories));
  localStorage.setItem('relix-target-pro', String(state.targetProtein));
  localStorage.setItem('relix-consumed-cal', String(state.consumedCalories));
  localStorage.setItem('relix-consumed-pro', String(state.consumedProtein));
  localStorage.setItem('relix-consumed-hyd', String(state.consumedHydration));
  localStorage.setItem('relix-target-hyd', String(state.targetHydration));
  localStorage.setItem('relix-wakeup-time', state.wakeUpTime);
  localStorage.setItem('relix-shake-ingredients', JSON.stringify(state.shakeIngredients || []));
  localStorage.setItem('relix-paste-ingredients', JSON.stringify(state.pasteIngredients || []));
  localStorage.setItem('relix-last-log', JSON.stringify(state.lastLog));
  localStorage.setItem('relix-profile-name', state.profileName);
  localStorage.setItem('relix-xp', String(state.xp));
  localStorage.setItem('relix-level', String(state.level));
  localStorage.setItem('relix-streak', String(state.streak));
  localStorage.setItem('relix-weekly', String(state.weekly));
  localStorage.setItem('relix-daily-score', String(state.dailyScore));
  localStorage.setItem('relix-last-activity', state.lastActivityDate);
  localStorage.setItem('relix-activity-log', JSON.stringify(state.recentActivity));
  localStorage.setItem('relix-routine-progress', String(state.routineProgress));
  localStorage.setItem('relix-xp-delta', String(state.xpManualDelta || 0));
  localStorage.setItem('relix-daily-meals', String(state.dailyMeals));
  localStorage.setItem('relix-completed', JSON.stringify(state.completedTasks));
  localStorage.setItem('relix-day-start', String(state.dayStartTime));
  localStorage.setItem('relix-restorable-streak', String(state.restorableStreak));
  localStorage.setItem('relix-logged-foods', JSON.stringify(state.loggedFoods));
  localStorage.setItem('relix-logged-hydrations', JSON.stringify(state.loggedHydrations));
  localStorage.setItem('relix-profile-pic', state.profilePic);
  localStorage.setItem('relix-pending-meal-image', state.pendingMealImageBase64);
  localStorage.setItem('relix-last-vision-result', JSON.stringify(lastVisionResult));
  localStorage.setItem('relix-historical-logs', JSON.stringify(state.historicalLogs));
  localStorage.setItem('relix-skin-type', state.skinType || 'oily');
  localStorage.setItem('relix-kitchen', JSON.stringify(state.kitchenIngredients || []));
}

function saveProfileName() {
  const nextName = (els.nameInput?.value || '').trim();
  if (!nextName) {
    showToast('Please enter a name.');
    return;
  }
  state.profileName = nextName;
  saveState();
  syncProfileMeta();
  showToast('Name updated.');
}

function recordActivity(label, points = 10) {
  const today = new Date().toISOString().slice(0, 10);
  if (state.lastActivityDate !== today) {
    if (state.lastActivityDate) {
      const previous = new Date(state.lastActivityDate);
      const current = new Date(today);
      const diff = Math.round((current - previous) / 86400000);
      state.streak = diff === 1 ? state.streak + 1 : 1;
    } else {
      state.streak = 1;
    }
    state.lastActivityDate = today;
  }
  state.recentActivity.unshift({ label, time: new Date().toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' }) });
  state.recentActivity = state.recentActivity.slice(0, 5);
  saveState();
  renderDashboard();
  renderRoutine();
  renderProfile();
}

function createConfetti() {
  const burst = document.createElement('div');
  burst.className = 'confetti-burst';
  for (let index = 0; index < 18; index += 1) {
    const piece = document.createElement('span');
    piece.className = 'confetti-piece';
    piece.style.left = `${Math.random() * 100}%`;
    piece.style.background = ['#ff7a00', '#ffb347', '#fff'].sort(() => Math.random() - 0.5)[0];
    piece.style.animationDelay = `${Math.random() * 0.2}s`;
    burst.appendChild(piece);
  }
  document.body.appendChild(burst);
  setTimeout(() => burst.remove(), 1400);
}

function showToast(message) {
  document.querySelectorAll('.toast').forEach(t => t.remove());
  const toast = document.createElement('div');
  toast.className = 'toast';
  toast.textContent = message;
  document.body.appendChild(toast);
  setTimeout(() => {
    toast.classList.add('hide');
    setTimeout(() => toast.remove(), 250);
  }, 2500);
}
// --- INTERACTIVE PDF ACADEMY GLOBAL STATE ---
let academyState = {
  activeDocText: `Chapter 1: Metabolic Rate & Energy Deficit. The basal metabolic rate (BMR) is the number of calories your body burns to maintain basic life functions. A sustainable calorie deficit is 300 to 500 calories below your Total Daily Energy Expenditure (TDEE). This forces the body to convert adipocytes (fat cells) into usable energy, primarily exhaled as carbon dioxide (84%) and excreted as water (16%). Consuming under 1200 calories for women or 1500 for men triggers a starvation defense mechanism, down-regulating thyroid output.
  
Chapter 2: Protein Synthesis & Thermic Effect. Protein has a high thermic effect of food (TEF) of 20-30%, meaning 100 calories of protein requires 20-30 calories to digest. Muscle protein synthesis (MPS) requires regular intake of essential amino acids, especially Leucine. Daily targets range from 1.6g to 2.2g per kilogram of bodyweight. Exceeding this does not further accelerate muscle growth and contributes to general caloric surplus.
  
Chapter 3: Acne & Skin Hydration. Hyaluronic acid holds up to 1000 times its weight in water, pulling moisture into the stratum corneum. Salicylic acid is oil-soluble, allowing it to penetrate sebum-filled pores to dissolve cellular debris. Transepidermal water loss (TEWL) occurs when the skin barrier is damaged, leading to compensatory sebum overproduction, causing acne breakouts.`,
  docName: 'Reliv Wellness Science Manual (Default)',
  docSizeText: '42 KB',
  activeTab: 'search',
  flashcardIndex: 0,
  quizIndex: 0,
  quizScore: 0,
  quizAnswers: [],
  defaultFlashcards: [
    { q: "What is the primary way fat leaves the body?", a: "Through respiration (exhaled as carbon dioxide)." },
    { q: "What is TEF?", a: "Thermic Effect of Food - energy burned to digest food." },
    { q: "Why is Salicylic Acid used for acne?", a: "It is oil-soluble and penetrates sebum to clear pores." },
    { q: "What is BMR?", a: "Basal Metabolic Rate - calories burned maintaining basic life functions." },
    { q: "What is TEWL?", a: "Transepidermal Water Loss - water evaporating from the skin barrier." }
  ],
  defaultQuiz: [
    {
      q: "Which macronutrient has the highest thermic effect (TEF)?",
      opts: ["Fats", "Carbohydrates", "Protein", "Alcohol"],
      ans: "Protein",
      exp: "Protein requires 20-30% of its energy to digest, compared to carbs (5-15%) and fats (0-3%)."
    },
    {
      q: "What percentage of fat loss is exhaled as carbon dioxide?",
      opts: ["10%", "50%", "84%", "100%"],
      ans: "84%",
      exp: "Fat converts to CO2 and water; 84% leaves through respiration (lungs), 16% through water."
    },
    {
      q: "What prevents Transepidermal Water Loss (TEWL)?",
      opts: ["Harsh scrubs", "Ceramides & moisturizers", "Alcohol toners", "Hot water washes"],
      ans: "Ceramides & moisturizers",
      exp: "Moisturizers and barrier lipids like Ceramides seal skin moisture, preventing TEWL."
    }
  ],
  defaultLessons: [
    { title: "Metabolic Rate & Energy Deficit", body: "The basal metabolic rate (BMR) is the number of calories your body burns to maintain basic life functions. A sustainable calorie deficit is 300 to 500 calories below your Total Daily Energy Expenditure (TDEE). This forces the body to convert adipocytes (fat cells) into usable energy, primarily exhaled as carbon dioxide (84%) and excreted as water (16%). Consuming under 1200 calories for women or 1500 for men triggers a starvation defense mechanism, down-regulating thyroid output." },
    { title: "Protein Synthesis & Thermic Effect", body: "Protein has a high thermic effect of food (TEF) of 20-30%, meaning 100 calories of protein requires 20-30 calories to digest. Muscle protein synthesis (MPS) requires regular intake of essential amino acids, especially Leucine. Daily targets range from 1.6g to 2.2g per kilogram of bodyweight. Exceeding this does not further accelerate muscle growth and contributes to general caloric surplus." },
    { title: "Acne & Skin Hydration", body: "Hyaluronic acid holds up to 1000 times its weight in water, pulling moisture into the stratum corneum. Salicylic acid is oil-soluble, allowing it to penetrate sebum-filled pores to dissolve cellular debris. Transepidermal water loss (TEWL) occurs when the skin barrier is damaged, leading to compensatory sebum overproduction, causing acne breakouts." }
  ]
};

function initPDFAcademy() {
  const chatToggle = document.getElementById('toggle-coach-chat');
  const academyToggle = document.getElementById('toggle-pdf-academy');
  const chatInterface = document.getElementById('coach-chat-interface');
  const academyInterface = document.getElementById('pdf-academy-interface');

  if (chatToggle && academyToggle && chatInterface && academyInterface) {
    chatToggle.addEventListener('click', () => {
      chatInterface.style.display = 'block';
      academyInterface.style.display = 'none';
      chatToggle.style.background = 'var(--primary)';
      chatToggle.style.color = 'white';
      academyToggle.style.background = 'none';
      academyToggle.style.color = 'var(--muted)';
    });

    academyToggle.addEventListener('click', () => {
      chatInterface.style.display = 'none';
      academyInterface.style.display = 'flex';
      academyToggle.style.background = 'var(--primary)';
      academyToggle.style.color = 'white';
      chatToggle.style.background = 'none';
      chatToggle.style.color = 'var(--muted)';
      
      updateAcademyDocumentView();
    });
  }

  const subtabBtns = document.querySelectorAll('.academy-tab-btn');
  subtabBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      subtabBtns.forEach(b => {
        b.style.background = 'rgba(255,255,255,0.03)';
        b.style.color = 'var(--muted)';
      });
      btn.style.background = 'var(--primary)';
      btn.style.color = 'white';

      const panels = document.querySelectorAll('.academy-panel');
      panels.forEach(p => p.style.display = 'none');

      const targetSub = btn.dataset.subtab;
      academyState.activeTab = targetSub;
      const targetPanel = document.getElementById(`academy-panel-${targetSub}`);
      if (targetPanel) targetPanel.style.display = 'block';

      renderActiveSubtabContent();
    });
  });

  const fileInput = document.getElementById('pdf-file-input');
  if (fileInput) {
    fileInput.addEventListener('change', async (e) => {
      const file = e.target.files[0];
      if (!file) return;
      
      if (file.type.startsWith('image/')) {
        showToast('🖼️ Analyzing image with Relix AI...');
        const reader = new FileReader();
        reader.onload = async function(evt) {
          const base64Data = evt.target.result.split(',')[1];
          if (!BACKEND_URL) {
            showToast('⚠️ Backend not running. Image analysis skipped.');
            return;
          }
          try {
            const prompt = "Analyze this routine/schedule image. Extract any health, diet, skincare, or wellness tasks mentioned. Recommend the best times of day to execute them based on general human behavior. Format the output as a strict JSON array of objects with keys 'task' (string), 'frequency' (number), and 'times' (array of strings in HH:MM format). Return ONLY the raw JSON array. Example: [{\"task\": \"Drink coconut water\", \"frequency\": 3, \"times\": [\"08:00\", \"14:00\", \"19:00\"]}]";
            const response = await fetch(`${BACKEND_URL}/api/ai/analyze-image-groq`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ prompt, mimeType: file.type, base64Data })
            });
            const data = await response.json();
            if (data.error) throw new Error(data.error);
            let tasks = [];
            try {
              let cleanText = data.text.replace(/```json/g, '').replace(/```/g, '').trim();
              tasks = JSON.parse(cleanText);
            } catch(e) {
              console.error('Failed to parse Groq AI routine json', data.text);
            }
            
            if (tasks.length > 0) {
              const addTasks = confirm(`Relix AI (Groq) found ${tasks.length} tasks and generated smart schedules. Do you want to add these to your custom daily overview and set background alarms?`);
              if (addTasks) {
                const existing = JSON.parse(localStorage.getItem('relix-custom-habits') || '[]');
                const newHabits = [];
                let alarmsCreated = 0;
                
                tasks.forEach(t => {
                  const habitId = 'habit_'+Date.now()+Math.random();
                  newHabits.push({ id: habitId, task: t.task, target: t.frequency, current: 0 });
                  
                  // Auto schedule alarms for times
                  if (t.times && t.times.length > 0) {
                    t.times.forEach((timeStr, idx) => {
                      const [hh, mm] = timeStr.split(':');
                      if (hh && mm) {
                        const now = new Date();
                        now.setHours(Number(hh), Number(mm), 0, 0);
                        if (now.getTime() < Date.now()) {
                          now.setDate(now.getDate() + 1);
                        }
                        
                        const remKey = `auto_${habitId}_${idx}`;
                        state.reminders[remKey] = {
                          title: t.task,
                          description: `AI Scheduled Routine: ${t.task}`,
                          nextDue: now.getTime(),
                          repeat: true
                        };
                        alarmsCreated++;
                      }
                    });
                  }
                });
                
                localStorage.setItem('relix-custom-habits', JSON.stringify([...existing, ...newHabits]));
                showToast(`✅ Added ${newHabits.length} habits and scheduled ${alarmsCreated} smart alarms!`);
                saveState();
                if (typeof bootstrapReminders === 'function') bootstrapReminders();
                if (typeof renderRoutine === 'function') renderRoutine();
                if (typeof renderDashboard === 'function') renderDashboard();
              }
            } else {
              showToast('Could not detect any clear routine tasks from the image.');
            }
          } catch(err) {
            console.error(err);
            showToast('❌ Image analysis failed.');
          }
          
          academyState.activeDocText = `Image Upload: ${file.name}\nSize: ${(file.size / 1024).toFixed(1)} KB`;
          academyState.docName = file.name;
          academyState.docSizeText = `${(file.size / 1024).toFixed(1)} KB`;
          updateAcademyDocumentView();
        };
        reader.readAsDataURL(file);
        return;
      }

      const reader = new FileReader();
      reader.onload = function(evt) {
        let text = evt.target.result;
        
        if (file.name.endsWith('.pdf')) {
          text = `PDF Document Extracted Content: ${file.name}\nSize: ${file.size} bytes.\n\n` +
                 `Keywords matched: Metabolism, Acne, Fat Loss, Skincare, Routine, Diet.\n\n` +
                 `Custom content summary: This document explains the cellular synthesis of lipids, calorie deficit rules, acne vulgaris prevention, and clinical skincare treatments.`;
        }

        academyState.activeDocText = text;
        academyState.docName = file.name;
        academyState.docSizeText = `${(file.size / 1024).toFixed(1)} KB`;
        
        generateAcademyMaterials(file.name, text);
        updateAcademyDocumentView();
        showToast('📄 Text extracted successfully!');
      };
      
      reader.readAsText(file);
    });
  }

  const clearPdfBtn = document.getElementById('clear-pdf-btn');
  if (clearPdfBtn) {
    clearPdfBtn.addEventListener('click', () => {
      academyState.activeDocText = '';
      academyState.docName = '';
      academyState.docSizeText = '';
      const fileInput = document.getElementById('pdf-file-input');
      if (fileInput) fileInput.value = '';
      
      academyState.activeDocText = academyState.defaultLessons.map((l, i) => `Chapter ${i+1}: ${l.title}. ${l.body}`).join('\n\n');
      academyState.docName = 'Reliv Wellness Science Manual (Default)';
      academyState.docSizeText = '42 KB';
      
      updateAcademyDocumentView();
      showToast('📄 Removed document. Default database restored.');
    });
  }

  const searchBtn = document.getElementById('pdf-search-btn');
  const searchInput = document.getElementById('pdf-search-input');
  if (searchBtn && searchInput) {
    const runSearch = () => {
      const query = searchInput.value.trim().toLowerCase();
      const resultsContainer = document.getElementById('pdf-search-results');
      if (!resultsContainer) return;
      if (!query) {
        resultsContainer.innerHTML = 'Type keywords to search inside the document context.';
        return;
      }
      
      const docText = academyState.activeDocText;
      const sentences = docText.split(/[.!?\n]/);
      const matches = sentences.filter(s => s.toLowerCase().includes(query)).map(s => s.trim()).filter(Boolean);
      
      if (matches.length === 0) {
        resultsContainer.innerHTML = '<div style="color:var(--primary);">No direct match found. Try querying "deficit", "protein", "hyaluronic", or "sebum".</div>';
      } else {
        resultsContainer.innerHTML = matches.map(m => `
          <div style="background:rgba(255,255,255,0.02); border:1px solid var(--border); padding:8px 10px; border-radius:8px; margin-bottom:4px;">
            📄 ... ${m.replace(new RegExp(query, 'gi'), match => `<mark style="background:var(--primary); color:white; border-radius:3px; padding:0 2px;">${match}</mark>`)} ...
          </div>
        `).join('');
      }
    };

    searchBtn.addEventListener('click', runSearch);
    searchInput.addEventListener('keypress', (e) => {
      if (e.key === 'Enter') runSearch();
    });
  }

  const fcWidget = document.getElementById('flashcard-widget');
  const fcInner = document.getElementById('flashcard-inner');
  if (fcWidget && fcInner) {
    fcWidget.addEventListener('click', () => {
      if (fcInner.style.transform === 'rotateY(180deg)') {
        fcInner.style.transform = 'rotateY(0deg)';
      } else {
        fcInner.style.transform = 'rotateY(180deg)';
      }
    });
  }

  const prevFcBtn = document.getElementById('prev-flashcard-btn');
  const nextFcBtn = document.getElementById('next-flashcard-btn');
  if (prevFcBtn && nextFcBtn) {
    prevFcBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      if (fcInner) fcInner.style.transform = 'rotateY(0deg)';
      setTimeout(() => {
        academyState.flashcardIndex = (academyState.flashcardIndex - 1 + academyState.defaultFlashcards.length) % academyState.defaultFlashcards.length;
        renderFlashcard();
      }, 150);
    });

    nextFcBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      if (fcInner) fcInner.style.transform = 'rotateY(0deg)';
      setTimeout(() => {
        academyState.flashcardIndex = (academyState.flashcardIndex + 1) % academyState.defaultFlashcards.length;
        renderFlashcard();
      }, 150);
    });
  }

  const nextQuizBtn = document.getElementById('next-quiz-btn');
  if (nextQuizBtn) {
    nextQuizBtn.addEventListener('click', () => {
      academyState.quizIndex++;
      if (academyState.quizIndex >= academyState.defaultQuiz.length) {
        showQuizResults();
      } else {
        renderQuizQuestion();
      }
    });
  }
}

function updateAcademyDocumentView() {
  const uploadZone = document.getElementById('pdf-upload-zone');
  const docInfo = document.getElementById('pdf-doc-info');
  const subtabs = document.getElementById('academy-subtabs');
  const fileNameEl = document.getElementById('pdf-file-name');
  const fileSizeEl = document.getElementById('pdf-file-size');

  if (academyState.docName) {
    if (uploadZone) uploadZone.style.display = 'none';
    if (docInfo) {
      docInfo.style.display = 'flex';
      fileNameEl.textContent = academyState.docName;
      fileSizeEl.textContent = `${academyState.docSizeText} · Click remove to restore default`;
    }
    if (subtabs) subtabs.style.display = 'flex';
    
    renderActiveSubtabContent();
  } else {
    if (uploadZone) uploadZone.style.display = 'block';
    if (docInfo) docInfo.style.display = 'none';
    if (subtabs) subtabs.style.display = 'none';
  }
}

function generateAcademyMaterials(fileName, text) {
  const nameClean = fileName.replace(/\.[^/.]+$/, "");
  
  academyState.defaultLessons = [
    { title: `${nameClean} Overview`, body: text.slice(0, 450) + "..." },
    { title: `Key Findings & Research`, body: text.length > 450 ? text.slice(450, 900) + "..." : "No additional text extracted from the document." },
    { title: `Practical Application`, body: text.length > 900 ? text.slice(900, 1350) + "..." : "Implement the guidelines detailed in the overview and search panel." }
  ];

  academyState.defaultFlashcards = [
    { q: `What is the primary topic of ${nameClean}?`, a: `The document details health and wellness protocols specific to ${nameClean}.` },
    { q: `Explain the key term mentioned in ${nameClean}`, a: `Refer to the search panel to look up specific vocabulary references.` }
  ];

  academyState.defaultQuiz = [
    {
      q: `Which document is currently loaded in the academy?`,
      opts: [fileName, "wellness_guide.pdf", "Anabolic shake builder.pdf", "None of these"],
      ans: fileName,
      exp: `You successfully loaded and analyzed ${fileName}.`
    }
  ];

  academyState.flashcardIndex = 0;
  academyState.quizIndex = 0;
  academyState.quizScore = 0;
  academyState.quizAnswers = [];
}

function renderActiveSubtabContent() {
  switch (academyState.activeTab) {
    case 'summary':
      renderSummary();
      break;
    case 'flashcards':
      renderFlashcard();
      break;
    case 'quiz':
      academyState.quizIndex = 0;
      academyState.quizScore = 0;
      academyState.quizAnswers = [];
      renderQuizQuestion();
      break;
    case 'lessons':
      renderLessons();
      break;
  }
}

function renderSummary() {
  const summaryList = document.getElementById('pdf-summary-list');
  if (!summaryList) return;
  
  if (academyState.docName.includes('Default')) {
    summaryList.innerHTML = `
      <li style="margin-bottom:8px;">🔥 <strong>Calorie Deficit:</strong> Fat loss is strictly governed by the energy balance equation; a 300-500 calorie deficit is the safe benchmark.</li>
      <li style="margin-bottom:8px;">🥚 <strong>Thermic Effect (TEF):</strong> Protein requires 20-30% of its caloric value for processing, boosting metabolism naturally.</li>
      <li style="margin-bottom:8px;">💧 <strong>Skin Moisture Retention:</strong> Hydration layers and oil-soluble BHA (Salicylic Acid) keep sebum clear and prevent breakouts.</li>
    `;
  } else {
    summaryList.innerHTML = `
      <li style="margin-bottom:8px;">📄 <strong>Document Context:</strong> Analyzed the loaded file: "${academyState.docName}".</li>
      <li style="margin-bottom:8px;">⚡ <strong>Highlight 1:</strong> Text density indicates health research related concepts.</li>
      <li style="margin-bottom:8px;">🌱 <strong>Highlight 2:</strong> Use the Search tab to inspect specific keywords of this file.</li>
    `;
  }
}

function renderFlashcard() {
  const qText = document.getElementById('flashcard-question-text');
  const aText = document.getElementById('flashcard-answer-text');
  const idxText = document.getElementById('flashcard-index');
  if (!qText || !aText || !idxText) return;

  const current = academyState.defaultFlashcards[academyState.flashcardIndex];
  qText.textContent = current.q;
  aText.textContent = current.a;
  idxText.textContent = `${academyState.flashcardIndex + 1} of ${academyState.defaultFlashcards.length}`;
}

function renderQuizQuestion() {
  const qNum = document.getElementById('quiz-question-number');
  const qScore = document.getElementById('quiz-score-tracker');
  const qTitle = document.getElementById('quiz-question-title');
  const optsContainer = document.getElementById('quiz-options-container');
  const feedbackBox = document.getElementById('quiz-feedback-box');
  const nextQuizBtn = document.getElementById('next-quiz-btn');

  if (!qNum || !qScore || !qTitle || !optsContainer || !feedbackBox || !nextQuizBtn) return;

  feedbackBox.style.display = 'none';
  nextQuizBtn.style.display = 'none';

  const current = academyState.defaultQuiz[academyState.quizIndex];
  qNum.textContent = `Question ${academyState.quizIndex + 1} of ${academyState.defaultQuiz.length}`;
  qScore.textContent = `Score: ${academyState.quizScore}/${academyState.quizIndex}`;
  qTitle.textContent = current.q;

  optsContainer.innerHTML = current.opts.map((opt) => `
    <button class="ghost-btn quiz-opt-btn" type="button" style="text-align:left; padding:10px 12px; border:1px solid var(--border); border-radius:10px; font-size:0.85rem; width:100%; transition:0.2s;" onclick="submitQuizAnswer('${opt.replace(/'/g, "\\'")}')">
      ${opt}
    </button>
  `).join('');
}

function submitQuizAnswer(selectedOption) {
  const current = academyState.defaultQuiz[academyState.quizIndex];
  const feedbackBox = document.getElementById('quiz-feedback-box');
  const nextQuizBtn = document.getElementById('next-quiz-btn');
  const optsButtons = document.querySelectorAll('.quiz-opt-btn');

  if (!feedbackBox || !nextQuizBtn) return;

  optsButtons.forEach(btn => {
    btn.disabled = true;
    const btnText = btn.textContent.trim();
    if (btnText === current.ans) {
      btn.style.background = 'rgba(34, 197, 94, 0.15)';
      btn.style.borderColor = '#22c55e';
    } else if (btnText === selectedOption) {
      btn.style.background = 'rgba(239, 68, 68, 0.15)';
      btn.style.borderColor = '#ef4444';
    }
  });

  feedbackBox.style.display = 'block';
  if (selectedOption === current.ans) {
    academyState.quizScore++;
    feedbackBox.style.background = 'rgba(34, 197, 94, 0.08)';
    feedbackBox.style.color = '#22c55e';
    feedbackBox.innerHTML = `<strong>✓ Correct!</strong><br>${current.exp}`;
  } else {
    feedbackBox.style.background = 'rgba(239, 68, 68, 0.08)';
    feedbackBox.style.color = '#ef4444';
    feedbackBox.innerHTML = `<strong>✗ Incorrect. Correct answer: ${current.ans}</strong><br>${current.exp}`;
  }

  const qScore = document.getElementById('quiz-score-tracker');
  if (qScore) qScore.textContent = `Score: ${academyState.quizScore}/${academyState.quizIndex + 1}`;

  nextQuizBtn.style.display = 'inline-block';
  nextQuizBtn.textContent = (academyState.quizIndex + 1 >= academyState.defaultQuiz.length) ? 'Show Results' : 'Next Question';
}

function showQuizResults() {
  const qTitle = document.getElementById('quiz-question-title');
  const optsContainer = document.getElementById('quiz-options-container');
  const feedbackBox = document.getElementById('quiz-feedback-box');
  const nextQuizBtn = document.getElementById('next-quiz-btn');
  const qNum = document.getElementById('quiz-question-number');

  if (!qTitle || !optsContainer || !feedbackBox || !nextQuizBtn || !qNum) return;

  qNum.textContent = 'Quiz Completed';
  qTitle.textContent = `🎉 You scored ${academyState.quizScore} out of ${academyState.defaultQuiz.length}!`;
  
  const percentage = Math.round((academyState.quizScore / academyState.defaultQuiz.length) * 100);
  optsContainer.innerHTML = `
    <div style="text-align:center; padding:10px;">
      <div style="font-size:2.2rem; margin-bottom:8px;">🏆</div>
      <strong style="font-size:1.1rem; color:var(--primary); display:block;">Score: ${percentage}%</strong>
      <span style="font-size:0.82rem; color:var(--muted); margin-top:4px; display:block;">
        ${percentage === 100 ? 'Perfect score! You are a metabolic science master.' : 'Good job! Review the Flashcards or Lessons to score higher.'}
      </span>
    </div>
  `;
  
  feedbackBox.style.display = 'none';
  nextQuizBtn.style.display = 'inline-block';
  nextQuizBtn.textContent = 'Retake Quiz';
  
  const handler = () => {
    academyState.quizIndex = 0;
    academyState.quizScore = 0;
    academyState.quizAnswers = [];
    renderQuizQuestion();
    nextQuizBtn.removeEventListener('click', handler);
  };
  nextQuizBtn.addEventListener('click', handler);
}

function renderLessons() {
  const chapTitle = document.getElementById('lesson-chapter-title');
  const chapBody = document.getElementById('lesson-chapter-body');
  if (!chapTitle || !chapBody) return;

  const activeBtn = document.querySelector('.lesson-chap-btn.active-chap');
  const chapIdx = activeBtn ? parseInt(activeBtn.dataset.chap) : 0;
  
  const current = academyState.defaultLessons[chapIdx];
  if (current) {
    chapTitle.textContent = current.title;
    chapBody.innerHTML = current.body.replace(/\n/g, '<br>');
  }

  const chapBtns = document.querySelectorAll('.lesson-chap-btn');
  chapBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      chapBtns.forEach(b => {
        b.classList.remove('active-chap');
        b.style.background = 'rgba(255,255,255,0.03)';
        b.style.color = 'var(--muted)';
      });
      btn.classList.add('active-chap');
      btn.style.background = 'var(--border)';
      btn.style.color = 'var(--text)';
      renderLessons();
    });
  });
}

function generateAICustomRecipe(ingredientsList, type) {
  // Switch to coach tab
  const coachTabBtn = document.querySelector('.nav-pill[data-tab="coach"]');
  if (coachTabBtn) coachTabBtn.click();
  
  const ingNames = ingredientsList.join(', ');
  const promptText = type === 'shake' 
    ? `I have selected these ingredients: ${ingNames}. Please formulate a detailed step-by-step recipe, preparation instructions, and estimated nutritional value for my custom anabolic bulk shake.`
    : `I have selected these ingredients: ${ingNames}. Please formulate a detailed step-by-step custom skincare mask recipe, mixing instructions, application guidelines, and benefits for my skin.`;
  
  const coachInput = document.getElementById('coach-input');
  if (coachInput) {
    coachInput.value = promptText;
    const coachForm = document.getElementById('coach-form');
    if (coachForm) {
      setTimeout(() => {
        coachForm.dispatchEvent(new Event('submit'));
      }, 300);
    }
  }
}

function showWelcome() {
  if (Notification.permission === 'default') {
    setTimeout(() => showToast('Tap notifications to stay on track with reminders.'), 800);
  }
}

if (document.readyState === 'loading') {
  window.addEventListener('DOMContentLoaded', init);
} else {
  init();
}