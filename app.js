// ============================================================================
// RELIV COMPANION - AI SKIN OS & AI FAT LOSS OS
// Comprehensive PWA with dual-mode AI analysis for skincare & weight management
// ============================================================================

const API_BASE = process.env.NODE_ENV === 'production' 
  ? 'https://relivpwa.onrender.com'
  : 'http://localhost:4000';

// ============================================================================
// STATE & PERSISTENCE
// ============================================================================

let userProfile = {
  name: 'User',
  gender: 'other',
  goal: 'lose', // 'muscle', 'lose', 'skin-korean', 'skin-acne', etc.
  age: 25,
  height: "5'6\"",
  weight: 70,
  targetWeight: 65,
  skinType: 'oily',
  dietPref: 'omni',
  customCalTarget: null,
  customProTarget: null,
  wakeUpTime: '07:00',
  xp: 0,
  level: 1,
  streak: 0,
  hormoneSymptoms: {} // For female users: periodsRegular, jawlineAcne, etc.
};

let dailyIntake = {
  calories: 0,
  protein: 0,
  carbs: 0,
  fat: 0,
  fiber: 0,
  hydration: 0,
  mealCount: 0,
  meals: [],
  date: new Date().toISOString().split('T')[0]
};

let skinAnalysisHistory = [];
let weightHistory = [];
let pdfKnowledgeBase = [];

// Load from localStorage
function loadState() {
  const profile = localStorage.getItem('relix_profile');
  if (profile) userProfile = { ...userProfile, ...JSON.parse(profile) };
  
  const intake = localStorage.getItem('relix_daily_intake');
  if (intake) {
    const loaded = JSON.parse(intake);
    if (loaded.date === new Date().toISOString().split('T')[0]) {
      dailyIntake = loaded;
    } else {
      dailyIntake = { ...dailyIntake, date: new Date().toISOString().split('T')[0] };
    }
  }
  
  const skinHist = localStorage.getItem('relix_skin_history');
  if (skinHist) skinAnalysisHistory = JSON.parse(skinHist);
  
  const weightHist = localStorage.getItem('relix_weight_history');
  if (weightHist) weightHistory = JSON.parse(weightHist);
  
  const pdfBase = localStorage.getItem('relix_pdf_kb');
  if (pdfBase) pdfKnowledgeBase = JSON.parse(pdfBase);
}

function saveState() {
  localStorage.setItem('relix_profile', JSON.stringify(userProfile));
  localStorage.setItem('relix_daily_intake', JSON.stringify(dailyIntake));
  localStorage.setItem('relix_skin_history', JSON.stringify(skinAnalysisHistory));
  localStorage.setItem('relix_weight_history', JSON.stringify(weightHistory));
  localStorage.setItem('relix_pdf_kb', JSON.stringify(pdfKnowledgeBase));
}

// ============================================================================
// CALORIE & MACRO CALCULATIONS
// ============================================================================

function getCalorieTarget() {
  if (userProfile.customCalTarget) return userProfile.customCalTarget;
  
  let bmr = 10 * userProfile.weight + 6.25 * parseHeightCm() - 5 * userProfile.age;
  if (userProfile.gender === 'female') bmr -= 161;
  
  let activity = 1.55; // Moderate activity
  let tdee = bmr * activity;
  
  if (userProfile.goal === 'lose') return Math.round(tdee - 500);
  if (userProfile.goal === 'muscle') return Math.round(tdee + 300);
  return Math.round(tdee);
}

function getProteinTarget() {
  if (userProfile.customProTarget) return userProfile.customProTarget;
  
  if (userProfile.goal === 'lose') return Math.round(userProfile.weight * 2.2); // 2.2g per kg
  if (userProfile.goal === 'muscle') return Math.round(userProfile.weight * 2.4);
  return Math.round(userProfile.weight * 1.6);
}

