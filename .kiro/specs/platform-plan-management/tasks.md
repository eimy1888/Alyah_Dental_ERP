# Implementation Plan: Platform Plan Management

## Overview

Remaining frontend work for the platform admin panel: wiring up light/dark mode theming with a persistent toggle, and integrating Amharic (አማርኛ) internationalisation across all platform pages. All backend tasks and core frontend component tasks are already complete.

## Task Dependency Graph

```json
{
  "waves": [
    { "wave": 1, "tasks": ["1", "8"] },
    { "wave": 2, "tasks": ["2", "9"] },
    { "wave": 3, "tasks": ["3", "10"] },
    { "wave": 4, "tasks": ["4", "11"] },
    { "wave": 5, "tasks": ["5", "6", "7", "12", "13", "14", "15"] }
  ],
  "dependencies": {
    "2":  ["1"],
    "3":  ["2"],
    "4":  ["3"],
    "5":  ["4"],
    "6":  ["4"],
    "7":  ["4"],
    "9":  ["8"],
    "10": ["9"],
    "11": ["10"],
    "12": ["11"],
    "13": ["11"],
    "14": ["11"],
    "15": ["11"]
  }
}
```

## Notes

- All backend tasks (migrations, models, middleware, controllers, routes, scheduler) and the core frontend service/component tasks (`platformService.js`, `Subscriptions.jsx`, `Clinics.jsx`) are already complete.
- The remaining work is purely frontend: light/dark theme wiring and Amharic i18n integration.
- Amharic translations must be natural and contextual — not mechanical word-for-word. Follow the approved translation decisions listed in each task.
- Tailwind `darkMode: 'class'` is already configured. Tasks only wire the runtime toggle and apply `dark:` variants.
- `i18next` and `react-i18next` are already installed. Tasks only set up the config and integrate into components.

---

## Tasks

### Theme — Light / Dark Mode

- [x] 1. Create `useTheme` hook in `src/hooks/useTheme.js`
  - Read initial theme from `localStorage` key `dentflow-theme`; fall back to OS preference via `window.matchMedia('(prefers-color-scheme: dark)')`
  - Expose `theme` (`'light' | 'dark'`) and `toggleTheme()`
  - `toggleTheme` must add/remove the `dark` class on `<html>` and persist the choice to `localStorage`
  - Export a `ThemeProvider` context wrapper that calls the hook and stores the value in React context so child components can consume it via `useContext`

- [x] 2. Wire `ThemeProvider` into `src/main.jsx`
  - Wrap the existing provider tree with `ThemeProvider`
  - Apply the saved/detected theme class to `<html>` before first paint to prevent a flash of the wrong theme
  - Import and initialise the i18n instance here as well (required by task 8)
  - _Depends on: 1_

- [x] 3. Add theme toggle button to `PlatformLayout` topbar
  - Import `Sun` and `Moon` icons from `lucide-react`
  - Place the toggle button between the bell icon and the user avatar in the topbar
  - Show `Moon` icon when `theme === 'light'` (clicking switches to dark); show `Sun` icon when `theme === 'dark'` (clicking switches to light)
  - Use `useTheme()` context hook — do not read `localStorage` directly inside the component
  - _Depends on: 2_

- [x] 4. Apply dark-mode Tailwind variants to `PlatformLayout`
  - Sidebar background: `dark:bg-[#060d1a]`
  - Main content area background: `dark:bg-gray-950`
  - Topbar: `dark:bg-gray-900 dark:border-gray-800`
  - Active nav item and hover states: ensure sufficient contrast against dark sidebar
  - Text and icon colours: `dark:text-gray-100` for primary, `dark:text-gray-400` for muted
  - _Depends on: 3_

- [x] 5. Apply dark-mode variants to `Subscriptions.jsx`
  - Page and card backgrounds: `dark:bg-gray-900 dark:border-gray-800`
  - Table header: `dark:bg-gray-800`; alternating row stripes: `dark:bg-gray-900 / dark:bg-gray-850`
  - Modal overlay: `dark:bg-black/60`; modal card: `dark:bg-gray-900 dark:border-gray-700`
  - Plan type badges (Free/Paid) and subscription status badges: adjusted for dark contrast
  - All input fields, selects, labels: `dark:bg-gray-800 dark:border-gray-700 dark:text-gray-100`
  - Expiry warning banner: `dark:bg-amber-900/40 dark:border-amber-700 dark:text-amber-200` (replacing amber-50 light variant)
  - _Depends on: 4_

- [x] 6. Apply dark-mode variants to `Clinics.jsx`
  - Table rows and header cells: same dark pattern as Subscriptions
  - Subdomain status badge Active: `dark:bg-green-900/40 dark:text-green-300`; Disabled: `dark:bg-red-900/40 dark:text-red-300`
  - Enable/Disable subdomain action buttons: ensure hover and focus states work on dark backgrounds
  - Subdomain health sidebar panel: `dark:bg-gray-900 dark:border-gray-700`
  - Expiry warning banners: `dark:bg-amber-900/40` variant
  - _Depends on: 4_

