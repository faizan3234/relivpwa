# Relix Companion

Relix Companion is a premium, offline-ready Progressive Web App built with pure HTML, CSS, and vanilla JavaScript. It includes a polished dashboard, routine planner, wellness coach, meal camera simulation, profile experience, and installable PWA support for Netlify.

## Features
- Apple-style glass UI and animations
- Offline caching via service worker
- Install prompt and home screen support
- Local-only storage and data export
- Wellness coach with local RAG knowledge and safe refusal handling
- Meal upload simulation with daily limit

## Run locally
Open index.html in a browser, or deploy the folder directly to Netlify.

## Notes
- The app works fully without a backend.
- The coach uses local knowledge by default and can optionally use a Groq API key by defining window.RELIX_GROQ_API_KEY before loading the app.