function parseHeightCm() {
  const match = userProfile.height.match(/(\d+)'(\d+)/);
  if (match) return parseInt(match[1]) * 30.48 + parseInt(match[2]) * 2.54;
  return 168; // Default ~5'6"
}

// ============================================================================
// DYNAMIC GOAL-BASED UI SWITCHING
// ============================================================================

function isSkinGoal() {
  return userProfile.goal?.startsWith('skin');
}

function isWeightGoal() {
  return userProfile.goal === 'lose' || userProfile.goal === 'muscle';
}

function updateCamTabLabel() {
  const mealTab = document.querySelector('[data-tab="meal"]');
  if (mealTab) {
    if (isSkinGoal()) {
      mealTab.innerHTML = '📷<span>Face Cam</span>';
    } else {
      mealTab.innerHTML = '📸<span>Meal Cam</span>';
    }
  }
}

function showRelevantNutritionCard() {
  const nutritionCard = document.getElementById('nutrition-overview-card');
  const skincareCard = document.getElementById('skincare-overview-card');
  
  if (isWeightGoal()) {
    if (nutritionCard) nutritionCard.style.display = 'flex';
    if (skincareCard) skincareCard.style.display = 'none';
  } else {
    if (nutritionCard) nutritionCard.style.display = 'none';
    if (skincareCard) skincareCard.style.display = 'flex';
  }
}

// ============================================================================
// WEIGHT LOSS MODULE - Enhanced Macro Alerts
// ============================================================================

function checkMacroAlerts() {
  const alerts = [];
  const calTarget = getCalorieTarget();
  const proTarget = getProteinTarget();
  
  // Over Calorie Alert
  if (dailyIntake.calories > calTarget) {
    alerts.push({
      type: 'warning',
      title: '⚠️ Calorie Alert',
      body: `You have exceeded today's calorie target (${dailyIntake.calories}/${calTarget} kcal). Continuing to do this regularly may reduce or stop fat loss.`,
      suggestions: ['Lighter dinner', 'Take a walk', 'Try lower-calorie alternatives', "Don't starve tomorrow"]
    });
  }
  
  // Over Protein Alert
  if (dailyIntake.protein > proTarget * 1.3) {
    alerts.push({
      type: 'info',
      title: 'ℹ️ High Protein Intake',
      body: `You've consumed considerably more protein (${dailyIntake.protein}g) than your target (${proTarget}g). While protein supports muscle maintenance, consistently eating well beyond needs may add unnecessary calories.`,
      suggestions: ['Balance macros', 'Focus on calorie goals']
    });
  }
  
  // Low Protein Alert
  if (dailyIntake.protein < proTarget * 0.8) {
    alerts.push({
      type: 'info',
      title: '⬇️ Low Protein',
      body: `Your protein intake (${dailyIntake.protein}g) is below target (${proTarget}g). Low protein may increase muscle loss risk, leave you hungry, and slow metabolism recovery.`,
      suggestions: ['Eggs', 'Paneer', 'Chana', 'Lentils', 'Greek yogurt']
    });
  }
  
  return alerts;
}

function displayMacroAlerts() {
  const alerts = checkMacroAlerts();
  const gapContainer = document.getElementById('gap-analytics');
  if (!gapContainer) return;
  
  gapContainer.innerHTML = '';
  alerts.forEach(alert => {
    const alertEl = document.createElement('div');
    alertEl.style.cssText = 'background: rgba(255,193,7,0.1); border: 1px solid rgba(255,193,7,0.3); border-radius: 12px; padding: 12px; margin-bottom: 8px;';
    alertEl.innerHTML = `
      <strong style="color: var(--text);">\uD83D\uDEA8 ${alert.title}</strong>
      <p style="margin: 6px 0 0 0; font-size: 0.85rem; color: var(--muted); line-height: 1.4;">${alert.body}</p>
      <div style="display: flex; flex-wrap: wrap; gap: 6px; margin-top: 8px;">
        ${alert.suggestions.map(s => `<button class="ghost-btn" style="font-size: 0.75rem; padding: 4px 8px; border: 1px solid var(--border); cursor: default;">${s}</button>`).join('')}
      </div>
    `;
    gapContainer.appendChild(alertEl);
  });
  
  if (alerts.length === 0) {
    gapContainer.innerHTML = '<p style="color: var(--muted); text-align: center; padding: 12px; font-size: 0.85rem;">✨ You\'re on track! Keep it up.</p>';
  }
}

// ============================================================================
// AI MEAL ANALYSIS (Backend-powered)
// ============================================================================

async function analyzeMealWithAI(imageBase64) {
  try {
    const prompt = `Analyze this meal photo and provide ONLY a valid JSON response with these exact fields:
{
  "mealName": "descriptive meal name",
  "servingSize": "estimated serving",
  "calories": number,
  "protein": number,
  "carbs": number,
  "fat": number,
  "fiber": number,
  "healthScore": "1-10 score",
  "satietyScore": "1-10 score",
  "proteinScore": "1-10 score",
  "fatLossScore": "1-10 score",
  "goodPoints": ["array", "of", "positive", "aspects"],
  "improvementPoints": ["array", "of", "suggestions"],
  "missingNutrients": ["array", "of", "nutrients"]
}`;

    const response = await fetch(`${API_BASE}/api/ai/analyze-image`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ imageBase64, prompt })
    });

    if (!response.ok) throw new Error('AI analysis failed');
    const data = await response.json();
    
    // Extract JSON from response
    const text = data.candidates?.[0]?.content?.parts?.[0]?.text || '';
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (!jsonMatch) throw new Error('No JSON in response');
    
    return JSON.parse(jsonMatch[0]);
  } catch (err) {
    console.error('Meal analysis error:', err);
    return null;
  }
}

