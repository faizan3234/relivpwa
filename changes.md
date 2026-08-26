# Changes Log

Date: 2026-08-26

## Bugs found and fixed

- **The deployed app never called the backend.** `BACKEND_URL` in `app.js` was
  hardcoded to `''` for every non-localhost origin, so on Netlify the AI proxy,
  image analysis and push registration all silently fell back to client-only
  mode. Pointed it at `https://relivpwa.onrender.com`. This is the direct cause
  of "image analysis not working" - vision fell back to a path that requires the
  user to paste their own Gemini key into Settings.
- **Every push notification went to every device.** Subscriptions were one flat
  `Set` with no user identity, and `broadcast()` fanned out to all of them.
  Reminder schedules collided on a shared key (`daily-reset-warning`), so with
  two users one overwrote the other and both got both. Subscriptions are now a
  `Map` of userId -> Set of devices, schedules are namespaced `userId::key`, and
  reminders go through `sendToUser`. `broadcast` remains for admin/test only.
- **Dead model IDs.** `llama-3.1-70b-versatile` and
  `llama-3.2-11b-vision-preview` are both decommissioned at Groq, and the
  backend used `gemini-1.5-flash` while the client used `gemini-2.0-flash`.
  Moved all three to env-overridable constants with current defaults.
- **API keys hardcoded in committed source.** `server.js` had literal Gemini and
  Groq keys as fallbacks. Removed; they are env-only now. **Both were public in
  the GitHub repo and must be rotated.**
- **XSS in the chat.** `renderMessages` interpolated message text straight into
  `innerHTML`. Now escaped via `escapeHtml`.
- **setTimeout overflow.** Reminders more than ~24.8 days out wrapped a signed
  32-bit int and fired immediately. `armSchedule` now re-arms in chunks.

## Features added

- **Paid streak restore (Razorpay).** Snapchat-style: the streak is already
  lost, and the user deliberately buys it back at a price shown before
  checkout. Price is decided server-side (Rs.5 min, scales with streak length,
  Rs.25 cap) so the client cannot forge it. Signature verified with an HMAC
  timing-safe compare. Falls back to a free restore if payments are not
  configured or checkout fails to load - the streak is never held hostage.
- **Per-message copy button in the chat**, with a `document.execCommand`
  fallback for insecure contexts.
- **App-wide text selection lock**, with inputs and textareas exempted so forms
  still work.
- **Hard desktop gate.** Decided by an inline `<head>` script so the phone UI
  never flashes. Uses `navigator.userAgentData.mobile` where available, falling
  back to UA plus a `maxTouchPoints` check for iPadOS. Escape hatch:
  `?desktop=1` to allow, `?desktop=0` to re-enable.
- **Boot loader with rotating copy** (Blinkit/Zomato style), with a 6s hard
  ceiling so a hung request never strands the user on a spinner.
- **Coach tone rules** in the system prompt: no `---` separators, no filler
  openers, short by default, encouragement tied to the user's real numbers.

## Validation

- `node --check` passes on `app.js` and `backend/server.js`.
- Served locally and driven in a browser. Verified: desktop gate shows and
  hides `.app-shell`; mobile UA bypasses the gate and renders the app;
  `user-select: none` on body with `text` on inputs; copy buttons render with
  correct markup and the delegated handler fires; userId generated and persisted.
- NOT verified: a successful clipboard write under real user activation (the
  automation harness cannot produce an activated click), and the Razorpay
  checkout flow end to end (needs live keys set on the server).
- Service worker registration failed in the preview browser. Both SW files
  serve 200 with `text/javascript`, so this looks like a sandbox restriction,
  but it should be confirmed on a real phone.

## Second pass - install and notifications

- **The app was not installable at all.** `manifest.json` declared
  `icons/icon-192.svg` and `icons/icon-512.svg` (Chrome will not accept SVG for
  the installability check) plus `file.jpg` declared as `512x512` when the file
  is **actually 423x423**. Chrome verifies real decoded dimensions, so no icon
  qualified, `beforeinstallprompt` never fired, and the Install button had
  nothing to show. Generated real PNGs (192, 512, maskable 512, 180 apple-touch)
  from the existing SVG artwork with a small PNG encoder, and rewrote the
  manifest. Verified in-browser: every declared size now matches the decoded
  size, and 192 / 512 / maskable are all present.
