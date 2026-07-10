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

function getRemindersForGoal(goal) {
  if (goal === 'skin') {
    return {
      cleanse: { title: 'Morning Cleanse', description: 'Double cleanse with a gentle wash!', nextDue: Date.now() + 60000, pending: false, lastAction: '', missedCount: 0, followUp: 36000000 },
      sunscreen: { title: 'SPF Shield', description: 'Apply/reapply your SPF 50 sunscreen.', nextDue: Date.now() + 120000, pending: false, lastAction: '', missedCount: 0, followUp: 14400000 },
      acne: { title: 'Acne Treatment', description: 'Apply your Korean skincare serums & acne patches.', nextDue: Date.now() + 180000, pending: false, lastAction: '', missedCount: 0, followUp: 43200000 }
    };
  } else if (goal === 'lose') {
    return {
      water: { title: 'Hydration Nudge', description: 'Sip water to stay full and boost metabolism.', nextDue: Date.now() + 60000, pending: false, lastAction: '', missedCount: 0, followUp: 3600000 },
      portion: { title: 'Portion Control', description: 'Eat slowly. Stop eating when you are 80% full.', nextDue: Date.now() + 120000, pending: false, lastAction: '', missedCount: 0, followUp: 14400000 },
      walk: { title: 'Active Walk', description: 'Take a short 10-minute active walking break.', nextDue: Date.now() + 180000, pending: false, lastAction: '', missedCount: 0, followUp: 14400000 }
    };
  } else {
    return {
      water: { title: 'Hydration Boost', description: 'Drink water to support protein synthesis.', nextDue: Date.now() + 60000, pending: false, lastAction: '', missedCount: 0, followUp: 3600000 },
      shake: { title: 'Calorie Shake', description: 'Time for your high-calorie banana peanut butter shake!', nextDue: Date.now() + 120000, pending: false, lastAction: '', missedCount: 0, followUp: 14400000 },
      diet: { title: 'Protein & calories', description: 'Eat paneer, eggs, chicken, or curd now!', nextDue: Date.now() + 180000, pending: false, lastAction: '', missedCount: 0, followUp: 10800000 }
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
      if ('serviceWorker' in navigator && 'PushManager' in window) {
        subscribeToPushNotifications(false);
      }
    }
  });
  window.addEventListener('focus', () => initializeReminderSystem());
  window.addEventListener('online', () => initializeReminderSystem());
  renderRoutine();
  renderProfile();
  renderMealCounter();
  renderChat();
  registerServiceWorker();
  registerInstallPrompt();
  registerNotifications();
  showWelcome();
  processMissedActions();

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

      // Re-populate goal specific default reminders
      state.reminders = getRemindersForGoal(goalVal);

      saveState();
      syncProfileMeta();
      renderDashboard();
      renderRoutine();
      renderProfile();

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
      let cals = 0, pro = 0;
      if (food === 'dal') { cals = 350; pro = 10; }
      else if (food === 'burger') { cals = 500; pro = 15; }
      else if (food === 'coffee') { cals = 100; pro = 2; }
      else if (food === 'chai') { cals = 150; pro = 3; }
      
      state.consumedCalories += cals;
      state.consumedProtein += pro;
      saveState();
      renderDashboard();
      showToast('✅ Logged! No math required.');
    });
  });

  const resetDailyBtn = document.getElementById('reset-daily-progress');
  if (resetDailyBtn) {
    resetDailyBtn.addEventListener('click', () => {
      state.consumedCalories = 0;
      state.consumedProtein = 0;
      saveState();
      renderDashboard();
      showToast('Daily progress reset.');
    });
  }

  document.querySelectorAll('.log-hydration-btn').forEach(btn => {
    btn.addEventListener('click', (e) => {
      const ml = Number(e.currentTarget.dataset.ml);
      state.consumedHydration += ml;
      saveState();
      renderDashboard();
      showToast(`✅ Logged ${ml}ml water!`);
    });
  });

  const resetHydrationBtn = document.getElementById('reset-hydration');
  if (resetHydrationBtn) {
    resetHydrationBtn.addEventListener('click', () => {
      state.consumedHydration = 0;
      saveState();
      renderDashboard();
      showToast('Hydration reset.');
    });
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
          const dummyCals = 300 + Math.floor(Math.random() * 200);
          const dummyPro = 10 + Math.floor(Math.random() * 15);
          state.consumedCalories += dummyCals;
          state.consumedProtein += dummyPro;
          saveState();
          renderDashboard();
          showToast(`✅ Logged ${dummyCals} kcal! (Mock)`);
        } else {
          const reply = await getCoachReply(foodItem);
          showToast(reply.includes('trouble processing') ? 'Error logging food. Check API key.' : '✅ Custom food logged!');
        }
      } catch (err) {
        showToast('Error logging food.');
      }
      
      btn.textContent = originalText;
      btn.disabled = false;
      customFoodInput.value = '';
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
    els.calText.textContent = `${state.consumedCalories} / ${state.targetCalories} kcal`;
    els.proText.textContent = `${state.consumedProtein} / ${state.targetProtein} g`;
  }

  const nutritionCard = document.getElementById('nutrition-overview-card');
  const skincareCard = document.getElementById('skincare-overview-card');
  if (nutritionCard && skincareCard) {
    if (state.goalType === 'skin') {
      nutritionCard.style.display = 'none';
      skincareCard.style.display = 'flex';
      
      const hydPercent = Math.min(100, Math.round((state.consumedHydration / state.targetHydration) * 100)) || 0;
      const hydBar = document.getElementById('hydration-bar');
      const hydText = document.getElementById('hydration-text');
      if (hydBar) hydBar.style.width = `${hydPercent}%`;
      if (hydText) hydText.textContent = `${state.consumedHydration} / ${state.targetHydration} ml`;
    } else {
      nutritionCard.style.display = 'flex';
      skincareCard.style.display = 'none';
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
            <div style="background:rgba(17,17,17,0.03); padding:8px 12px; border-radius:12px; border:1px solid var(--border);">
              🥚 <strong>3 Boiled Egg Whites</strong>: ~50 kcal | 12g protein
            </div>
            <div style="background:rgba(17,17,17,0.03); padding:8px 12px; border-radius:12px; border:1px solid var(--border);">
              🥗 <strong>Cucumber & Curd Salad (200g)</strong>: ~110 kcal | 8g protein
            </div>
            <div style="background:rgba(17,17,17,0.03); padding:8px 12px; border-radius:12px; border:1px solid var(--border);">
              🍗 <strong>Grilled Breast Chicken (150g)</strong>: ~165 kcal | 31g protein
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
            <div style="background:rgba(17,17,17,0.03); padding:8px 12px; border-radius:12px; border:1px solid var(--border); line-height: 1.45;">
              🥤 <strong>Hardgainer Banana Peanut Shake</strong>: (~730 kcal | 23g protein)
              <div style="font-size:0.75rem; margin-top:4px; padding-left:8px; border-left:2px solid var(--primary); color:var(--muted);">
                • Full cream milk (250ml): 150 kcal / 8g pro<br>
                • 2 Bananas: 200 kcal / 2g pro<br>
                • Oats (50g): 190 kcal / 6g pro<br>
                • Peanut Butter (2 tbsp): 190 kcal / 7g pro
              </div>
            </div>
            <div style="background:rgba(17,17,17,0.03); padding:8px 12px; border-radius:12px; border:1px solid var(--border);">
              🍳 <strong>4 Whole Eggs + Toast</strong>: 4 eggs cooked with butter + 2 slices of bread (~550 kcal | 24g protein)
            </div>
            <div style="background:rgba(17,17,17,0.03); padding:8px 12px; border-radius:12px; border:1px solid var(--border);">
              🧀 <strong>200g Paneer/Tofu Bhurji</strong>: Sautéed paneer in ghee (~380 kcal | 36g protein)
            </div>
            <div style="background:rgba(17,17,17,0.03); padding:8px 12px; border-radius:12px; border:1px solid var(--border);">
              🥛 <strong>Full Cream Dahi (250g)</strong>: ~160 kcal | 10g protein
            </div>
          </div>
        </div>
      `;
    }
  }
  gapContainer.innerHTML = html;
}

function renderRoutine() {
  const habits = [
    { title: 'Morning Reset', description: 'Gentle mobility and sunlight.', time: '7:00 AM', duration: '10 min', why: 'A short movement window improves energy and reduces stiffness.', scientific: 'Morning movement increases blood flow and supports alertness.', benefits: 'Sharper focus, better mood, easier start to the day.' },
    { title: 'Hydration Boost', description: 'Sip water before your first task.', time: '8:30 AM', duration: '2 min', why: 'Hydration keeps your metabolism steady.', scientific: 'Water supports attention and helps maintain steady energy balance.', benefits: 'Less fatigue, better digestion, improved concentration.' },
    { title: 'Evening Wind Down', description: 'Dim screens and breathe slowly.', time: '9:30 PM', duration: '12 min', why: 'Calm routines help your body recover.', scientific: 'Lower light exposure and slow breathing reduce stress signals.', benefits: 'Better sleep, lower tension, stronger recovery.' }
  ];

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

  const doneCount = state.completedTasks.filter((value) => value !== undefined).length;
  const percent = Math.round((doneCount / 3) * 100);
  els.routineProgress.style.width = `${percent}%`;
  els.routineProgress.parentElement.querySelector('.tracker-copy').textContent = `${doneCount} of 3 complete · ${percent}%`;
}

function renderProfile() {
  document.getElementById('profile-xp').textContent = state.xp;
  document.getElementById('profile-level').textContent = state.level;
  document.getElementById('profile-streak').textContent = state.streak;
  syncProfileMeta();
}

function renderMealCounter() {
  const remaining = Math.max(0, 5 - state.dailyMeals);
  els.mealCounter.textContent = `${remaining} uploads left today`;
}

function renderChat() {
  chatMessages = [
    { role: 'assistant', text: 'I can guide you with nutrition, sleep, movement, and recovery. Ask me something health-focused.' }
  ];
  renderMessages();
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

  const prompt = `You are a strict, helpful Indian fitness & wellness coach helping ${state.profileName}, a ${state.age}yo, ${state.weight}kg user with target weight ${state.targetWeight}kg.
  Their height is ${state.height} and diet preference is: ${state.dietType}.
  Their active focus is: ${state.goalType === 'muscle' ? 'Weight/Muscle Gain (Bulking)' : state.goalType === 'lose' ? 'Weight Loss/Tone' : 'Korean Skincare & Hydration'}.
  Today they consumed ${state.consumedCalories} / ${state.targetCalories} kcal and ${state.consumedProtein} / ${state.targetProtein}g protein.
  
  User says: "${message}"
  
  CRITICAL LOGGING RULE:
  - ONLY return non-zero "calories" and "protein" if the user explicitly states they ate, drank, had, or are logging the food right now (e.g. "I had biryani", "logged 100g paneer", "just ate 2 eggs").
  - If they are just asking a question about a food (e.g. "how many calories in biryani?", "does chicken have protein?"), you must explain the numbers in your "reply", but return 0 in the "calories" and "protein" fields. Do NOT log it.
  
  1. If they logged food, estimate the calories & protein (use Indian estimates like dal-chawal: 350 kcal/10g protein, 2 aloo puri: 550 kcal/10g protein, curd: 40 kcal/2g protein, etc).
  2. If they ask for a reminder, or if you suggest a specific action at a time (e.g. face wash at 9:00 PM, meal at 4:30 PM, shake at 8:00 AM), include a "schedule" object in the JSON response to schedule a real lockscreen push notification!
  
  The "schedule" object must contain:
    - "key": Unique key for the reminder (e.g. "skin", "diet", "water")
    - "title": Short title (e.g. "Meal: Paneer bhurji" or "Skincare: Face Wash")
    - "body": Short instructions (e.g. "Eat your paneer now to hit protein target!")
    - "time": The exact time in "HH:MM" format (24-hour style, e.g., "16:30" or "21:00")
  
  Reply strictly in JSON format with NO markdown formatting:
  {
    "reply": "Your coaching response here",
    "calories": 200, // ONLY if explicitly consumed (0 if informational question)
    "protein": 10, // ONLY if explicitly consumed (0 if informational question)
    "schedule": null // or the schedule object
  }`;

  try {
    const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${state.groqKey}`
      },
      body: JSON.stringify({
        model: 'llama-3.3-70b-versatile',
        messages: [{ role: 'user', content: prompt }],
        response_format: { type: "json_object" }
      })
    });

    const data = await response.json();
    if (data.error) throw new Error(data.error.message);

    const textRes = data.choices[0].message.content.trim();
    const result = JSON.parse(textRes);

    if (result.calories || result.protein) {
      state.consumedCalories += (result.calories || 0);
      state.consumedProtein += (result.protein || 0);
      saveState();
      renderDashboard();
    }

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