// ============================================================================
// AI SKIN ANALYSIS (Backend-powered)
// ============================================================================

async function analyzeSkinWithAI(imageBase64) {
  try {
    const prompt = `You are an expert skincare analyst. Analyze this face/skin photo and provide ONLY a valid JSON response:
{
  "overallAssessment": "detailed vivid description of skin condition",
  "skinScores": {
    "health": 1-10,
    "hydration": 1-10,
    "barrier": 1-10,
    "pigmentation": 1-10,
    "texture": 1-10,
    "acne": 1-10,
    "oil": 1-10,
    "pores": 1-10,
    "redness": 1-10,
    "glow": 1-10,
    "wrinkles": 1-10,
    "elasticity": 1-10,
    "darkCircles": 1-10
  },
  "detailedConcerns": [{
    "concern": "concern name",
    "severity": 1-10,
    "explanation": "why it's happening",
    "possibleCauses": ["cause1", "cause2"],
    "timeline": "expected improvement timeline",
    "homeCare": ["tip1", "tip2"],
    "recommendedIngredients": ["ingredient1"],
    "professionalTreatments": ["treatment1"],
    "thingsToAvoid": ["avoid1"]
  }],
  "whatIDontSee": ["concern not detected"],
  "glassSkinnessAnalysis": "explanation of why skin may not appear smooth",
  "priorityImprovements": ["priority1", "priority2", "priority3"]
}`;

    const response = await fetch(`${API_BASE}/api/ai/analyze-image`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ imageBase64, prompt })
    });

    if (!response.ok) throw new Error('AI analysis failed');
    const data = await response.json();
    
    const text = data.candidates?.[0]?.content?.parts?.[0]?.text || '';
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (!jsonMatch) throw new Error('No JSON in response');
    
    return JSON.parse(jsonMatch[0]);
  } catch (err) {
    console.error('Skin analysis error:', err);
    return null;
  }
}

// ============================================================================
// FEMALE HORMONAL GUIDANCE (PCOS/PCOD)
// ============================================================================

