# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

**annetamistalgud** (Estonian: "donation stories") is a full-stack donation platform for Cats HELP rescue organization. The application enables bank payment donations through Montonio integration, tracks fundraising goals, and displays real-time progress.

**Tech Stack:**
- Frontend: React 19 + TypeScript + Vite + Tailwind CSS 4
- Backend: Express 5 + TypeScript
- Database: MySQL via Prisma ORM
- Payment: Montonio bank payments
- External: Google Sheets API for live donation data

## Development Commands

```bash
# Start development (runs frontend + backend in parallel)
npm run dev
# - Frontend: http://localhost:5173 (Vite with HMR)
# - Backend: http://localhost:3000 (Express with nodemon)
# - API proxy: /api/* → localhost:3000

# Frontend only
npm run dev:vite

# Backend only
npm run dev:api

# Production build (frontend + backend bundle)
npm run build

# Linting
npm run lint

# Database migrations
npx prisma migrate dev --name description_here

# Generate Prisma client
npx prisma generate

# Database GUI
npx prisma studio

# Copy Prisma to dist (required after build)
npm run copy:prisma
```

## Architecture

### Directory Structure

```
annetamistalgud/
├── src/                    # React frontend
│   ├── components/         # Reusable components
│   │   ├── donation.tsx    # Main payment form with Montonio checkout
│   │   ├── support.tsx     # Displays all donation goals
│   │   └── bar/            # Progress bar components (desktop/mobile)
│   ├── pages/
│   │   ├── home.tsx        # Main page composition + context
│   │   └── payment-return.tsx  # Payment callback handler
│   └── hooks/
│       └── useMediaQuery.tsx   # Responsive breakpoint detection
│
├── server/                 # Express backend
│   ├── controllers/
│   │   └── payment-controller.ts  # API endpoint handlers
│   ├── services/
│   │   ├── donation-service.ts    # DB operations for donations/goals
│   │   ├── montonio-service.ts    # Payment order creation
│   │   ├── payment/               # Payment methods, webhooks, returns
│   │   └── google/                # Google Sheets + auth (singleton)
│   ├── main.ts             # Express server + routes
│   └── prisma.ts           # Prisma client singleton
│
├── prisma/
│   ├── schema.prisma       # Main schema config
│   └── models/
│       ├── goal.prisma     # Fundraising goals
│       └── donation.prisma # Donation records
│
└── types/
    └── donations.ts        # Shared TypeScript interfaces
```

### Database Schema

**Goal** (`goals` table)
- Fundraising targets with: name, code (e.g., "toiduks", "raviks", "hoiukodu"), target amount, color, UI text
- One-to-many relationship with Donation

**Donation** (`donations` table)
- Tracks individual donations: goalID, amount, montonioMerchantReference, paid (boolean), date
- Created with `paid: false`, updated to `paid: true` after Montonio webhook confirmation

**Special case:** Goals with code "hoiukodu" pull live data from Google Sheets instead of database.

### API Routes

| Method | Route | Purpose |
|--------|-------|---------|
| GET | `/api/paymentMethods` | Fetch available banks from Montonio |
| GET | `/api/paymentData` | Get all goals + aggregated donations |
| POST | `/api/createOrder` | Create Montonio payment, redirect to bank |
| POST | `/api/paymentNotify` | Webhook: Montonio confirms payment |
| GET | `/api/paymentReturn` | Decode payment status from token |

### Payment Flow

1. User selects goal + amount → frontend calls `/api/createOrder`
2. Backend creates donation record (`paid: false`), generates JWT-signed order
3. Backend sends order to Montonio API, returns `paymentUrl`
4. User redirects to Montonio → completes bank payment
5. Montonio sends webhook to `/api/paymentNotify` with JWT token
6. Backend verifies JWT, updates donation to `paid: true`
7. User returns to site via `/api/paymentReturn` with status token

### Key Patterns

**GoogleAuthService (Singleton)**
- Single instance shared across all requests
- Initialized once at server startup: `GoogleAuthService.init()`
- Access via `GoogleAuthService.getInstance()`

**Google Sheets Caching**
- "hoiukodu" donation data cached in memory for 2 hours
- Prevents excessive API calls
- Use `getDonationData(refreshCache: true)` to force refresh

**Environment Switching**
- Sandbox: `NODE_ENV !== 'production'` uses `MONTONIO_SANDBOX_*` keys
- Production: `NODE_ENV === 'production'` uses `MONTONIO_*` keys
- **Note:** Inconsistency exists - some files check for 'prod', others 'production'

**Responsive Design**
- `IsDesktopContext` created in `home.tsx` with `useMediaQuery('(min-width: 1024px)')`
- Components conditionally render desktop `Bar` vs mobile `CompactBar`

## Environment Variables

Required for backend (`.env` file):

