window.RELIX_GROQ_API_KEY = '';

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

function getNextDueTime(timeStr) {
  const [hours, minutes] = timeStr.split(':').map(Number);
  const target = new Date();
  target.setHours(hours, minutes, 0, 0);
  if (target.getTime() <= Date.now()) {
    target.setDate(target.getDate() + 1);
  }
  return target.getTime();
}

function getRemindersForGoal(goal) {
  if (goal === 'skin') {
    return {
      cleanse: { title: 'Morning Cleanse', description: 'Double cleanse with a gentle wash!', nextDue: getNextDueTime('08:00'), pending: false, lastAction: '', missedCount: 0, followUp: 36000000 },
      sunscreen: { title: 'SPF Shield', description: 'Apply/reapply your SPF 50 sunscreen.', nextDue: getNextDueTime('13:00'), pending: false, lastAction: '', missedCount: 0, followUp: 14400000 },
      acne: { title: 'Acne Treatment', description: 'Apply your Korean skincare serums & acne patches.', nextDue: getNextDueTime('21:00'), pending: false, lastAction: '', missedCount: 0, followUp: 43200000 }
    };
  } else if (goal === 'lose') {
    return {
      water: { title: 'Hydration Nudge', description: 'Sip water to stay full and boost metabolism.', nextDue: getNextDueTime('09:00'), pending: false, lastAction: '', missedCount: 0, followUp: 3600000 },
      portion: { title: 'Portion Control', description: 'Eat slowly. Stop eating when you are 80% full.', nextDue: getNextDueTime('13:30'), pending: false, lastAction: '', missedCount: 0, followUp: 14400000 },
      walk: { title: 'Active Walk', description: 'Take a short 10-minute active walking break.', nextDue: getNextDueTime('18:00'), pending: false, lastAction: '', missedCount: 0, followUp: 14400000 }
    };
  } else {
    return {
      water: { title: 'Hydration Boost', description: 'Drink water to support protein synthesis.', nextDue: getNextDueTime('09:00'), pending: false, lastAction: '', missedCount: 0, followUp: 3600000 },
      shake: { title: 'Calorie Shake', description: 'Time for your high-calorie banana peanut butter shake!', nextDue: getNextDueTime('11:00'), pending: false, lastAction: '', missedCount: 0, followUp: 14400000 },
      diet: { title: 'Protein & calories', description: 'Eat paneer, eggs, chicken, or curd now!', nextDue: getNextDueTime('20:30'), pending: false, lastAction: '', missedCount: 0, followUp: 10800000 }
    };
  }
}