function renderHormoneSymptomCheck() {
  if (userProfile.gender !== 'female') return;
  
  const modal = document.getElementById('setup-modal');
  if (!modal) return;
  
  const setupBody = document.getElementById('setup-body');
  if (!setupBody) return;
  
  const hormoneSection = document.createElement('div');
  hormoneSection.style.cssText = 'background: rgba(233,30,99,0.08); border: 1px solid rgba(233,30,99,0.2); border-radius: 12px; padding: 12px; margin-top: 12px;';
  hormoneSection.innerHTML = `
    <strong style="font-size: 0.9rem; color: #e91e63; display: block; margin-bottom: 8px;">💊 Hormonal Health (Optional)</strong>
    <p style="font-size: 0.8rem; color: var(--muted); margin-bottom: 10px;">Check any symptoms you experience:</p>
    <div style="display: flex; flex-direction: column; gap: 8px;">
      <label style="display: flex; align-items: center; gap: 8px; cursor: pointer; font-size: 0.85rem;">
        <input type="checkbox" id="symptom-periods" /> Regular periods (✓) / Irregular (✗)
      </label>
      <label style="display: flex; align-items: center; gap: 8px; cursor: pointer; font-size: 0.85rem;">
        <input type="checkbox" id="symptom-jawline" /> Jawline acne
      </label>
      <label style="display: flex; align-items: center; gap: 8px; cursor: pointer; font-size: 0.85rem;">
        <input type="checkbox" id="symptom-chin" /> Chin acne
      </label>
      <label style="display: flex; align-items: center; gap: 8px; cursor: pointer; font-size: 0.85rem;">
        <input type="checkbox" id="symptom-facial-hair" /> Facial hair growth
      </label>
      <label style="display: flex; align-items: center; gap: 8px; cursor: pointer; font-size: 0.85rem;">
        <input type="checkbox" id="symptom-hair-thin" /> Hair thinning
      </label>
      <label style="display: flex; align-items: center; gap: 8px; cursor: pointer; font-size: 0.85rem;">
        <input type="checkbox" id="symptom-weight-fluctuate" /> Unexplained weight changes
      </label>
    </div>
    <div id="hormone-guidance" style="display: none; background: rgba(255,193,7,0.1); border: 1px solid rgba(255,193,7,0.3); border-radius: 12px; padding: 12px; margin-top: 10px; font-size: 0.8rem; line-height: 1.5;">
      <strong style="color: #ff9800; display: block; margin-bottom: 8px;">⚠️ Possible Hormonal Pattern</strong>
      <p>Some of your symptoms can occur with hormonal conditions such as <strong>PCOS (Polycystic Ovary Syndrome)</strong>. This app cannot diagnose PCOS.</p>
      <p style="margin: 8px 0; color: var(--muted);">Consider discussing your symptoms with a qualified healthcare professional, especially if you have irregular periods or other persistent concerns.</p>
      <div style="margin-top: 10px; border-top: 1px solid rgba(255,193,7,0.2); padding-top: 10px;">
        <strong style="display: block; margin-bottom: 6px;">💡 Lifestyle Tips:</strong>
        <ul style="margin: 0; padding-left: 20px;">
          <li>Prioritize consistent sleep (7-9 hours)</li>
          <li>Manage stress through meditation or yoga</li>
          <li>Include anti-inflammatory foods (turmeric, fatty fish)</li>
          <li>Focus on protein and fiber intake</li>
          <li>Use gentle skincare with salicylic acid</li>
        </ul>
      </div>
    </div>
  `;
  
  setupBody.appendChild(hormoneSection);
  
  // Monitor symptoms
  const symptoms = ['periods', 'jawline', 'chin', 'facial-hair', 'hair-thin', 'weight-fluctuate'];
  symptoms.forEach(sym => {
    const checkbox = document.getElementById(`symptom-${sym}`);
    if (checkbox) {
      checkbox.addEventListener('change', () => {
        const checked = symptoms.filter(s => document.getElementById(`symptom-${s}`)?.checked).length;
        const guidance = document.getElementById('hormone-guidance');
        if (checked >= 3 && guidance) {
          guidance.style.display = 'block';
          userProfile.hormoneSymptoms[sym] = checkbox.checked;
        } else if (guidance) {
          guidance.style.display = 'none';
        }
      });
    }
  });
}

