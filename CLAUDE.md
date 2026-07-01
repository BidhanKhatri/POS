# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

---

## Dev Commands

### Backend (`/backend`)
```bash
npm run dev      # nodemon + --env-file=.env (local only)
npm start        # node --env-file=.env src/server.js (production)
npm run seed     # seed the database
```
Requires a `.env` file in `/backend`. Backend runs on `PORT` from `.env` (default 5002).

### Frontend (`/frontend`)
```bash
npm run dev      # vite dev server on :5173
npm run build    # production build
npm run lint     # eslint
npm run preview  # preview production build
```
Vite proxies `/api` and `/socket.io` to `http://127.0.0.1:5002` (see `vite.config.js`).

---

## Architecture

### Stack
- **Frontend**: React 19 + Vite, JavaScript only (no TypeScript), MUI v9, TanStack Query, Zustand, React Router v7, React Hook Form + Zod, Tailwind v4
- **Backend**: Node.js + Express v5, MongoDB Atlas + Mongoose, ESM (`"type": "module"`)
- **Auth**: JWT + bcryptjs PIN hashing, WebAuthn/Passkeys, Clerk (admin portal)

### Backend: `Route → Controller → Service → Model`
Controllers are thin — all business logic lives in services. File layout:
```
backend/src/
  app.js          # Express app: CORS (env-driven), helmet, rate limit, routes
  server.js       # HTTP + Socket.IO bootstrap
  config/         # DB connection
  controllers/    # Thin — delegate to services, handle HTTP status
  services/       # All business logic
  models/         # Mongoose schemas
  routes/         # Express routers
  middleware/     # auth (protect/admin/managerOrAdmin/requireActiveShift), error
  validations/    # Zod/express-validator schemas
  utils/
  jobs/
  cron/
```

### Frontend structure
```
frontend/src/
  AuthPages/       # Login, Signup, ForgotPin flows
  EmployeePages/   # POS terminal, shift, sales
  ManagerPages/    # Dashboard, reports, accounts, products
  AdminPages/      # Admin-only screens
  components/      # Shared UI components
  store/           # Zustand stores (useAuthStore, etc.)
  hooks/           # TanStack Query hooks, useWebAuthn, etc.
  config/api.js    # API_URL, SOCKET_URL, EMS_URL from env vars
  context/         # LoadingContext, SocketContext, etc.
```

### Key architectural decisions
- **CORS origins** are read from `CORS_ORIGINS` env var (comma-separated). The same `isOriginAllowed()` function in `app.js` is used by both Express CORS middleware and Socket.IO — they must stay in sync.
- **Trust proxy** is set to `1` in `app.js` for Nginx. Do not remove — it's required for rate limiting behind a reverse proxy.
- **Sales store product snapshots** at transaction time (name, price, code) — never reference live product data for historical records.
- **Mongoose models**: always use `timestamps: true`. Indexes on `employeeCode`, `invoiceNo`, `sku`, `barcode`, `shiftDate`.
- **PIN storage**: always hashed with bcrypt. The User model's `pre('save')` hook hashes `pinHash` automatically when modified. Use `findByIdAndUpdate` with a manually hashed value when bypassing the hook is intentional (e.g., in verifyEmail).
- **WebAuthn**: `WEBAUTHN_RP_ID` must match the domain served to the browser (no port/protocol). `WEBAUTHN_RP_ORIGIN` must match `window.location.origin`.

### Auth flow
- **Login**: Email + 4-digit PIN → JWT token
- **Signup**: Email verified via tokenized link (EMS sync optional); new accounts start as `PENDING` until manager approval
- **Forgot PIN**: Email → 6-digit OTP (2 min TTL, hashed, single-use, `PinResetOtp` model) → short-lived JWT `resetToken` → new 4-digit PIN
- **WebAuthn/Passkeys**: optional second factor, registered post-login
- **Idle lock**: `verify-pin` endpoint re-authenticates in place without issuing a new token

### Roles
`Admin` → `Manager` → `Employee`. Route guards: `protect` (any auth), `admin`, `managerOrAdmin`. Employees need `requireActiveShift` to process sales.

### Email service (`emailService.js`)
All outbound email goes through `getTransporter()`. If `SMTP_HOST` is blank, email is silently disabled. Four exported senders: `sendVerificationEmail`, `sendOtpEmail`, `sendReceiptEmail`, `sendReportEmail`.

### Design tokens (AGENTS.md)
Primary: `#3E2723` · Accent: `#D4A373` · Error: `#B71C1C` · Success: `#2E7D4F` · Background: `#F5F3F1` · Surface: `#FFFFFF` · Text primary: `#2B1D1A` · Text secondary: `#6B5B57` · Divider: `#DDD2CC`

UI must be mobile-first, touch-friendly, large buttons, MUI components. Avoid animations/gradients. Use MUI DataGrid for tables.