const state = {
  darkMode: localStorage.getItem('relix-dark') === 'true',
  notifications: localStorage.getItem('relix-notify') !== 'false',
  remindersPaused: localStorage.getItem('relix-reminders-paused') === 'true',
  activeTab: 'dashboard',
  profileName: localStorage.getItem('relix-profile-name') || 'Your Name',
  groqKey: localStorage.getItem('relix-groq-key') || '',
  setupComplete: localStorage.getItem('relix-setup') === 'true',
  goalType: localStorage.getItem('relix-goal') || 'muscle',
  age: Number(localStorage.getItem('relix-age') || 22),
  height: localStorage.getItem('relix-height') || "6'1\"",
  weight: Number(localStorage.getItem('relix-weight') || 65),
  targetWeight: Number(localStorage.getItem('relix-target-weight') || 75),
  dietType: localStorage.getItem('relix-diet') || 'nonveg',
  targetCalories: Number(localStorage.getItem('relix-target-cal') || 3000),
  targetProtein: Number(localStorage.getItem('relix-target-pro') || 140),
  consumedCalories: Number(localStorage.getItem('relix-consumed-cal') || 0),
  consumedProtein: Number(localStorage.getItem('relix-consumed-pro') || 0),
  consumedHydration: Number(localStorage.getItem('relix-consumed-hyd') || 0),
  targetHydration: 3500,
  lastLog: JSON.parse(localStorage.getItem('relix-last-log') || 'null'),
  xp: Number(localStorage.getItem('relix-xp') || 0),
  level: Number(localStorage.getItem('relix-level') || 1),
  streak: Number(localStorage.getItem('relix-streak') || 0),
  weekly: Number(localStorage.getItem('relix-weekly') || 0),
  dailyScore: Number(localStorage.getItem('relix-daily-score') || 0),
  lastActivityDate: localStorage.getItem('relix-last-activity') || '',
  recentActivity: JSON.parse(localStorage.getItem('relix-activity-log') || '[]'),
  routineProgress: Number(localStorage.getItem('relix-routine-progress') || 0),
  mealCount: Number(localStorage.getItem('relix-meal-count') || 0),
  dailyMeals: Number(localStorage.getItem('relix-daily-meals') || 0),
  completedTasks: JSON.parse(localStorage.getItem('relix-completed') || '[]'),
  dayStartTime: Number(localStorage.getItem('relix-day-start') || Date.now()),
  restorableStreak: Number(localStorage.getItem('relix-restorable-streak') || -1),
  loggedFoods: JSON.parse(localStorage.getItem('relix-logged-foods') || '[]'),
  profilePic: localStorage.getItem('relix-profile-pic') || '',
  pendingMealImageBase64: '',
  reminders: (() => {
    const saved = JSON.parse(localStorage.getItem('relix-reminder-state') || 'null');
    const goal = localStorage.getItem('relix-goal') || 'muscle';
    const defaults = getRemindersForGoal(goal);
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
let chatMessages = [];
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
  missionBtn: document.getElementById('claim-xp'),
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
  setupGoal: document.getElementById('setup-goal'),
  setupAge: document.getElementById('setup-age'),
  setupHeight: document.getElementById('setup-height'),
  setupWeight: document.getElementById('setup-weight'),
  setupTarget: document.getElementById('setup-target'),
  setupDiet: document.getElementById('setup-diet'),
  finishSetup: document.getElementById('finish-setup'),
  closeSetupModal: document.getElementById('close-setup-modal'),
  calBar: document.getElementById('cal-bar'),
  calText: document.getElementById('cal-text'),
  proBar: document.getElementById('pro-bar'),
  proText: document.getElementById('pro-text'),
  groqInput: document.getElementById('groq-input'),
  saveGroq: document.getElementById('save-groq')
};

function init() {
  applyTheme();
  syncProfileMeta();
  loadKnowledgeBase();
  bindEvents();
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
      if ('serviceWorker' in navigator && 'PushManager' in window) {
        subscribeToPushNotifications(false);
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
  renderMealCounter();
  renderChat();
  registerServiceWorker();
  registerInstallPrompt();
  registerNotifications();
  showWelcome();
  processMissedActions();
  checkDailyReset();

  if ('serviceWorker' in navigator && 'PushManager' in window) {
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
}

function bindEvents() {
  const hardRefreshBtn = document.getElementById('hard-refresh-btn');
  if (hardRefreshBtn) {
    hardRefreshBtn.addEventListener('click', async () => {
      const originalText = hardRefreshBtn.textContent;
      hardRefreshBtn.textContent = '...';
      try {
        await triggerForceResubscribe();
      } catch (err) {}
      hardRefreshBtn.textContent = originalText;
    });
  }

  els.tabs.forEach((tab) => {
    tab.addEventListener('click', () => switchView(tab.dataset.tab));
  });

  els.missionBtn.addEventListener('click', claimDailyMission);
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

  els.mealInput.addEventListener('change', previewMeal);
  els.mealButton.addEventListener('click', analyzeMeal);

  els.installButton.addEventListener('click', async () => {
    if (!installPrompt) return;
    installPrompt.prompt();
    const choice = await installPrompt.userChoice;
    if (choice.outcome === 'accepted') {
      showToast('Relix is ready to live on your home screen.');
    }
  });

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
      const goalVal = els.setupGoal?.value || 'muscle';
      const ageVal = Number(els.setupAge?.value || 22);
      const heightVal = (els.setupHeight?.value || "6'1\"").trim();
      const weightVal = Number(els.setupWeight?.value || 65);
      const targetWeightVal = Number(els.setupTarget?.value || 75);
      const dietVal = els.setupDiet?.value || 'nonveg';

      if (!nameVal) {
        showToast('Please enter your name.');
        return;
      }

      state.profileName = nameVal;
      state.goalType = goalVal;
      state.age = ageVal;
      state.height = heightVal;
      state.weight = weightVal;
      state.targetWeight = targetWeightVal;
      state.dietType = dietVal;
      state.setupComplete = true;

      // Dynamic calculation based on goal
      if (goalVal === 'muscle') {
        state.targetCalories = Math.round(2400 + (weightVal * 10)); // bulking surplus
        state.targetProtein = Math.round(weightVal * 2.2); // high protein
      } else if (goalVal === 'lose') {
        state.targetCalories = Math.max(1500, Math.round(2000 - (weightVal * 2))); // cutting deficit
        state.targetProtein = Math.round(weightVal * 1.8);
      } else { // skin
        state.targetCalories = 2200;
        state.targetProtein = 80;
      }

      // Custom manual overrides
      const customCalVal = document.getElementById('setup-custom-cal')?.value;
      const customProVal = document.getElementById('setup-custom-pro')?.value;
      if (customCalVal) state.targetCalories = Number(customCalVal);
      if (customProVal) state.targetProtein = Number(customProVal);

      // Re-populate goal specific default reminders
      state.reminders = getRemindersForGoal(goalVal);

      saveState();
      syncProfileMeta();
      renderDashboard();
      renderRoutine();
      renderProfile();
      renderChatSuggestions();

      if (els.setupModal) {
        els.setupModal.style.display = 'none';
        els.setupModal.classList.remove('open');
        els.setupModal.setAttribute('aria-hidden', 'true');
      }
      showToast('Profile & goal targets updated successfully!');
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
      
      state.consumedCalories += cals;
      state.consumedProtein += pro;
      state.lastLog = { calories: cals, protein: pro, hydration: 0 };
      state.loggedFoods.push({ name: foodName, calories: cals, protein: pro, timestamp: Date.now() });
      saveState();
      renderDashboard();
      showToast('✅ Logged! No math required.');
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
      saveState();
      renderDashboard();
      showToast(`✅ Added +${val}${type === 'cal' ? ' kcal' : 'g Protein'}!`);
    });
  });

  const resetDailyBtn = document.getElementById('reset-daily-progress');
  if (resetDailyBtn) {
    resetDailyBtn.addEventListener('click', () => {
      if (!confirm("Are you sure you want to reset today's food macro counters?")) return;
      state.consumedCalories = 0;
      state.consumedProtein = 0;
      state.loggedFoods = [];
      saveState();
      renderDashboard();
      showToast('Daily progress reset.');
    });
  }

  const undoLogBtn = document.getElementById('undo-log-btn');
  if (undoLogBtn) {
    undoLogBtn.addEventListener('click', () => {
      if (state.lastLog) {
        state.consumedCalories = Math.max(0, state.consumedCalories - (state.lastLog.calories || 0));
        state.consumedProtein = Math.max(0, state.consumedProtein - (state.lastLog.protein || 0));
        state.lastLog = null;
        state.loggedFoods.pop();
        saveState();
        renderDashboard();
        showToast('🔄 Last log undone!');
      }
    });
  }

  document.querySelectorAll('.log-hydration-btn').forEach(btn => {
    btn.addEventListener('click', (e) => {
      const ml = Number(e.currentTarget.dataset.ml);
      state.consumedHydration += ml;
      state.lastLog = { calories: 0, protein: 0, hydration: ml };
      saveState();
      renderDashboard();
      showToast(`✅ Logged ${ml}ml water!`);
    });
  });

  const resetHydrationBtn = document.getElementById('reset-hydration');
  if (resetHydrationBtn) {
    resetHydrationBtn.addEventListener('click', () => {
      if (!confirm("Are you sure you want to reset today's hydration progress?")) return;
      state.consumedHydration = 0;
      saveState();
      renderDashboard();
      showToast('Hydration reset.');
    });
  }

  const undoHydrationBtn = document.getElementById('undo-hydration-btn');
  if (undoHydrationBtn) {
    undoHydrationBtn.addEventListener('click', () => {
      if (state.lastLog) {
        state.consumedHydration = Math.max(0, state.consumedHydration - (state.lastLog.hydration || 0));
        state.lastLog = null;
        saveState();
        renderDashboard();
        showToast('🔄 Last log undone!');
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
          state.consumedCalories += localEst.calories;
          state.consumedProtein += localEst.protein;
          state.lastLog = { calories: localEst.calories, protein: localEst.protein, hydration: 0 };
          state.loggedFoods.push({ name: foodItem, calories: localEst.calories, protein: localEst.protein, timestamp: Date.now() });
          saveState();
          renderDashboard();
          showToast(`✅ Logged: ${localEst.calories} kcal & ${localEst.protein}g protein! (Offline)`);
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

  if (els.saveGroq) {
    els.saveGroq.addEventListener('click', () => {
      state.groqKey = els.groqInput.value.trim();
      saveState();
      showToast('Groq API Key saved.');
    });
  }

  // Backend Timer Controls
  const waterStart = document.getElementById('server-water-start');
  const waterStop = document.getElementById('server-water-stop');
  const testStart = document.getElementById('server-test-start');
  const testStop = document.getElementById('server-test-stop');

  if (waterStart) waterStart.addEventListener('click', () => { fetch(`${BACKEND_URL}/api/push/water/start`, { method: 'POST' }); showToast('45m water loop started!'); });
  if (waterStop) waterStop.addEventListener('click', () => { fetch(`${BACKEND_URL}/api/push/water/stop`, { method: 'POST' }); showToast('Water loop stopped.'); });
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
        if (els.setupGoal) els.setupGoal.value = state.goalType;
        if (els.setupAge) els.setupAge.value = state.age;
        if (els.setupHeight) els.setupHeight.value = state.height;
        if (els.setupWeight) els.setupWeight.value = state.weight;
        if (els.setupTarget) els.setupTarget.value = state.targetWeight;
        if (els.setupDiet) els.setupDiet.value = state.dietType;

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

  if (nutritionCard && skincareCard) {
    if (state.goalType === 'skin') {
      nutritionCard.style.display = 'none';
      skincareCard.style.display = 'flex';
      
      const hydPercent = Math.min(100, Math.round((state.consumedHydration / state.targetHydration) * 100)) || 0;
      const hydBar = document.getElementById('hydration-bar');
      const hydText = document.getElementById('hydration-text');
      if (hydBar) hydBar.style.width = `${hydPercent}%`;
      if (hydText) hydText.textContent = `${state.consumedHydration} / ${state.targetHydration} ml (${hydPercent}%)`;

      if (undoHydrationBtn) undoHydrationBtn.style.display = state.lastLog ? 'inline-block' : 'none';
      if (undoLogBtn) undoLogBtn.style.display = 'none';
    } else {
      nutritionCard.style.display = 'flex';
      skincareCard.style.display = 'none';

      if (undoLogBtn) undoLogBtn.style.display = state.lastLog ? 'inline-block' : 'none';
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

  renderReminders();
}

function renderCloseTheGap() {
  const gapContainer = document.getElementById('gap-analytics');
  if (!gapContainer) return;

  const leftCal = Math.max(0, state.targetCalories - state.consumedCalories);
  const leftPro = Math.max(0, state.targetProtein - state.consumedProtein);

  let html = '';
  
  if (state.goalType === 'skin') {
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
    if (leftCal === 0) {
      html = `
        <div style="text-align:center; padding:12px; background:rgba(22,163,74,0.08); border-radius:16px;">
          <strong style="color:#16a34a; font-size:1.1rem; display:block;">🎉 Deficit targets hit!</strong>
          <span style="font-size:0.85rem; color:var(--muted);">Drink black coffee, green tea, or warm water if you feel late cravings.</span>
        </div>
      `;
    } else {
      html = `
        <div style="display:flex; justify-content:space-between; font-size:0.9rem; margin-bottom:8px;">
          <span>Calories Remaining: <strong>${leftCal} kcal</strong></span>
          <span>Protein Remaining: <strong>${leftPro} g</strong></span>
        </div>
        <div style="font-size:0.85rem; color:var(--muted); line-height:1.4;">
          <strong style="color:var(--text); display:block; margin-bottom:4px;">Low-calorie suggestions to close the gap:</strong>
          <div style="display:grid; grid-template-columns:1fr; gap:6px;">
            <div style="background:rgba(17,17,17,0.03); padding:8px 12px; border-radius:12px; border:1px solid var(--border); display:flex; justify-content:space-between; align-items:center;">
              <div>🥚 <strong>3 Boiled Egg Whites</strong>: ~50 kcal | 12g protein</div>
              <button class="primary-btn log-suggested-btn" data-cal="50" data-pro="12" type="button" style="font-size:0.75rem; padding:6px 10px; border-radius:8px; line-height:1; border:none; box-shadow:none;">+ Log</button>
            </div>
            <div style="background:rgba(17,17,17,0.03); padding:8px 12px; border-radius:12px; border:1px solid var(--border); display:flex; justify-content:space-between; align-items:center;">
              <div>🥗 <strong>Cucumber & Curd Salad (200g)</strong>: ~110 kcal | 8g protein</div>
              <button class="primary-btn log-suggested-btn" data-cal="110" data-pro="8" type="button" style="font-size:0.75rem; padding:6px 10px; border-radius:8px; line-height:1; border:none; box-shadow:none;">+ Log</button>
            </div>
            <div style="background:rgba(17,17,17,0.03); padding:8px 12px; border-radius:12px; border:1px solid var(--border); display:flex; justify-content:space-between; align-items:center;">
              <div>🍗 <strong>Grilled Breast Chicken (150g)</strong>: ~165 kcal | 31g protein</div>
              <button class="primary-btn log-suggested-btn" data-cal="165" data-pro="31" type="button" style="font-size:0.75rem; padding:6px 10px; border-radius:8px; line-height:1; border:none; box-shadow:none;">+ Log</button>
            </div>
          </div>
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
      state.consumedCalories += cal;
      state.consumedProtein += pro;
      state.lastLog = { calories: cal, protein: pro, hydration: 0 };
      saveState();
      renderDashboard();
      showToast(`✅ Logged suggested food (+${cal} kcal, +${pro}g Pro)!`);
    });
  });
}

function renderRoutine() {
  let habits = [];
  if (state.goalType === 'skin') {
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
  els.routineProgress.parentElement.querySelector('.tracker-copy').textContent = `${doneCount} of ${habits.length} complete · ${percent}%`;
}

function renderProfile() {
  document.getElementById('profile-xp').textContent = state.xp;
  document.getElementById('profile-level').textContent = state.level;
  document.getElementById('profile-streak').textContent = state.streak;
  syncProfileMeta();
  renderProfilePicture();
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
  if (state.goalType === 'skin') {
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
  chatMessages = [
    { role: 'assistant', text: 'I can guide you with nutrition, sleep, movement, and recovery. Ask me something health-focused.' }
  ];
  renderMessages();
  renderChatSuggestions();
}

function renderMessages() {
  els.chatMessages.innerHTML = chatMessages.map((message) => `
    <div class="message ${message.role}">
      <div>${message.text}</div>
    </div>
  `).join('');
  els.chatMessages.scrollTop = els.chatMessages.scrollHeight;
}

function switchView(target) {
  state.activeTab = target;
  els.sections.forEach((section) => section.classList.toggle('active', section.dataset.view === target));
  els.tabs.forEach((tab) => tab.classList.toggle('active', tab.dataset.tab === target));
}

function claimDailyMission() {
  state.completedTasks.push('daily-mission');
  recordActivity('Daily mission completed', 80);
  createConfetti();
  showToast('Daily mission claimed. +80 XP');
}

function toggleHabit(event) {
  const index = Number(event.target.dataset.index);
  if (event.target.checked) {
    if (!state.completedTasks.includes(index)) state.completedTasks.push(index);
    recordActivity('Routine completed', 20);
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
  const blocked = ['politics', 'sports', 'movies', 'programming', 'relationships', 'finance'];
  if (blocked.some((item) => trimmed.includes(item))) {
    chatMessages.push({ role: 'assistant', text: 'I only answer health and wellness questions. I can help with nutrition, recovery, sleep, movement, and general wellbeing.' });
    renderMessages();
    return;
  }

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
        chatMessages.push({ role: 'assistant', text: result.reply });
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

    fetch(`${BACKEND_URL}/api/push/schedule`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        key: schedule.key || 'coach-nag',
        title: schedule.title || 'Relix Coach',
        body: schedule.body || 'Time to complete your goal!',
        dueAt: targetDate.getTime()
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
  } catch (err) {
    console.error('[coach] Failed to schedule reminder:', err);
  }
}

async function getCoachReply(message) {
  if (!state.groqKey) {
    return 'Please set your Groq API Key in the Profile tab so I can analyze your food and track your macros!';
  }

  const now = new Date();
  const timeOpts = { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit', hour12: false };
  const deviceLocalTime = now.toLocaleString('en-US', timeOpts);

  // Prepare a dynamic description of today's logged foods
  const loggedFoodsStr = state.loggedFoods.length > 0 
    ? state.loggedFoods.map(f => `• ${f.name} (${f.calories} kcal, ${f.protein}g protein)`).join('\n')
    : 'No foods logged yet today.';

  const systemInstruction = `You are a strict, helpful Indian fitness & wellness coach helping ${state.profileName}, a ${state.age}yo, ${state.weight}kg user with target weight ${state.targetWeight}kg.
  Their height is ${state.height} and diet preference is: ${state.dietType}.
  Their active focus is: ${state.goalType === 'muscle' ? 'Weight/Muscle Gain (Bulking)' : state.goalType === 'lose' ? 'Weight Loss/Tone' : 'Korean Skincare & Hydration'}.
  Today they consumed ${state.consumedCalories} / ${state.targetCalories} kcal and ${state.consumedProtein} / ${state.targetProtein}g protein.
  
  The user's current local device clock is: ${deviceLocalTime}.
  Use this clock time as your absolute source of truth when user talks about timing (e.g. "in 30 mins", "tonight", "at 9 PM").
  
  Today's logged foods so far:
  ${loggedFoodsStr}
  
  CRITICAL LOGGING & CLARIFICATION RULE:
  - If the user states they ate a food (e.g. "I had a burger", "I ate kebabs", "logging pizza"), if the details are vague (missing brand like KFC/McDonald's/Homemade, or size/portion like leg piece vs palm size, or preparation style like oily vs grilled):
    1. Do NOT log the macros yet. Return 0 for "calories" and "protein" in the JSON properties.
    2. In your "reply", ask exactly 1 or 2 specific, friendly clarifying questions to get the details (e.g., "Was it KFC, McDonald's, or homemade?", "Was the kebab piece larger or smaller than your palm?", "Was it oily or grilled?").
    3. Keep it brief and non-annoying, but make the user feel that a precise, high-quality calculation is happening.
  - If the user provides details or answers your questions (e.g. "it was homemade", "smaller than my palm", "KFC"), calculate the exact calories, protein, carbs, and fats (break down good vs bad fats, brand factors, and oiliness in your "reply"). Include these exact numbers in your coaching response and set non-zero values in the JSON fields.
  - If the user explicitly asks to cancel or remove a logged food (e.g., "Remove biryani", "Cancel my last meal", "Remove burger from my log"), or cancel a self-logged item:
    1. Set the "calories" and "protein" to negative values corresponding to the food to subtract them (e.g. calories: -350, protein: -10).
    2. Set "removeFood" in JSON to the name of the food to remove (e.g. "biryani").
    3. State in your reply that the food has been removed.
  - If the user asks "What all did I have today?" or "Give me a protein breakdown", output a list of their logged foods from today with their estimated protein, carbs, and fats, and return 0 calories and 0 protein.
  - ONLY return non-zero "calories" and "protein" if the user explicitly states they ate, drank, had, or are logging the food right now. Return 0 if it is just a general question about a food (e.g., "how many calories in biryani?").
  
  Reply strictly in JSON format with NO markdown formatting:
  {
    "reply": "Your coaching response here",
    "calories": Number,  // calories to add (positive) or subtract (negative), or 0
    "protein": Number,   // protein to add (positive) or subtract (negative), or 0
    "logFood": "Name of food being added (e.g. KFC Burger)" or null,
    "removeFood": "Name of food being removed (e.g. biryani)" or null,
    "schedule": null     // or schedule object if they ask for a reminder
  }`;

  // Take the last 6 messages from the rolling history to feed as context
  const lastFewMessages = chatMessages.slice(-6).map(m => ({
    role: m.role === 'user' ? 'user' : 'assistant',
    content: m.text
  }));

  try {
    const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${state.groqKey}`
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

    const textRes = data.choices[0].message.content.trim();
    const result = JSON.parse(textRes);

    // Apply macro updates based on LLM JSON output
    if (result.calories || result.protein) {
      state.consumedCalories = Math.max(0, state.consumedCalories + (result.calories || 0));
      state.consumedProtein = Math.max(0, state.consumedProtein + (result.protein || 0));
      state.lastLog = { calories: result.calories || 0, protein: result.protein || 0, hydration: 0 };
    }

    // Manage today's logged foods list
    if (result.removeFood) {
      const targetName = result.removeFood.toLowerCase();
      const idx = state.loggedFoods.findIndex(f => f.name.toLowerCase().includes(targetName));
      if (idx !== -1) {
        state.loggedFoods.splice(idx, 1);
      }
    } else if (result.logFood && (result.calories > 0 || result.protein > 0)) {
      state.loggedFoods.push({
        name: result.logFood,
        calories: result.calories || 0,
        protein: result.protein || 0,
        timestamp: Date.now()
      });
    }

    saveState();
    renderDashboard();

    return result;
  } catch (e) {
    console.error(e);
    return 'I had trouble processing that. Make sure your Groq API key is correct.';
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

let lastVisionResult = null;

function previewMeal(event) {
  const file = event.target.files?.[0];
  if (!file) return;
  if (!file.type.startsWith('image/')) {
    els.mealStatus.textContent = 'Please upload an image file.';
    return;
  }

  const reader = new FileReader();
  reader.onload = () => {
    els.mealPreview.innerHTML = `<img src="${reader.result}" alt="Selected meal preview">`;
    els.mealStatus.textContent = 'Image loaded. Tap analyze to see real AI analysis.';
    state.pendingMealImageBase64 = reader.result;
    
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
  if (!state.groqKey) {
    els.mealStatus.textContent = 'Please enter your Groq API Key in the Profile tab first!';
    return;
  }

  els.mealStatus.textContent = 'Analyzing image with Groq Vision Model (Llama 3.2)...';
  els.mealButton.disabled = true;

  const resultCard = document.getElementById('meal-result-card');
  const resultTitle = document.getElementById('meal-result-title');
  const resultDesc = document.getElementById('meal-result-desc');
  const nutritionGrid = document.getElementById('meal-nutrition-grid');
  const logBtn = document.getElementById('log-meal-btn');

  if (resultCard) {
    resultCard.style.display = 'flex';
    resultTitle.textContent = 'Analyzing plate...';
    resultDesc.textContent = 'Determining nutritional composition and classification.';
    nutritionGrid.style.display = 'none';
    logBtn.style.display = 'none';
  }

  const visionPrompt = `Analyze this image. You must identify if it is a food item, a human being, an animal (dog, cat, bird, etc.), or an inanimate object.
  
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
    "analysisText": "A detailed description of the food, estimated ingredients, why it got this rating, and a question: 'Did you eat this? Tap Log to add to your daily totals!'",
    
    // IF HUMAN:
    "analysisText": "I don't know about others, but you definitely seem a treat to me! Hotness rating: 100/100, rating high on protein! You look absolutely fabulous and healthy today.",
    
    // IF ANIMAL:
    "analysisText": "Aww, look at this cute animal! Cuteness rating: 100/100! Truly a pure soul that deserves all the treats.",
    
    // IF INANIMATE OBJECT:
    "analysisText": "This is an interesting object! Witty, funny caption about what this object might do if it was alive."
  }`;

  try {
    const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${state.groqKey}`
      },
      body: JSON.stringify({
        model: 'llama-3.2-11b-vision-preview',
        messages: [
          {
            role: 'user',
            content: [
              { type: 'text', text: visionPrompt },
              { type: 'image_url', image_url: { url: state.pendingMealImageBase64 } }
            ]
          }
        ],
        response_format: { type: "json_object" }
      })
    });

    const data = await response.json();
    if (data.error) throw new Error(data.error.message);

    const textRes = data.choices[0].message.content.trim();
    const result = JSON.parse(textRes);
    lastVisionResult = result;

    els.mealStatus.textContent = 'Analysis complete.';
    
    if (result.type === 'food') {
      resultTitle.textContent = `🍕 ${result.foodName || 'Estimated Food'}`;
      resultDesc.textContent = result.analysisText;
      
      document.getElementById('meal-cal-val').textContent = result.calories || 0;
      document.getElementById('meal-pro-val').textContent = `${result.protein || 0}g`;
      document.getElementById('meal-carb-val').textContent = `${result.carbs || 0}g`;
      document.getElementById('meal-fat-val').textContent = `${result.fat || 0}g`;
      
      nutritionGrid.style.display = 'grid';
      logBtn.style.display = 'block';
    } else if (result.type === 'human') {
      resultTitle.textContent = '👤 Human Detected!';
      resultDesc.textContent = result.analysisText;
      nutritionGrid.style.display = 'none';
      logBtn.style.display = 'none';
    } else if (result.type === 'animal') {
      resultTitle.textContent = '🐾 Animal Detected!';
      resultDesc.textContent = result.analysisText;
      nutritionGrid.style.display = 'none';
      logBtn.style.display = 'none';
    } else {
      resultTitle.textContent = '📦 Object Detected!';
      resultDesc.textContent = result.analysisText;
      nutritionGrid.style.display = 'none';
      logBtn.style.display = 'none';
    }
  } catch (err) {
    console.error(err);
    els.mealStatus.textContent = 'Failed to analyze. Please check your API key and connection.';
    resultTitle.textContent = 'Analysis Failed';
    resultDesc.textContent = 'Verify your Groq API key is correct and try again.';
  } finally {
    els.mealButton.disabled = false;
  }
}

function logVisionMeal() {
  if (lastVisionResult && lastVisionResult.type === 'food') {
    const cals = lastVisionResult.calories || 0;
    const pro = lastVisionResult.protein || 0;

    state.consumedCalories += cals;
    state.consumedProtein += pro;
    state.dailyMeals += 1;
    state.lastLog = { calories: cals, protein: pro, hydration: 0 };
    
    state.loggedFoods.push({
      name: lastVisionResult.foodName,
      calories: cals,
      protein: pro,
      timestamp: Date.now()
    });

    saveState();
    renderDashboard();
    recordActivity(`Meal logged: ${lastVisionResult.foodName}`, 25);
    renderMealCounter();
    
    showToast(`✅ Logged ${lastVisionResult.foodName} (+${cals} kcal, +${pro}g Pro)!`);
    
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
  subscribeToPushNotifications();
  showToast('Notifications enabled.');
  showNotification('Notifications Started', 'You will now receive check-ins here.', 'welcome');
}

function isIOSDevice() {
  return /iPad|iPhone|iPod/.test(navigator.userAgent) && !window.MSStream;
}

function isStandalonePWA() {
  return window.matchMedia('(display-mode: standalone)').matches || window.navigator.standalone === true;
}

function urlBase64ToUint8Array(base64String) {
  const padding = '='.repeat((4 - base64String.length % 4) % 4);
  const base64 = (base64String + padding).replace(/\-/g, '+').replace(/_/g, '/');
  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);
  for (let i = 0; i < rawData.length; ++i) { outputArray[i] = rawData.charCodeAt(i); }
  return outputArray;
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

  try {
    if (debug) showToast('Fetching VAPID key...');
    const reg = await navigator.serviceWorker.register('./service-worker.js');
    const vapidRes = await fetch(`${BACKEND_URL}/api/push/vapid-public-key`);
    if (!vapidRes.ok) throw new Error('Could not reach backend for VAPID key.');
    const vapidPublicKey = (await vapidRes.text()).trim();
    const applicationServerKey = urlBase64ToUint8Array(vapidPublicKey);

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
      body: JSON.stringify({ subscription })
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
    subscribeToPushNotifications(); // ALWAYS sync with backend on boot
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

  // Client setTimeout only fires while this tab/app is open. Mirror the same
  // due time to the backend (keyed by reminder key, so re-opening the app
  // just REPLACES the pending schedule instead of stacking duplicate pushes)
  // so a real push still arrives on the lock screen even if the phone is
  // locked or the app is fully closed.
  if (state.notifications && !state.remindersPaused) {
    fetch(`${BACKEND_URL}/api/push/schedule`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        key,
        title: `Relix · ${reminder.title}`,
        body: reminder.description,
        dueAt: reminder.nextDue
      })
    }).catch(() => { });
  }
}

function cancelServerReminders() {
  Object.keys(defaultReminders).forEach((key) => {
    fetch(`${BACKEND_URL}/api/push/cancel`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ key })
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
    icon: 'icons/icon-192.svg',
    badge: 'icons/icon-192.svg',
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

function registerServiceWorker() {
  if ('serviceWorker' in navigator) {
    navigator.serviceWorker.register('./service-worker.js').catch(() => { });
  }
}

function registerInstallPrompt() {
  window.addEventListener('beforeinstallprompt', (event) => {
    event.preventDefault();
    installPrompt = event;
    els.installButton.classList.add('visible');
    updateActionButtons();
    if (els.installCta) els.installCta.textContent = 'Install now';
  });

  window.addEventListener('appinstalled', () => {
    closeInstallPrompt();
    showToast('Installed to your device.');
  });

  // Removed auto-showing install prompt instructions as requested
}

function showInstallPrompt() {
  if (!els.installModal) return;
  const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent) && !window.MSStream;
  if (isIOS) {
    if (els.installModalTitle) els.installModalTitle.textContent = 'Add to Home Screen';
    if (els.installModalCopy) els.installModalCopy.textContent = 'Tap the Share button and choose Add to Home Screen to install Relix on your iPhone.';
    if (els.installModalAction) els.installModalAction.textContent = 'Open instructions';
  } else if (installPrompt) {
    if (els.installModalTitle) els.installModalTitle.textContent = 'Install Relix';
    if (els.installModalCopy) els.installModalCopy.textContent = 'Install Relix to your device for a faster app-like experience.';
    if (els.installModalAction) els.installModalAction.textContent = 'Install now';
  } else {
    if (els.installModalTitle) els.installModalTitle.textContent = 'Install Relix';
    if (els.installModalCopy) els.installModalCopy.textContent = 'Use your browser menu to install Relix on this device.';
    if (els.installModalAction) els.installModalAction.textContent = 'Use browser menu';
  }
  els.installModal.classList.add('open');
  els.installModal.setAttribute('aria-hidden', 'false');
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
  showToast('Use your browser menu to install Relix on this device.');
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
  localStorage.removeItem('relix-profile-pic');
  window.location.reload();
}

function updateConnectionStatus() {
  const statusEl = document.getElementById('connection-status');
  if (!statusEl) return;
  if (navigator.onLine) {
    statusEl.className = 'status-badge online';
    statusEl.style.background = 'rgba(34,197,94,0.1)';
    statusEl.style.color = '#22c55e';
    statusEl.innerHTML = `<span class="dot" style="width:8px; height:8px; border-radius:50%; background:#22c55e; display:inline-block;"></span>Online`;
  } else {
    statusEl.className = 'status-badge offline';
    statusEl.style.background = 'rgba(239,68,68,0.1)';
    statusEl.style.color = '#ef4444';
    statusEl.innerHTML = `<span class="dot" style="width:8px; height:8px; border-radius:50%; background:#ef4444; display:inline-block;"></span>Offline`;
  }
}

function checkDailyReset() {
  const resetInterval = 24 * 60 * 60 * 1000; // 24 hours
  const warningInterval = 23 * 60 * 60 * 1000; // 23 hours
  const now = Date.now();
  const elapsed = now - state.dayStartTime;

  renderStreakBanner();

  if (elapsed >= resetInterval) {
    let progress = 0;
    if (state.goalType === 'skin') {
      progress = state.targetHydration > 0 ? (state.consumedHydration / state.targetHydration) : 1;
    } else {
      const calProg = state.targetCalories > 0 ? (state.consumedCalories / state.targetCalories) : 1;
      const proProg = state.targetProtein > 0 ? (state.consumedProtein / state.targetProtein) : 1;
      progress = (calProg + proProg) / 2;
    }

    if (progress < 0.8) {
      state.restorableStreak = state.streak;
      state.streak = 0;
      showToast('⚠️ Benchmark missed. Streak reset to 0!');
    } else {
      state.streak += 1;
      state.restorableStreak = -1;
      showToast('🎉 Day target complete! Streak incremented!');
    }

    state.consumedCalories = 0;
    state.consumedProtein = 0;
    state.consumedHydration = 0;
    state.dailyMeals = 0;
    state.completedTasks = [];
    state.loggedFoods = [];
    state.dayStartTime = now;
    saveState();

    scheduleResetWarningNotification(now + warningInterval);

    renderDashboard();
    renderRoutine();
    renderProfile();
    renderStreakBanner();
  } else {
    const warningTime = state.dayStartTime + warningInterval;
    if (now < warningTime) {
      scheduleResetWarningNotification(warningTime);
    }
  }
}

function scheduleResetWarningNotification(dueTime) {
  if (state.notifications && !state.remindersPaused) {
    fetch(`${BACKEND_URL}/api/push/schedule`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        key: 'daily-reset-warning',
        title: 'Relix Companion',
        body: 'Please complete your count before it resets!',
        dueAt: dueTime
      })
    }).catch(() => { });
  }
}

function renderStreakBanner() {
  const banner = document.getElementById('streak-restore-banner');
  if (!banner) return;
  if (state.restorableStreak > 0) {
    banner.style.display = 'flex';
    const textSpan = banner.querySelector('span');
    if (textSpan) textSpan.textContent = `⚠️ Streak lost! benchmark not met. (Previous: ${state.restorableStreak})`;
  } else {
    banner.style.display = 'none';
  }
}

function restoreStreak() {
  if (state.restorableStreak > 0) {
    state.streak = state.restorableStreak;
    state.restorableStreak = -1;
    saveState();
    renderDashboard();
    renderProfile();
    renderStreakBanner();
    showToast('🔄 Streak restored!');
    createConfetti();
  }
}

function saveState() {
  localStorage.setItem('relix-setup', String(state.setupComplete));
  localStorage.setItem('relix-groq-key', state.groqKey);
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
  localStorage.setItem('relix-daily-meals', String(state.dailyMeals));
  localStorage.setItem('relix-completed', JSON.stringify(state.completedTasks));
  localStorage.setItem('relix-day-start', String(state.dayStartTime));
  localStorage.setItem('relix-restorable-streak', String(state.restorableStreak));
  localStorage.setItem('relix-logged-foods', JSON.stringify(state.loggedFoods));
  localStorage.setItem('relix-profile-pic', state.profilePic);
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
  state.xp += points;
  state.level = 1 + Math.floor(state.xp / 250);
  state.weekly = Math.min(100, Math.round(20 + state.xp / 10 + state.streak * 2));
  state.dailyScore = Math.min(100, Math.round(40 + state.completedTasks.length * 8 + state.dailyMeals * 5 + state.streak * 3));
  state.recentActivity.unshift({ label, time: new Date().toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' }) });
  state.recentActivity = state.recentActivity.slice(0, 5);
  saveState();
  renderDashboard();
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
  const toast = document.createElement('div');
  toast.className = 'toast';
  toast.textContent = message;
  document.body.appendChild(toast);
  setTimeout(() => toast.remove(), 1800);
}

function showWelcome() {
  if (Notification.permission === 'default') {
    setTimeout(() => showToast('Tap notifications to stay on track with reminders.'), 800);
  }
}

window.addEventListener('DOMContentLoaded', init);