// ============================================================================
// PDF KNOWLEDGE BASE & ACADEMY
// ============================================================================

async function processPDFWithAI(pdfText, action) {
  try {
    const response = await fetch(`${API_BASE}/api/ai/pdf-process`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ pdfText, action })
    });

    if (!response.ok) throw new Error('PDF processing failed');
    const data = await response.json();
    
    const text = data.candidates?.[0]?.content?.parts?.[0]?.text || '';
    const jsonMatch = text.match(/\{[\s\S]*\}|\[[\s\S]*\]/);
    if (!jsonMatch) throw new Error('No JSON in response');
    
    return JSON.parse(jsonMatch[0]);
  } catch (err) {
    console.error('PDF processing error:', err);
    return null;
  }
}

function renderPDFUploader() {
  const naturalTab = document.querySelector('[data-view="natural"]');
  if (!naturalTab) return;
  
  let uploaderHtml = `
    <div class="card" style="padding: 20px; margin-bottom: 18px;">
      <strong style="color: var(--primary); font-size:0.8rem; text-transform:uppercase; letter-spacing:0.05em; display:block; margin-bottom: 6px;">📚 Academy Hub</strong>
      <h3 style="margin:0; font-size:1.2rem;">PDF Knowledge Base</h3>
      <p style="margin:6px 0 0 0; font-size:0.85rem; color:var(--muted);">Upload skincare or nutrition PDFs to generate AI flashcards, quizzes, and lessons.</p>
      
      <div style="margin-top: 14px; display: flex; flex-direction: column; gap: 10px;">
        <label class="primary-btn" style="display: inline-flex; align-items: center; justify-content: center; cursor: pointer; margin: 0;">
          📤 Upload PDF
          <input type="file" id="pdf-upload-input" accept=".pdf" hidden />
        </label>
        <div id="pdf-upload-status" style="font-size: 0.85rem; color: var(--muted); text-align: center;">No PDF uploaded yet</div>
      </div>
    </div>
    
    <div id="pdf-content-tabs" style="display: none; margin-bottom: 18px;">
      <div style="display: flex; gap: 8px; margin-bottom: 12px;">
        <button class="pdf-tab-btn primary-btn" data-action="flashcards" style="flex: 1; font-size: 0.85rem; padding: 8px;">🎴 Flashcards</button>
        <button class="pdf-tab-btn ghost-btn" data-action="quiz" style="flex: 1; font-size: 0.85rem; padding: 8px; border: 1px solid var(--border);">❓ Quiz</button>
        <button class="pdf-tab-btn ghost-btn" data-action="lesson" style="flex: 1; font-size: 0.85rem; padding: 8px; border: 1px solid var(--border);">📖 Lesson</button>
        <button class="pdf-tab-btn ghost-btn" data-action="summary" style="flex: 1; font-size: 0.85rem; padding: 8px; border: 1px solid var(--border);">📝 Summary</button>
      </div>
      <div id="pdf-content-display" style="background: var(--card); border: 1px solid var(--border); border-radius: 12px; padding: 16px; min-height: 200px;"></div>
    </div>
  `;
  
  // Find or create academy section
  const existingAcademy = naturalTab.querySelector('[data-pdf-academy]');
  if (existingAcademy) {
    existingAcademy.innerHTML = uploaderHtml;
  } else {
    const section = document.createElement('div');
    section.setAttribute('data-pdf-academy', 'true');
    section.innerHTML = uploaderHtml;
    naturalTab.insertBefore(section, naturalTab.firstChild);
  }
  
  // Event listeners
  const pdfInput = document.getElementById('pdf-upload-input');
  if (pdfInput) {
    pdfInput.addEventListener('change', handlePDFUpload);
  }
  
  document.querySelectorAll('.pdf-tab-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('.pdf-tab-btn').forEach(b => {
        b.className = b === btn ? 'pdf-tab-btn primary-btn' : 'pdf-tab-btn ghost-btn';
        b.style.border = b === btn ? 'none' : '1px solid var(--border)';
      });
      const action = btn.getAttribute('data-action');
      displayPDFContent(action);
    });
  });
}