- **Install button did nothing on iOS.** The top-bar handler bailed out with
  `if (!installPrompt) return;` - and iOS is permanently in that state, since
  Safari has no `beforeinstallprompt`. It now routes through
  `showInstallPrompt()`, which shows the Share -> Add to Home Screen
  instructions on iOS and the native prompt everywhere else. Also hides the
  button when already running standalone, and clears it on `appinstalled`.
- **Notification icons were SVG**, which Android does not render - they would
  have shown a blank/default glyph. Swapped to `icon-192.png` in `app.js` and
  `sw.js`. Bumped the cache to `relix-v6`.
- **Goal-aware notification copy.** The end-of-day push was the same sentence
  for every user (`"Please complete your count before it resets!"`). There is
  now a per-goal nudge bank covering muscle, fat loss and the five skin goals,
  filled with the user's real remaining protein/hydration, with a different
  line when the target is already met. Verified across goals plus the
  unknown-goal fallback.

## Third pass - payment-gated restore, security, retention

- **Restore is now payment-only.** Every free fallback was removed from
  `restoreStreak`. If the backend is unreachable, the order cannot be created,
  or Razorpay checkout fails to load, the user is told and the streak stays
  restorable - it is never granted. Silently restoring on error would have made
  the paywall bypassable by going offline at the right moment.
- **Fixed the bug that made paid restores worthless.** `checkDailyReset`
  overwrote `restorableStreak` on every miss, so a second missed day (when the
  streak was already 0) wrote 0 over the real number and the streak became
  unrecoverable at any price - including for someone who had just paid. Now
  guarded with `if (state.streak > 0)`.
- **Added `/api/streak/restore/claim`.** If the app dies between a verified
  payment and the streak being written, the next launch picks it up, so nobody
  pays and gets nothing. Claiming also consumes the record so one payment
  cannot be replayed for a second free restore later.
- **Rate limited the AI proxy.** `/api/ai/chat` (20/min) and both vision routes
  (6/min) are per-IP token buckets, honouring `X-Forwarded-For` behind a proxy,
  with an expiry sweep so the map cannot grow forever. These routes have no
  auth, so unmetered they were an open tap on the Gemini and Groq budget.
- **Quiet hours (22:00-07:00).** Every scheduled push is shifted to 07:15
  rather than firing overnight. One 3am buzz costs you notification permission
  permanently, and permission is not something you get a second chance at.
- **Onboarding benchmark ramp.** The streak bar starts at 55% and climbs to the
  full 80% over seven days. A flat 80% from day one meant a new user very
  likely missed on their first day, and a day-one miss strongly predicts churn.
- **Comeback message** for anyone returning after 2+ days, instead of a wall of
  missed days.
- **History window 14 -> 90 days.**

### Verified this pass

- Rate limits: chat allowed 20 then returned 429; vision allowed 6 then 429.
- Claim lifecycle: unpaid -> empty; paid -> returns 9; replay -> consumed;
  a different userId cannot claim someone else's payment.
- Benchmark ramp: 55% / 59% / 66% / 76% at days 0/1/3/6, 80% from day 7.
- Quiet hours: 14:00 unchanged, 21:59 unchanged (boundary), 23:30 -> next
  07:15, 03:00 -> same day 07:15.
- Multi-break: streak 12 -> break -> restorable 12; break again -> restorable
  still 12 (previously clobbered to 0).
- Offline restore attempt: streak stayed 0 and the restorable value was kept -
  no free restore.

## Known gaps for the next AI

- **The payment ledger is on ephemeral disk.** `restores.json`,
  `subscriptions.json` and `schedules.json` are written to the container
  filesystem. Render's free tier wipes that on every redeploy, so paid restores
  and push subscriptions WILL be lost. A payment record that can vanish is not
  acceptable - this needs a real database before taking money.
- **There are no accounts.** `RELIV_USER_ID` is a local anonymous id in
  `localStorage`. It does not follow a user to a new phone, and clearing site
  data creates a new identity. Per-user notifications work, but "1000 users,
  each with their own data, across their devices" needs real auth plus
  server-side state.
- Still open: day-window anchored to first meal, coach undo/redo, and a
  streak-freeze mechanic.
