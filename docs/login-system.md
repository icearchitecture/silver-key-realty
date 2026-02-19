# Silver Key Realty — Login System Documentation

Last updated: February 2026

---

## Overview

Silver Key Realty uses a two-tier authentication system powered by Supabase Auth:

1. **Public Login Modal** — accessible from the homepage and all pathway pages via the "Login" nav button. Routes users by role (Buyer, Seller, Investor, Renter, Agent, Employee).
2. **Admin Employee Portal** — a dedicated login page at `/admin/` for internal team members with email/password, magic link, and SSO support.

All OAuth and magic link redirects route to `/admin/`. The auth-router (`assets/js/auth-router.js`) then determines whether the user is a team member or a client and redirects accordingly.

---

## Architecture

```
Homepage / Pathway Pages
  └── Login button (nav bar + mobile menu)
        └── Login Modal (dynamically injected JS)
              ├── Step 1: Role Selection (6 tiles, 3x2 grid)
              │     Buyer, Seller, Investor, Renter, Agent, Employee
              ├── Step 2: Auth Options
              │     ├── Entra ID / SSO (Employee + Agent only)
              │     ├── Google OAuth
              │     ├── Microsoft OAuth
              │     └── Email (magic link)
              └── Step 3: Confirmation ("Check your inbox")

/admin/ (Employee Portal)
  └── Login Card
        ├── Email + Password
        ├── Magic Link
        └── Session auto-redirect (if already logged in)

/admin/dashboard/ (post-login)
  └── Role gate checks team membership via skr_team_members
  └── Non-team users redirected to /admin/portal/
```

---

## Files

| File | Purpose |
|------|---------|
| `index.html` | Homepage with login modal JS (inline `<script>`) |
| `buyer/index.html` | Buyer pathway with login modal JS |
| `seller/index.html` | Seller pathway with login modal JS |
| `investor/index.html` | Investor pathway with login modal JS |
| `rentals/index.html` | Rentals pathway with login modal JS |
| `admin/index.html` | Employee Portal login page |
| `admin/portal/index.html` | Client portal (non-team redirect) |
| `admin/dashboard/index.html` | Admin dashboard (post-login) |
| `assets/js/admin-auth.js` | Auth logic: login, magic link, session check, schema detection |
| `assets/js/auth-router.js` | Post-OAuth routing (team vs client) |
| `assets/js/admin-config.js` | Supabase credentials (generated at build time) |
| `assets/js/nav.js` | Mobile menu with "Login / Get Started" link |
| `assets/css/nav.css` | Login modal styles, mobile menu styles |
| `assets/css/admin.css` | Employee Portal login card styles |
| `scripts/inject-admin-config.js` | Build script that generates admin-config.js from env vars |

---

## Public Login Modal

### How it works

The login modal is **not** static HTML in the DOM. It is stored as a JavaScript string (`_loginModalHTML`) and dynamically created/destroyed:

- `openLoginModal()` — creates a `<div>` with the modal HTML, appends it to `document.body`
- `closeLoginModal()` — removes the modal element from the DOM entirely
- Escape key closes the modal
- Clicking the dark backdrop closes the modal

This approach avoids CSS specificity issues that previously caused the modal content to render as visible raw text.

### Step 1: Role Selection

Six tiles in a 2-column grid (1-column on mobile):

| Tile | Role Key | Action |
|------|----------|--------|
| I'm Buying | `buyer` | Goes to Step 2 |
| I'm Selling | `seller` | Goes to Step 2 |
| I'm Investing | `investor` | Goes to Step 2 |
| I'm Renting | `renter` | Goes to Step 2 |
| I'm an Agent | `agent` | Goes to Step 2 (shows Entra ID) |
| Employee Portal | `employee` | Goes to Step 2 (shows Entra ID) |

The selected role is saved to `localStorage` as `skr_selected_role`.

### Step 2: Auth Options

| Method | Available To | Provider |
|--------|-------------|----------|
| Entra ID (SSO) | Employee, Agent | `azure` with `email openid profile` scopes |
| Google | All roles | `google` |
| Microsoft | All roles | `azure` |
| Email (magic link) | All roles | `signInWithOtp` |

All OAuth redirects go to: `window.location.origin + '/admin/'`

### Step 3: Confirmation