async function handlePDFUpload(event) {
  const file = event.target.files?.[0];
  if (!file) return;
  
  const status = document.getElementById('pdf-upload-status');
  if (status) status.textContent = '⏳ Processing PDF...';
  
  try {
    // In production, use PDF.js library to extract text
    // For now, show placeholder
    const text = await extractPDFText(file);
    if (!text) throw new Error('Could not extract PDF text');
    
    pdfKnowledgeBase.push({ text, filename: file.name, uploadedAt: new Date().toISOString() });
    saveState();
    
    if (status) status.textContent = `✅ ${file.name} loaded`;
    const tabs = document.getElementById('pdf-content-tabs');
    if (tabs) tabs.style.display = 'block';
  } catch (err) {
    console.error('PDF upload error:', err);
    if (status) status.textContent = '❌ Failed to load PDF';
  }
}

async function extractPDFText(file) {
  // Placeholder: In production, integrate PDF.js
  // Example: const pdf = await pdfjsLib.getDocument(await file.arrayBuffer()).promise;
  // This requires <script src="https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.min.js"></script>
  return null; // To be implemented
}

async function displayPDFContent(action) {
  if (pdfKnowledgeBase.length === 0) return;
  
  const display = document.getElementById('pdf-content-display');
  if (!display) return;
  
  display.innerHTML = '⏳ Generating ' + action + '...';
  
  const result = await processPDFWithAI(pdfKnowledgeBase[0].text, action);
  if (!result) {
    display.innerHTML = '❌ Failed to generate content';
    return;
  }
  
  if (action === 'flashcards' && Array.isArray(result)) {
    display.innerHTML = result.map((card, i) => `
      <div style="background: var(--border); padding: 12px; border-radius: 8px; margin-bottom: 8px;">
        <strong style="display: block; margin-bottom: 6px;">Card ${i + 1}</strong>
        <p style="margin: 0 0 6px 0; font-size: 0.85rem;"><strong>Q:</strong> ${card.front || ''}</p>
        <p style="margin: 0; font-size: 0.85rem;"><strong>A:</strong> ${card.back || ''}</p>
      </div>
    `).join('');
  } else if (action === 'quiz' && Array.isArray(result)) {
    display.innerHTML = result.map((q, i) => `
      <div style="background: var(--border); padding: 12px; border-radius: 8px; margin-bottom: 8px;">
        <strong style="display: block; margin-bottom: 6px;">Q${i + 1}: ${q.question || ''}</strong>
        ${(q.options || []).map((opt, j) => `
          <label style="display: block; margin: 4px 0; font-size: 0.85rem;">
            <input type="radio" name="quiz-${i}" value="${j}" /> ${opt}
          </label>
        `).join('')}
      </div>
    `).join('');
  } else if (action === 'lesson' && result.keyPoints) {
    display.innerHTML = `
      <strong>${result.title || 'Lesson'}</strong>
      <p style="font-size: 0.85rem; margin: 8px 0; line-height: 1.5;">${result.overview || ''}</p>
      <strong style="font-size: 0.9rem; display: block; margin: 12px 0 6px 0;">Key Points:</strong>
      <ul style="margin: 0; padding-left: 20px; font-size: 0.85rem;">
        ${(result.keyPoints || []).map(p => `<li>${p}</li>`).join('')}
      </ul>
    `;
  } else {
    display.innerHTML = `<p style="font-size: 0.85rem; line-height: 1.5;">${result.summary || JSON.stringify(result)}</p>`;
  }
}

