# Changes Log

Date: 2026-07-12

## What was changed

- Added immediate tracker updates for direct chat commands such as changing streak, XP, calorie target, protein target, routine progress, and daily score.
- Centralized tracker refresh so dashboard, profile, routine, and planner UI update immediately after changes.
- Added duplicate-meal detection and confirmation prompts for similar foods logged close together.
- Routed quick-pick logs, custom food logs, shake logs, suggested food logs, and vision meal logs through the same shared food logging path.
- Updated the AI chat schema so the assistant can return explicit tracker updates like `updateStreak`, `updateXpDelta`, `updateTargetCalories`, `updateTargetProtein`, `updateRoutineProgress`, and `updateDailyScore`.
- Updated the AI progress planner text so it reflects the current calorie and protein targets in the UI.
- Hardened push-notification bootstrap so local smoke tests do not throw runtime errors when VAPID keys or Push API support are unavailable.
- Updated `push_to_git.bat` so it runs from the repo folder, detects the current branch, skips empty commits, and pushes the active branch with upstream tracking.

## Validation

- `node --check app.js` passed.
- Browser smoke test against `http://localhost:8000/` passed with no page errors after the push-sync guard was added.

## Notes for the next AI

- The main behavior changes live in `app.js`.
- The push script change is in `push_to_git.bat`.
- Local backend smoke testing required installing backend dependencies once, but the temporary lockfile was removed afterward so the repo diff stays focused.