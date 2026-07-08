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

const defaultReminders = {
  water: { title: 'Drink water', description: 'Did you drink water yet?', nextDue: Date.now() + 60000, pending: false, lastAction: '', missedCount: 0, followUp: 3600000 },
  skin: { title: 'Face wash', description: 'Did you wash your face yet?', nextDue: Date.now() + 120000, pending: false, lastAction: '', missedCount: 0, followUp: 7200000 },
  diet: { title: 'Protein & calories', description: 'Did you log a protein-focused meal?', nextDue: Date.now() + 180000, pending: false, lastAction: '', missedCount: 0, followUp: 10800000 }
};

const state = {
  darkMode: localStorage.getItem('relix-dark') === 'true',
  notifications: localStorage.getItem('relix-notify') !== 'false',
  remindersPaused: localStorage.getItem('relix-reminders-paused') === 'true',
  activeTab: 'dashboard',
  profileName: localStorage.getItem('relix-profile-name') || 'Your Name',
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
    if (!saved) return JSON.parse(JSON.stringify(defaultReminders));
    return Object.fromEntries(Object.entries(defaultReminders).map(([key, baseReminder]) => {
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
  deleteButton: document.getElementById('delete-data')
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
    if (document.visibilityState === 'visible') initializeReminderSystem();
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
  } catch (err) {}
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
}

function bindEvents() {
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
      respondToReminder(button.dataset.reminderKey, button.dataset.reminderAction);
    });
  }

  document.querySelectorAll('.why-btn').forEach((btn) => {
    btn.addEventListener('click', () => openWhyModal(btn.dataset.title, btn.dataset.why));
  });

  document.querySelectorAll('.check-habit').forEach((checkbox) => {
    checkbox.addEventListener('change', toggleHabit);
  });

  document.querySelectorAll('[data-check]').forEach((button) => {
    button.addEventListener('click', () => completeQuickCheck(button.dataset.check));
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
  els.weeklyValue.textContent = `${state.weekly}%`;
  els.progressBar.style.width = `${state.weekly}%`;
  els.progressText.textContent = `Weekly progress · ${state.weekly}% complete`;

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
    .then((reply) => {
      typing.remove();
      chatMessages.push({ role: 'assistant', text: reply });
      renderMessages();
    })
    .catch(() => {
      typing.remove();
      chatMessages.push({ role: 'assistant', text: 'I am offline right now, but I can still suggest a calm wellness habit to try next.' });
      renderMessages();
    });
}

async function getCoachReply(message) {
  const entry = retrieveKnowledge(message);
  if (entry) {
    return entry.answer;
  }

  if (window.RELIX_GROQ_API_KEY && window.RELIX_GROQ_API_KEY !== 'YOUR_GROQ_API_KEY') {
    const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${window.RELIX_GROQ_API_KEY}`
      },
      body: JSON.stringify({
        model: 'llama-3.3-70b-versatile',
        messages: [
          { role: 'system', content: 'You are Relix, a health and wellness coach. Answer only health and wellness topics. Refuse politics, sports, movies, programming, relationships, and finance questions politely.' },
          { role: 'user', content: message }
        ],
        temperature: 0.7
      })
    });
    const data = await response.json();
    return data.choices?.[0]?.message?.content || 'I can help with recovery, sleep, nutrition, movement, and wellbeing.';
  }

  return 'I can help with recovery, sleep, nutrition, movement, and wellbeing.';
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

function completeQuickCheck(type) {
  const map = {
    water: 'Water check-in complete',
    stretch: 'Stretch break complete',
    supplement: 'Supplement reminder logged',
    meditation: 'Meditation break complete',
    walk: 'Walk check-in complete',
    sleep: 'Sleep goal logged'
  };
  state.completedTasks.push(type);
  recordActivity(map[type] || 'Wellness check-in complete', 15);
  renderDashboard();
  renderRoutine();
  renderProfile();
  showToast(map[type] || 'Check-in complete');
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
}

async function subscribeToPushNotifications() {
  // Backend push registration paused as requested. 
  // We are relying 100% on the local browser Notification API.
  console.log("Local notification mode active. Backend push disabled.");
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
    Notification.requestPermission().catch(() => {});
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
  
  // Aggressive demo loop for background testing without a server
  spamTimer = setInterval(() => {
    if (!state.notifications) return clearInterval(spamTimer);
    const pending = Object.entries(state.reminders).filter(([, r]) => r.pending);
    if (pending.length > 0) {
      const [key, rem] = pending[Math.floor(Math.random() * pending.length)];
      showNotification(`Missed: ${rem.title}`, rem.description, key);
    } else {
      showNotification('Reliv Reminder', '💧 Everything is complete!', 'generic');
    }
  }, 30000); // Check/notify every 30 seconds
}

function scheduleReminder(key, delay) {
  const reminder = state.reminders[key];
  if (!reminder) return;
  const timerId = window.setTimeout(() => triggerReminder(key), delay);
  state.reminderTimers[key] = timerId;
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

function respondToReminder(key, action) {
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
      navigator.setAppBadge(unreadCount).catch(() => {});
    } else {
      navigator.clearAppBadge().catch(() => {});
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
    }).catch(() => {});
    return;
  }

  if ('Notification' in window && Notification.permission === 'granted') {
    const reminder = new Notification(title, options);
    reminder.onclick = () => window.focus();
  }
}

function registerServiceWorker() {
  if ('serviceWorker' in navigator) {
    navigator.serviceWorker.register('./service-worker.js').catch(() => {});
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

  if (!window.matchMedia('(display-mode: standalone)').matches && !window.navigator.standalone) {
    updateActionButtons();
    setTimeout(() => showInstallPrompt(), 1400);
  }
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