- [x] 7. Apply dark-mode variants to remaining platform pages (`Dashboard.jsx`, `Approvals.jsx`, `Users.jsx`, `AuditLog.jsx`, `Settings.jsx`)
  - KPI stat cards: `dark:bg-gray-900 dark:border-gray-800`
  - Section headings: `dark:text-gray-100`; muted/secondary text: `dark:text-gray-400`
  - Status badges and icon containers: adjusted for dark backgrounds using the same colour scale used in tasks 5–6
  - Tables, filters, and search inputs: consistent `dark:bg-gray-800 dark:border-gray-700` treatment
  - _Depends on: 4_

---

### Internationalisation — Amharic (አማርኛ)

- [x] 8. Set up i18n configuration in `src/lib/i18n.js`
  - Initialise `i18next` with the `react-i18next` plugin (`initReactI18next`)
  - Define two languages: `en` (English, default) and `am` (Amharic)
  - Register translation namespaces: `common`, `platform`, `subscriptions`, `clinics`
  - Detect persisted language from `localStorage` key `dentflow-lang`; fall back to `'en'`
  - Import and call `i18n.init(...)` in `src/main.jsx` (coordinate with task 2)

- [x] 9. Create English baseline translation file `src/locales/en/platform.json`
  - Include every UI string currently hard-coded across all platform admin pages:
    - Navigation: Dashboard, Clinics, Approvals, Subscriptions, Users, Audit Log, Settings, Logout
    - Page / section titles: Platform Admin, Plan Management, Clinic Subscriptions, Payment History, Subdomain Access Control
    - Table headers: Clinic Name, Subdomain, Plan, Plan Type, Status, Expiry Date, Days Remaining, Payment Status, Amount, Method, Reference, Date, Actions
    - Status labels: Active, Expired, Pending, Suspended, Disabled, Free, Paid, Monthly, Annual, Days
    - Buttons: Assign Plan, Record Payment, Enable Subdomain, Disable Subdomain, Create Plan, Edit Plan, Delete Plan, Save, Cancel, Close, Confirm, View History
    - Modal titles: Assign Plan to Clinic, Record Payment, Payment History, Create New Plan, Edit Plan, Confirm Delete
    - Search / filter placeholders: Search clinics…, Filter by status, Filter by plan type
    - Expiry messages: "Subscription expires in {{days}} days", "Subscription expired", "No active subscription"
    - Validation / error messages: "Plan is inactive and cannot be assigned", "Payment amount does not match expected amount for this billing cycle", "Expected amount: {{amount}} ETB", "Active subscriptions exist — plan cannot be deleted ({{count}} blocking)", "Subdomain is suspended", "Subscription expired — access denied"
    - Empty states: "No plans created yet", "No clinics found", "No payment history"
    - Confirmation prompts: "Are you sure you want to delete this plan?", "This will immediately revoke subdomain access."
    - Toast messages: "Plan assigned successfully", "Payment recorded successfully", "Subdomain enabled", "Subdomain disabled", "Plan created", "Plan updated", "Plan deleted"
  - _Depends on: 8_

