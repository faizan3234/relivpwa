# Reliv Companion - AI Skin OS & AI Fat Loss OS

A premium Progressive Web App (PWA) that transforms wellness with dual-mode AI analysis for both skincare and nutrition management.

## 🎯 Features

### AI Skin OS
- **Face Map Markers**: Interactive overlay with concern detection (acne, pigmentation, texture, pores, etc.)
- **13 Skin Scores**: Health, Hydration, Barrier, Pigmentation, Texture, Acne, Oil, Pores, Redness, Glow, Wrinkles, Elasticity, Dark Circles
- **Detailed Skin Reports**: For each concern: severity, causes, timeline, home care, ingredients, professional treatments
- **Glass Skin Analysis**: Explains smoothness factors and prioritizes improvements
- **Korean/Japanese/Indian Skincare Hubs**: Complete routines and ingredient guidance
- **Female Hormonal Guidance**: PCOS/PCOD symptom tracking and lifestyle advice (non-diagnostic)
- **Product Analyzer**: Scan skincare products for ingredients, conflicts, fungal acne compatibility

### AI Fat Loss OS
- **Intelligent Macro Alerts**: 
  - Over calorie/protein warnings with explanations
  - Low protein alerts with food suggestions
  - Smart gap analysis and target suggestions
- **AI Meal Analysis**: Calories, macros, fiber, health score, satiety score, protein score, fat-loss score
- **Personalized Coaching**:
  - Daily coach
  - Weekly coach
  - Plateau coach
  - Cheat meal coach
  - Eating-out coach
  - Motivation coach
- **Weight Trend Analysis**: Water retention, sodium, glycogen, digestion, menstrual cycle, sleep, stress factors
- **Science-Based Weight Loss Guide**: Calorie deficit, protein, fiber, sleep, cardio, stress management, myths, safe timelines
- **Food Scanner**: Upload meal photos for instant AI analysis

### Knowledge Base & Academy
- **PDF Uploader**: Upload skincare or nutrition PDFs
- **AI-Generated Content**:
  - Flashcards
  - Interactive Quizzes
  - Lessons with key points
  - Summaries
- **Searchable Knowledge**: Ask questions about uploaded materials

### Dynamic Goal-Based UI
- Automatically switches between "Meal Cam" (weight/muscle goals) and "Face Cam" (skincare goals)
- Nutrition overview for weight goals
- Hydration tracking for skin goals
- Personalized home remedies and routines

## 🛡️ Security

**API Keys Protected**: All Gemini & Groq API keys are stored on the backend server, NOT in frontend code. The PWA communicates with the backend proxy:

```
User Device (PWA) → Backend API Proxy → Gemini/Groq
```

## 🚀 Getting Started

### Frontend (PWA)
```bash
# No build step needed - just open index.html or deploy to Netlify
open index.html
# or
netlify deploy
```

### Backend (Node.js/Express)
```bash
cd backend
npm install

# Create .env file:
cp .env.example .env

# Add your API keys:
GEMINI_API_KEY=your_gemini_key_here
GROQ_API_KEY=your_groq_key_here (optional)
VAPID_PUBLIC_KEY=your_vapid_public_key
VAPID_PRIVATE_KEY=your_vapid_private_key
PORT=4000

# Start server
npm start
```

## 📋 API Endpoints

### AI Endpoints (Proxy)
- `POST /api/ai/chat` - Chat with AI coach
- `POST /api/ai/analyze-image` - Meal or face image analysis
- `POST /api/ai/pdf-process` - PDF to flashcards/quiz/lesson/summary

### Push Notifications
- `POST /api/push/subscribe` - Subscribe to notifications
- `POST /api/push/water/start` - Start 45min hydration reminders
- `POST /api/push/water/stop` - Stop reminders
- `POST /api/push/schedule` - Schedule custom reminder

## 🔧 Configuration

### Environment Variables
```env
# .env (Backend)
GEMINI_API_KEY=AIza...        # Google Gemini API key
GROQ_API_KEY=gsk_...          # Groq API key (optional)
VAPID_PUBLIC_KEY=B...         # Web Push VAPID public key
VAPID_PRIVATE_KEY=...         # Web Push VAPID private key
PORT=4000                      # Backend server port
NODE_ENV=production            # Environment
```

## 📱 Features by Goal

### Weight Loss/Gain Goals
- Calorie and macro tracking
- Quick-pick food logging
- Nutrition alerts and suggestions
- Weight trend analysis
- Science-based guides
- "Meal Cam" for food scanning

### Skincare Goals (All variants)
- Face Cam for face analysis
- Interactive face map with concern markers
- 13 skin health scores
- Routine recommendations
- Ingredient guidance
- PDF knowledge base
- Hydration tracking

### Female Users (All goals)
- Hormonal symptom checker
- PCOS/PCOD education (non-diagnostic)
- Lifestyle recommendations
- Doctor consultation guide

## 🎨 UI/UX
- Apple-style glass morphism design
- Mobile-first responsive layout
- Dark/light theme toggle
- Smooth animations and transitions
- Offline-ready with service worker
- Installable on home screen (iOS & Android)

## 📊 Data & Privacy
- All data stored locally in browser localStorage
- Optional cloud sync via backend
- Images analyzed and immediately deleted
- No personal data retained on server
- Export personal data anytime

## 🔄 Verification Checklist

- [x] Secure backend with API key protection
- [x] Dynamic goal-based UI switching
- [x] Intelligent macro alerts system
- [x] AI meal analysis with detailed nutrition
- [x] AI skin analysis with face map markers
- [x] Interactive face map with concern zones
- [x] Female hormonal guidance (PCOS awareness)
- [x] PDF knowledge base with AI processing
- [x] Flashcard, quiz, lesson, summary generation
- [x] Dark/light theme support
- [x] Push notification system
- [x] Mobile-responsive design
- [x] Progressive Web App features
- [x] Camera tabs (Meal Cam vs Face Cam)
- [x] Quick-pick food logging
- [x] Hydration tracking

## 🧪 Testing

1. **Setup**: Complete profile with goal selection
   - Try "Weight Loss & Tone" → Nutrition dashboard shows
   - Try "Korean Skincare & Glass Skin" → Hydration dashboard shows

2. **Meal Analysis**: Upload food image in Meal Cam
   - Receive nutrition breakdown
   - Macro alerts trigger when exceeded

3. **Face Analysis**: Upload face image in Face Cam (when skincare goal)
   - Interactive face map appears
   - 13 skin scores display
   - Detailed concerns show

4. **PDF Academy**: Upload a skincare or nutrition PDF
   - Generate flashcards
   - Create interactive quiz
   - Build lessons
   - Extract summary

5. **Female Hormonal**: Set gender to Female
   - Hormone symptom checker appears
   - 3+ symptoms checked → PCOS guidance displays

## 📦 Tech Stack
- **Frontend**: HTML5, CSS3, Vanilla JavaScript
- **Backend**: Node.js, Express.js
- **APIs**: Google Gemini 1.5 Flash, Groq (optional)
- **Database**: LocalStorage (client-side)
- **PWA**: Service Worker, Web Push API, Manifest
- **PDF**: PDF.js (client-side extraction)

## 🤝 Support

For issues or feature requests, please open an issue on GitHub.

## 📄 License

MIT License - See LICENSE file for details

---

**Reliv Companion**: Transform your wellness journey with AI-powered insights.