// ============================================================================
// INITIALIZATION
// ============================================================================

function initializeApp() {
  loadState();
  updateCamTabLabel();
  showRelevantNutritionCard();
  renderHormoneSymptomCheck();
  renderPDFUploader();
  setupEventListeners();
  updateDashboard();
}

function setupEventListeners() {
  // Tab switching
  document.querySelectorAll('.nav-pill').forEach(btn => {
    btn.addEventListener('click', () => {
      const tab = btn.getAttribute('data-tab');
      switchView(tab);
    });
  });
  
  // Quick food logging
  document.querySelectorAll('.quick-pick-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const food = btn.getAttribute('data-food');
      logQuickFood(food);
    });
  });
  
  // Macro adjustment buttons
  document.querySelectorAll('.adjust-macro-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const type = btn.getAttribute('data-type');
      const val = parseInt(btn.getAttribute('data-val'));
      if (type === 'cal') dailyIntake.calories += val;
      if (type === 'pro') dailyIntake.protein += val;
      saveState();
      updateDashboard();
    });
  });
  
  // Meal upload
  const mealInput = document.getElementById('meal-input');
  if (mealInput) mealInput.addEventListener('change', handleMealUpload);
  
  // Hydration logging
  document.querySelectorAll('.log-hydration-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const ml = parseInt(btn.getAttribute('data-ml'));
      dailyIntake.hydration += ml;
      saveState();
      updateDashboard();
    });
  });
  
  // Setup modal
  const setupBtn = document.getElementById('edit-stats-btn');
  if (setupBtn) {
    setupBtn.addEventListener('click', () => {
      const modal = document.getElementById('setup-modal');
      if (modal) modal.style.display = 'block';
    });
  }
  
  const finishSetupBtn = document.getElementById('finish-setup');
  if (finishSetupBtn) {
    finishSetupBtn.addEventListener('click', handleFinishSetup);
  }
}

function handleFinishSetup() {
  userProfile.name = document.getElementById('setup-name')?.value || userProfile.name;
  userProfile.gender = document.getElementById('setup-gender')?.value || userProfile.gender;
  userProfile.goal = document.getElementById('setup-goal')?.value || userProfile.goal;
  userProfile.age = parseInt(document.getElementById('setup-age')?.value) || userProfile.age;
  userProfile.height = document.getElementById('setup-height')?.value || userProfile.height;
  userProfile.weight = parseInt(document.getElementById('setup-weight')?.value) || userProfile.weight;
  userProfile.targetWeight = parseInt(document.getElementById('setup-target')?.value) || userProfile.targetWeight;
  userProfile.skinType = document.getElementById('setup-skin-type')?.value || userProfile.skinType;
  userProfile.dietPref = document.getElementById('setup-diet')?.value || userProfile.dietPref;
  userProfile.customCalTarget = parseInt(document.getElementById('setup-custom-cal')?.value) || null;
  userProfile.customProTarget = parseInt(document.getElementById('setup-custom-pro')?.value) || null;
  
  saveState();
  updateCamTabLabel();
  showRelevantNutritionCard();
  renderHormoneSymptomCheck();
  updateDashboard();
  
  const modal = document.getElementById('setup-modal');
  if (modal) modal.style.display = 'none';
  
  const confirmModal = document.getElementById('save-confirm-modal');
  if (confirmModal) confirmModal.style.display = 'flex';
}