- [x] 10. Create Amharic translation file `src/locales/am/platform.json`
  - Translate every key from `en/platform.json` using **natural, contextual Amharic** suited to Ethiopian dental clinic administrators
  - Translations must read as a native speaker would phrase them in professional software — not word-for-word anglicised equivalents
  - Apply these approved translations exactly:
    - "Assign Plan" → **"እቅድ ይመድቡ"**
    - "Record Payment" → **"ክፍያ ይመዝግቡ"**
    - "Payment History" → **"የክፍያ ታሪክ"**
    - "Subscription" → **"የደንበኝነት ምዝገባ"**
    - "Active" (status) → **"ንቁ"**
    - "Expired" (status) → **"ጊዜው ያለፈ"**
    - "Pending" (status) → **"በመጠባበቅ ላይ"**
    - "Suspended" (status) → **"ታግዷል"**
    - "Disabled" (subdomain) → **"ተዘግቷል"**
    - "Enable Subdomain" → **"ንዑስ ጎራ አንቃ"**
    - "Disable Subdomain" → **"ንዑስ ጎራ አግድ"**
    - "Free" (plan type) → **"ነጻ"**
    - "Paid" (plan type) → **"የሚከፈልበት"**
    - "Monthly" → **"ወርሃዊ"**
    - "Annual" → **"ዓመታዊ"**
    - "Days Remaining" → **"የቀሩ ቀናት"**
    - "Expiry Date" → **"የሚያበቃበት ቀን"**
    - "Plan Management" → **"የእቅድ አስተዳደር"**
    - "Clinic Subscriptions" → **"የክሊኒክ ደንበኝነት ምዝገባዎች"**
    - "No active subscription" → **"ንቁ የደንበኝነት ምዝገባ የለም"**
    - "Subscription expires in {{days}} days" → **"የደንበኝነት ምዝገባ በ{{days}} ቀናት ውስጥ ያበቃል"**
    - "Subdomain is suspended" → **"ንዑስ ጎራው ታግዷል"**
    - "Plan assigned successfully" → **"እቅዱ በተሳካ ሁኔታ ተመድቧል"**
    - "Payment recorded successfully" → **"ክፍያው በተሳካ ሁኔታ ተመዝግቧል"**
    - "Platform Admin" → **"የፕላትፎርም አስተዳዳሪ"**
    - "Logout" → **"ውጣ"**
    - "Dashboard" → **"ዋና ገጽ"**
    - "Clinics" → **"ክሊኒኮች"**
    - "Approvals" → **"ማፅደቂያዎች"**
    - "Users" → **"ተጠቃሚዎች"**
    - "Audit Log" → **"የኦዲት መዝገብ"**
    - "Settings" → **"ቅንብሮች"**
    - "Save" → **"አስቀምጥ"**
    - "Cancel" → **"ሰርዝ"**
    - "Confirm" → **"አረጋግጥ"**
    - "Close" → **"ዝጋ"**
    - "Create Plan" → **"እቅድ ፍጠር"**
    - "Edit Plan" → **"እቅድ አርትዕ"**
    - "Delete Plan" → **"እቅድ ሰርዝ"**
    - "No plans created yet" → **"እስካሁን ምንም እቅድ አልተፈጠረም"**
    - "No clinics found" → **"ምንም ክሊኒክ አልተገኘም"**
    - "No payment history" → **"የክፍያ ታሪክ የለም"**
    - "Are you sure you want to delete this plan?" → **"ይህን እቅድ መሰረዝ እርግጠኛ ነዎት?"**
    - "This will immediately revoke subdomain access." → **"ይህ ወዲያውኑ የንዑስ ጎራ መዳረሻን ይሰርዛል።"**
    - Remaining strings follow the same natural-Amharic convention — avoid anglicised loanwords where a clear Amharic equivalent exists
  - _Depends on: 9_

- [x] 11. Add language toggle button to `PlatformLayout` topbar
  - Render a compact `EN | አማ` toggle beside the theme toggle button in the topbar
  - On click, call `i18n.changeLanguage('am')` or `i18n.changeLanguage('en')` and persist the choice to `localStorage` key `dentflow-lang`
  - All translated strings across the app must update reactively without a page reload
  - _Depends on: 10_

- [x] 12. Integrate `useTranslation` into `Subscriptions.jsx`
  - Import `useTranslation` from `react-i18next` and call `const { t } = useTranslation('platform')`
  - Replace every hard-coded UI string with a `t('key')` call:
    - Page title, tab labels (Plans / Clinic Subscriptions)
    - All table headers
    - Button labels (Assign Plan, Record Payment, Create Plan, Edit Plan, Delete Plan)
    - Modal titles and all labels inside modals
    - Plan type badges (Free/Paid) and subscription status badges
    - Expiry warning text (use interpolation: `t('expiresInDays', { days })`)
    - Empty state messages
    - Toast messages via the toast call arguments
    - Inline validation error messages
  - _Depends on: 11_

- [x] 13. Integrate `useTranslation` into `Clinics.jsx`
  - Same `useTranslation('platform')` pattern as task 12
  - Replace all hard-coded strings:
    - Page title
    - Table headers (Clinic Name, Subdomain, Status, Subscription, Expiry, Actions)
    - Button labels (Enable Subdomain, Disable Subdomain)
    - Subdomain status badge labels (Active / Disabled)
    - Expiry warning banner text
    - Sidebar panel labels
    - Search input placeholder
    - Empty state message
  - _Depends on: 11_

- [x] 14. Integrate `useTranslation` into `PlatformLayout` nav labels
  - Call `useTranslation('platform')` inside `PlatformLayout`
  - Pass each `navItems` label through `t()` so the sidebar navigation is fully translated when Amharic is active
  - Translate: Dashboard, Clinics, Approvals, Subscriptions, Users, Audit Log, Settings
  - User block role label: `t('platformAdmin')` → **"የፕላትፎርም አስተዳዳሪ"**
  - Logout button: `t('logout')` → **"ውጣ"**
  - _Depends on: 11_

- [x] 15. Integrate `useTranslation` into remaining platform pages (`Dashboard.jsx`, `Approvals.jsx`, `Users.jsx`, `AuditLog.jsx`, `Settings.jsx`)
  - Apply `useTranslation('platform')` on each page
  - Replace all hard-coded strings: page titles, section headings, KPI card labels, table headers, button labels, status text
  - Follow the same natural-Amharic conventions established in the translation files (tasks 9–10)
  - Ensure no page reloads on language switch — all strings update reactively
  - _Depends on: 11_