```bash
# Database
DATABASE_URL=mysql://user:pass@host:3306/database

# Montonio Sandbox (development)
MONTONIO_SANDBOX_ACCESS_KEY=...
MONTONIO_SANDBOX_SECRET_KEY=...
MONTONIO_SANDBOX_API_URL=https://sandbox-stargate.montonio.com

# Montonio Production
MONTONIO_ACCESS_KEY=...
MONTONIO_SECRET_KEY=...
MONTONIO_API_URL=https://stargate.montonio.com

# URLs
BASE_URL=http://localhost:5173      # Frontend URL for payment returns
NOTIFY_URL=https://your-ngrok-url.ngrok-free.app    # Backend URL for webhooks (must be publicly accessible)

# Google Sheets
SHEETS_ID=<Google Sheet ID>
PROD_CREDENTIALS_PATH=/path/to/credentials.json  # Production only (dev uses ./credentials.json)

# Node environment
NODE_ENV=development|production
```

Frontend (Vite - requires `VITE_` prefix):
```bash
VITE_MONTONIO_ACCESS_KEY=...  # For Montonio checkout embed
```

## Build & Deployment

**Build process:**
1. `vite build` → compiles React to `dist/`
2. `npm run bundle --prefix ./server` → esbuild bundles backend to `dist/bundle.cjs`
3. `npm run copy:prisma` → copies Prisma client + schema to `dist/`

**Deployment (GitHub Actions):**
- Trigger: push to `main` branch
- Steps: install → build → generate Prisma → archive → SCP to VPS → SSH deploy with PM2
- Target: www.catshelp.ee VPS
- Release format: `YYYY.MM.DD-HH.MM.SS-<git-sha>`

**PM2 Configuration:**
- Expects `pm2.config.js` in `dist/` folder
- Restarts on deployment
- Logs managed by PM2

## Common Tasks

### Adding a New Donation Goal
1. Insert row into MySQL `goals` table with required fields
2. Frontend automatically fetches from `/api/paymentData`
3. To use Google Sheets data: set `code = "hoiukodu"` (special handling in `donation-service.ts`)

### Testing Payments Locally
1. Ensure `NODE_ENV !== 'production'` to use sandbox
2. Set `MONTONIO_SANDBOX_*` environment variables with correct Stargate API URLs
3. Set up ngrok or similar tunnel for webhooks: `ngrok http 3000`
4. Update `NOTIFY_URL` in `.env` with the ngrok HTTPS URL
5. Use Montonio sandbox credentials
6. Test banks available in sandbox environment

**Important:** Montonio webhooks require a publicly accessible HTTPS URL. Localhost URLs will be rejected with a 400 error. The code automatically uses a dummy URL for localhost, but webhooks won't update your database unless you use ngrok.

### Database Changes
1. Edit `prisma/models/*.prisma` files
2. Run `npx prisma migrate dev --name description`
3. Prisma client auto-regenerates
4. For production: run `npx prisma migrate deploy`

### Debugging
- Frontend: Browser DevTools, React DevTools extension
- Backend: Check console logs, PM2 logs in production
- Database: `npx prisma studio` for GUI inspection
- Payments: Montonio dashboard for transaction logs

## Important Notes

**Prisma Client Location:**
- Output directory: `generated/prisma/` (custom location)
- Must be copied to `dist/` during build with `npm run copy:prisma`
- Binary targets include `debian-openssl-1.1.x` for Linux deployment

**Montonio Integration:**
- API Endpoint: `POST /api/orders` (not `/orders`)
- Base URLs: `https://sandbox-stargate.montonio.com` (sandbox), `https://stargate.montonio.com` (production)
- Webhook URL must be publicly accessible HTTPS (no localhost in production/sandbox)
- Checkout script loaded dynamically at runtime
- Window interface extended for TypeScript: `declare global interface Window`
- `storeSetupData` must be JSON stringified for checkout config
- JWT-signed requests with HS256 algorithm
- Error responses include detailed validation messages (e.g., "notificationUrl must be a valid non-local URL")

**Google Sheets Structure:**
- Expected columns: 0 = type, 1 = amountDonated, 2 = donationGoal
- Rows with hyperlinks in column 0 are skipped
- No error handling if sheet not found (returns 0)

**SPA Routing:**
- All non-`/api/*` routes serve `index.html` for React Router
- Backend serves static files from `dist/` folder
- React Router prepared but currently single-route application

## Project-Specific Conventions

- **Estonian language:** UI text and database content in Estonian (e.g., "Toeta" = "Support")
- **Font:** "Schoolbell" (handwritten style) from Google Fonts
- **Color scheme:** Pink (#ec4899), Cyan (#06b6d4), custom goal colors
- **Code style:** Prettier + ESLint, format on save
- **File naming:** kebab-case for components, PascalCase for React components
- **CSS:** Tailwind utility classes, minimal custom CSS (only for animations like shimmer effect in `bar.css`)