function previewMeal(event) {
  const file = event.target.files?.[0];
  if (!file) return;
  if (!file.type.startsWith('image/')) {
    els.mealStatus.textContent = 'Please upload a food image.';
    return;
  }

  const reader = new FileReader();
  reader.onload = () => {
    els.mealPreview.innerHTML = `<img src="${reader.result}" alt="Selected meal preview">`;
    els.mealStatus.textContent = 'Meal image ready. Tap analyze to estimate nutrition.';
  };
  reader.readAsDataURL(file);
}

function analyzeMeal() {
  if (state.dailyMeals >= 5) {
    els.mealStatus.textContent = 'Daily meal limit reached. Come back tomorrow for more insights.';
    return;
  }
  if (!els.mealInput.files?.length) {
    els.mealStatus.textContent = 'Upload a photo first to analyze your meal.';
    return;
  }

  els.mealStatus.textContent = 'Analyzing meal with a local nutrition model…';
  els.mealButton.disabled = true;
  setTimeout(() => {
    const score = 84 + Math.floor(Math.random() * 12);
    const calories = 420 + Math.floor(Math.random() * 240);
    const protein = 18 + Math.floor(Math.random() * 18);
    const carbs = 39 + Math.floor(Math.random() * 22);
    const fat = 12 + Math.floor(Math.random() * 12);
    const healthy = score >= 88 ? 'Excellent' : score >= 80 ? 'Strong' : 'Balanced';
    els.mealStatus.innerHTML = `
      <div class="meal-result">
        <strong>Estimated meal:</strong>
        <p>${calories} kcal · ${protein}g protein</p>
        <p>${carbs}g carbs · ${fat}g fat</p>
        <p>Meal score: ${score}/100</p>
        <p>Healthy rating: ${healthy}</p>
        <p>Looks like a solid, nourishing choice. Keep it up.</p>
      </div>
    `;
    state.dailyMeals += 1;
    recordActivity('Meal analyzed', 25);
    renderMealCounter();
    els.mealButton.disabled = false;
  }, 1200);
}

function completeQuickCheck(id, buttonEl = null) {
  if (state.completedHabits.includes(id)) return;

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
  state.completedHabits.push(id);
  state.score += 10;
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
    reminder.nextDue = Date.now() + reminder.followUp;
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
    const nextText = diff < 60000 ? 'Almost ready' : `Next in ${Math.max(1, Math.round(diff / 60000))} min`;
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
  window.location.reload();
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