async function handleMealUpload(event) {
  const file = event.target.files?.[0];
  if (!file) return;
  
  const reader = new FileReader();
  reader.onload = async (e) => {
    const imageBase64 = e.target.result;
    const resultCard = document.getElementById('meal-result-card');
    if (resultCard) {
      resultCard.style.display = 'flex';
      const title = document.getElementById('meal-result-title');
      if (title) title.textContent = 'Analyzing meal...';
    }
    
    const analysis = await analyzeMealWithAI(imageBase64);
    if (!analysis) {
      const title = document.getElementById('meal-result-title');
      if (title) title.textContent = 'Analysis failed';
      return;
    }
    
    displayMealAnalysis(analysis);
  };
  reader.readAsDataURL(file);
}

function displayMealAnalysis(analysis) {
  const title = document.getElementById('meal-result-title');
  const desc = document.getElementById('meal-result-desc');
  const grid = document.getElementById('meal-nutrition-grid');
  const logBtn = document.getElementById('log-meal-btn');
  
  if (title) title.textContent = analysis.mealName || 'Meal';
  if (desc) desc.textContent = `Serving: ${analysis.servingSize || 'estimated'} | Health Score: ${analysis.healthScore}/10`;
  
  if (grid) {
    grid.style.display = 'grid';
    document.getElementById('meal-cal-val').textContent = `${analysis.calories || 0}`;
    document.getElementById('meal-pro-val').textContent = `${analysis.protein || 0}g`;
    document.getElementById('meal-carb-val').textContent = `${analysis.carbs || 0}g`;
    document.getElementById('meal-fat-val').textContent = `${analysis.fat || 0}g`;
  }
  
  if (logBtn) {
    logBtn.style.display = 'block';
    logBtn.onclick = () => {
      dailyIntake.calories += analysis.calories || 0;
      dailyIntake.protein += analysis.protein || 0;
      dailyIntake.carbs += analysis.carbs || 0;
      dailyIntake.fat += analysis.fat || 0;
      dailyIntake.fiber += analysis.fiber || 0;
      dailyIntake.meals.push(analysis);
      saveState();
      updateDashboard();
      alert('Meal logged!');
    };
  }
}

function switchView(tab) {
  document.querySelectorAll('.view-section').forEach(s => s.classList.remove('active'));
  document.querySelectorAll('.nav-pill').forEach(b => b.classList.remove('active'));
  
  const view = document.querySelector(`[data-view="${tab}"]`);
  const btn = document.querySelector(`[data-tab="${tab}"]`);
  
  if (view) view.classList.add('active');
  if (btn) btn.classList.add('active');
}

function logQuickFood(food) {
  const foodData = {
    'dal': { calories: 200, protein: 15, carbs: 30, fat: 2, fiber: 8 },
    'burger': { calories: 520, protein: 25, carbs: 45, fat: 25, fiber: 2 },
    'coffee': { calories: 5, protein: 0, carbs: 1, fat: 0, fiber: 0 },
    'chai': { calories: 45, protein: 2, carbs: 8, fat: 0.5, fiber: 0 }
  }[food] || {};
  
  dailyIntake.calories += foodData.calories || 0;
  dailyIntake.protein += foodData.protein || 0;
  saveState();
  updateDashboard();
}

function updateDashboard() {
  const nameEl = document.getElementById('hero-name');
  if (nameEl) nameEl.textContent = userProfile.name;
  
  const calText = document.getElementById('cal-text');
  if (calText) calText.textContent = `${dailyIntake.calories} / ${getCalorieTarget()} kcal`;
  
  const proText = document.getElementById('pro-text');
  if (proText) proText.textContent = `${dailyIntake.protein} / ${getProteinTarget()}g`;
  
  const calBar = document.getElementById('cal-bar');
  if (calBar) calBar.style.width = `${Math.min(100, (dailyIntake.calories / getCalorieTarget()) * 100)}%`;
  
  const proBar = document.getElementById('pro-bar');
  if (proBar) proBar.style.width = `${Math.min(100, (dailyIntake.protein / getProteinTarget()) * 100)}%`;
  
  displayMacroAlerts();
}

// Initialize on load
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initializeApp);
} else {
  initializeApp();
}
