# MoneyPulse — Financial Health v8

A local-first personal finance check-in app for monthly cash-flow, protection, investing and progress tracking.

## v8 changes

- Dark, compact workspace inspired by modern desktop productivity/PDF tools.
- Sidebar navigation with separate working pages:
  - Overview — short monthly snapshot and section shortcuts.
  - Income — take-home income and spouse/other income.
  - Monthly bills & expenses — EB, rent, WiFi & DTH, phone bills, food, medical, maid/helper, loan/EMI, travel expenses, entertainment, shopping and miscellaneous.
  - Safety & goals — health insurance, life/term cover, emergency fund and monthly investments.
  - Your score — 100-point financial-health model, ratios and spending distribution.
  - Strengths & actions — strengths, gaps and practical next steps.
  - Monthly comparison — month-by-month progress.
- Each field has a short description/icon and optional quick amount chips.
- `Fuel` is now called `Travel expenses`.
- Added `Phone bills` and a dedicated `Monthly bills & expenses` section.
- First page is intentionally short; detailed entry is split across pages.
- Save button stores the selected month and opens a large success dialog with falling color-paper confetti.
- Success message: **Thank you! Your data is saved successfully.**
- If Gmail is configured, a save-confirmation email is sent after a successful save.
- Welcome email is sent after the user's first verified login.
- Gmail verification remains supported.
- AI Coach remains available as a dialog from the sidebar on every page.
- No native third-party npm modules; uses Node built-ins and SQLite.

## Run

Requires Node.js 24.x or newer (the project uses built-in `node:sqlite`).

```bat
npm install
npm start
```

Open `http://localhost:3000`.

For local testing without Gmail, registration shows a local verification link. For real Gmail delivery, configure a Google App Password.

## `.env`

Copy `.env.example` to `.env` and configure:

```env
PORT=3000
SESSION_SECRET=replace-with-a-long-random-secret
PUBLIC_BASE_URL=http://localhost:3000
GMAIL_USER=yourgmail@gmail.com
GMAIL_APP_PASSWORD=your-google-app-password
GEMINI_API_KEY=your-gemini-api-key
GEMINI_MODEL=gemini-3.8-flash
GEMINI_ENABLE_WEB_SEARCH=false
```

Never commit `.env` or API keys.

## Score model

The score is transparent and rule-based, out of 100:

- Savings rate — 20 points
- Essentials share — 15 points
- EMI burden — 15 points
- Emergency fund — 20 points
- Health insurance — 10 points
- Term insurance — 10 points
- Investing rate — 10 points

The score is educational and is not a credit score or individualized financial advice.

## Data model

Monthly entries are stored by `user_id + YYYY-MM`. This means October 2026 and November 2026 remain separate records and can be compared later.

The app migrates legacy `fuel` values to `travel_expenses` and legacy `wifi_ott` values to `wifi_dth` when an older database is opened.

## Email behavior

1. Registration creates an unverified account.
2. A Gmail verification message is sent when Gmail SMTP is configured.
3. Verification activates the account.
4. The first verified login sends a richer welcome email.
5. Saving a month sends a save-confirmation / thank-you email when Gmail SMTP is configured.

If Gmail is not configured, the app remains usable for local testing and displays the local verification link.

## AI Coach

The browser never receives the Gemini API key. The server calls the Google Gemini API and supplies the selected month's financial snapshot plus recent chat history. The AI should be treated as an educational explainer, not a substitute for professional financial advice.


## v9 visual refresh

The v9 UI refresh uses a polished dark desktop-workspace theme inspired by the supplied reference: charcoal canvas, coral accents, larger readable navigation, calmer spacing, rounded panels and a responsive sidebar. A new theme storage key ensures the dark theme is selected by default after upgrading; use the theme control to switch to Light, Mint or Violet. CSS and JavaScript assets use v9 cache-busting query strings.


## Visual theme update
This build adapts the PDFForge College visual style: cool light workspace, charcoal left navigation, coral accent, crisp white cards, muted secondary text, and rounded controls. Theme variants remain available.


## v12 expense-page refinements
- Removed the separate Phone bills field; phone plans are included in **WiFi, DTH & phone**.
- Added **Education expenses** for school/college fees, tuition, books and courses.
- Added a live financial-health score wheel to the expenses page.
- Removed the accidental badge-like styling over navigation labels and the vertical focus stripe near the ₹ prefix.
- Existing saved phone-bill amounts are merged into WiFi/DTH during database startup.


## v15 save-flow fix
- Navigation between the Income, Expenses, Safety & Goals, Score, Actions and Comparison sections now uses client-side route changes without reloading the page. This prevents unsaved income or expense values from disappearing while moving between sections.
- The save form uses explicit JavaScript validation so a required field in a hidden section cannot silently block the Save button.
- Save validates the selected `YYYY-MM` month and income, writes to SQLite for the authenticated user/month, reads the record back from SQLite, and only then shows the success dialog.
- The browser performs a separate authenticated read-back check before showing the success state. On failure, it keeps the current form values and displays the error instead of pretending the save succeeded.
- Save failures are logged with route/method details on the server and return a more specific save error.
- Updated asset cache versions to v15.