Shown after sending a magic link. Displays the email address and a "Try a different method" back link.

### Supabase Initialization

Each page initializes Supabase from `admin-config.js`:

```javascript
var sb = (function() {
  var url = (window.SKR_CONFIG && window.SKR_CONFIG.SUPABASE_URL) || 'https://onhwgirbmoxaquxpkfie.supabase.co';
  var key = (window.SKR_CONFIG && window.SKR_CONFIG.SUPABASE_ANON_KEY) || '';
  return supabase.createClient(url, key);
})();
```

---

## Admin Employee Portal (`/admin/`)

### Login Methods

1. **Email + Password** — standard `signInWithPassword`, followed by team membership verification
2. **Magic Link** — `signInWithOtp`, redirects to `/admin/auth/callback/` (legacy `/admin/callback/` forwards)

### Post-Login Flow

1. Authenticate with Supabase Auth
2. Query `skr_team_members` table to verify the user is an active team member
3. If authorized: store member data in `sessionStorage`, redirect to `/admin/dashboard/`
4. If not authorized: sign out and show error message

### Schema Detection

`admin-auth.js` supports two database schemas:

- **Full schema**: `first_name`, `last_name`, `role_id` (UUID FK to `skr_roles`), `photo_url`, `title`
- **Simple schema**: `display_name`, `role` (text), `avatar_url`

The auth system auto-detects which schema is in use and normalizes member data into a standard format.

### Exposed API (`window.SKR_AUTH`)

```javascript
SKR_AUTH.supabase          // Supabase client instance
SKR_AUTH.getSession()      // Returns current auth session
SKR_AUTH.getCurrentMember() // Returns normalized member object or null
SKR_AUTH.verifyTeamMember(user) // Checks if user is active team member
SKR_AUTH.fetchTeamMembers()    // Returns all team members (for dashboard)
SKR_AUTH.detectSchema()        // Returns 'full' or 'simple'
SKR_AUTH.signOut()             // Clears session, redirects to /admin/
```

---

## Mobile Menu Integration

The mobile hamburger menu (managed by `assets/js/nav.js`) includes a "Login / Get Started" link that:

1. Closes the mobile menu
2. Waits 300ms
3. Opens the login modal

```javascript
function closeMenuAndLogin() {
  closeMobileMenu();
  setTimeout(function() { openLoginModal(); }, 300);
}
```

---

## CSS Cache Busting

All CSS links include `?v=2` query strings to force browser re-download after style updates:

```html
<link rel="stylesheet" href="assets/css/nav.css?v=2">
```

Increment the version number after any CSS changes to bust the cache.

---

## RBAC (Role-Based Access Control)

Permission levels in the system:

| Level | Role |
|-------|------|
| 30 | Owner / Broker |
| 25 | Admin |
| 20 | Client |
| 15 | Applicant |
| 10 | Lead |

Dashboard cards can use `data-min-role="broker"` to restrict visibility. The auth-router checks team membership and redirects non-team users to the client portal at `/admin/portal/`.

---

## Security Notes

- Admin pages include `<meta name="robots" content="noindex, nofollow">`
- Supabase anon key is injected at build time (not committed to repo)
- Fallback hardcoded URL exists for local development only
- `skr_team_members` table uses RLS (Row Level Security) policies
- Sessions are managed by Supabase Auth (JWT-based)
- Magic link tokens expire in 1 hour

---

## Troubleshooting

| Issue | Cause | Fix |
|-------|-------|-----|
| Login modal appears as raw text | Old cached CSS without modal styles | Hard refresh (`Cmd+Shift+R`) or increment `?v=` |
| Mobile menu won't open | CSS `!important` blocking JS | Ensure `.mobile-menu` default is `display: none` (no `!important`), `.open` state is `display: flex` |
| "Missing Supabase config" in console | `admin-config.js` not generated | Run `node scripts/inject-admin-config.js` or deploy to Vercel |
| "Account not authorized" on login | User not in `skr_team_members` or `is_active = false` | Add user to the table with `is_active = true` |
| Entra ID button not showing | Selected role is not `employee` or `agent` | Select Employee Portal or Agent tile |
| OAuth redirect fails | Supabase provider not configured | Enable Azure/Google provider in Supabase dashboard |