## Login month selection and overview (v17)

- Every authenticated app entry/login opens the month-and-year gate before the workspace.
- The gate clears any stale browser-selected month so the user must explicitly choose a period.
- After continuing, the chosen period remains selected even if it has no saved data yet.
- Each record is saved separately using the authenticated user's ID and `YYYY-MM`; choosing a new month does not overwrite another month.
- The overview keeps the concise “Make your money easier to understand” monthly check-in and adds a clear month-by-month comparison shortcut.


## v23 AI Coach reliability and personalization
- Uses a longer but bounded Gemini request timeout and low thinking effort for conversational responses, instead of timing out almost every request at 3.5 seconds.
- Avoids sending the current user message twice in the Gemini history.
- Supplies category-level expenses, spouse income, emergency savings, insurance and investment figures to the coach context.
- Makes the instant fallback explain the highest-priority score gaps and recognizes questions such as "how do I increase my score?"
- The local fallback remains available when Gemini is overloaded, unavailable or over quota; this is not a live AI response.


## Windows startup troubleshooting (v24)
- Run `start.bat` by double-clicking it, or run `npm start` from this folder.
- The terminal now prints the project folder and listening address after the server starts.
- If startup fails, the terminal stays open and displays the error.
- If port 3000 is already occupied, set `PORT=3001` in `.env` and restart, then open http://localhost:3001.
- Node.js 22.5 or newer is required because this app uses the built-in `node:sqlite` module.


## Mobile, tablet and laptop access (v25)

The layout now adapts to phone, tablet, laptop and desktop widths. The manifest and service worker enable installable-app support where the browser accepts the origin as secure (normally HTTPS or localhost). The service worker caches only the static app shell; it does not cache API responses or personal financial data.

### Open on another device on your trusted local network
1. Start MoneyPulse with `start.bat` or `npm start`. The server listens on `0.0.0.0` so devices on the same LAN can connect.
2. On Windows, run `ipconfig` and find the IPv4 address of the active Wi-Fi/hotspot adapter.
3. From a phone/tablet on the same network, open `http://YOUR-PC-IP:3000`. Replace `YOUR-PC-IP` with the real IPv4 address.
4. If it does not open, allow Node.js/port 3000 through Windows Defender Firewall on a trusted Private network only, and check whether the hotspot isolates connected devices.

Important: HTTP over a local IP may not allow PWA installation on some mobile browsers. For installable use across devices, deploy behind HTTPS. Do not expose this personal-finance app to public networks without HTTPS and appropriate security controls.


## Gmail verification email troubleshooting

- Set `GMAIL_USER` to the Gmail address you control.
- Set `GMAIL_APP_PASSWORD` to a Google **App Password**, not your normal Gmail password. App Passwords require 2-Step Verification on the Google account. Remove spaces from the value if you prefer; the server also strips spaces automatically.
- Restart MoneyPulse after editing `.env`.
- The server logs the underlying SMTP failure (for example, authentication rejected, connection timeout, or recipient rejected). Never post your `.env` file or app password publicly.
- Use `POST /api/auth/test-email` while signed in to test sending. If it fails, inspect the terminal message.
- If registering on a phone using your PC's local network address, set `PUBLIC_BASE_URL` to `http://YOUR-PC-IP:3000` so the verification link opens the PC-hosted app instead of the phone's own `localhost`. Keep this address private to your trusted network.

The SMTP response reader now buffers Gmail's greeting and multi-line responses, avoiding a race where the initial `220` greeting could be missed.


## v28 brand icon consistency

- The supplied `icon.svg` is used as the site favicon, header brand icon, and source artwork for the PWA install icons.
- The 192×192 and 512×512 PNG icons are generated from that same SVG so Chrome's tab, install UI, and installed-app icon match.
- The service-worker cache version is bumped to v28 so browsers fetch the updated assets after reload.

## v28 verification performed

- Node syntax checks: `server.js`, `public/app.js`, `public/service-worker.js`.
- HTTP smoke tests: application routes, CSS, JavaScript, manifest, SVG/PNG icons, service worker and health endpoint.
- Functional API checks: invalid/valid registration, verification link, verified session, monthly profile read/write, month comparison, feedback validation and submission, logout.
- HTML/JavaScript selector check: all literal IDs referenced by `app.js` exist in `index.html`; no duplicate HTML IDs found.

Gmail delivery and Gemini responses require valid credentials and were not tested without the user's private keys. Visual testing in a real Chrome/Edge window is still recommended after extracting this build.
