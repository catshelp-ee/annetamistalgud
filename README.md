# Cats HELP - Donation Platform (Annetamistalgud)

A full-stack donation platform for Cats HELP rescue organization in Estonia. The application enables bank payment donations through Montonio integration, tracks fundraising goals in real-time, and displays progress for veterinary clinic bills.

**Live Site:** [www.catshelp.ee](https://www.catshelp.ee)

## Features

- 💳 **Bank Payment Integration** - Montonio payment gateway supporting major Estonian banks (SEB, Swedbank, LHV, Luminor, Coop, Citadele, Revolut)
- 📊 **Real-time Progress Tracking** - Live donation progress bars for multiple fundraising goals
- 🎯 **Goal-based Donations** - Users can donate to specific veterinary clinic bills
- 📱 **Responsive Design** - Mobile-first design that works beautifully on all devices
- 🔄 **Live Data Integration** - Google Sheets integration for "hoiukodu" (foster care) donations
- 🎨 **Custom Design** - Hand-drawn aesthetic using Schoolbell font with pink and cyan theme

## Tech Stack

- **Frontend:** React 19 + TypeScript + Vite + Tailwind CSS 4
- **Backend:** Express 5 + TypeScript
- **Database:** MySQL via Prisma ORM
- **Payments:** Montonio Stargate API (bank payments)
- **External APIs:** Google Sheets API for live donation data

## Prerequisites

- Node.js 18+ and npm
- MySQL 8.0+
- Montonio sandbox account (for testing payments)
- Google Cloud project with Sheets API enabled (optional, for hoiukodu feature)

## Local Development Setup

### 1. Clone the Repository

```bash
git clone https://github.com/catshelp-ee/annetamistalgud.git
cd annetamistalgud
```

### 2. Install Dependencies

```bash
npm install
```

### 3. Database Setup

Create a MySQL database and run Prisma migrations:

```bash
# Create database (if not exists)
mysql -u root -p -e "CREATE DATABASE annetamistalgud;"

# Run migrations
npx prisma migrate dev

# (Optional) Seed the database with sample goals
npx prisma db seed
```

### 4. Environment Configuration

Create a `.env` file in the root directory:

```bash
# Database
DATABASE_URL=mysql://catshelp:catshelp123@localhost:3306/annetamistalgud

# JWT Authentication (for admin panel)
JWT_SECRET=your-long-random-secret-key-here
ADMIN_PASSWORD_HASH=$2b$10$a1poezzvSGfLqRHmP2e84u6//Vtae7r/AL7PV8H/XtLgWo.A202Ti

# Montonio Sandbox (Development)
MONTONIO_SANDBOX_ACCESS_KEY=your-sandbox-access-key
MONTONIO_SANDBOX_SECRET_KEY=your-sandbox-secret-key
MONTONIO_SANDBOX_API_URL=https://sandbox-stargate.montonio.com

# Montonio Production (leave empty for development)
MONTONIO_ACCESS_KEY=
MONTONIO_SECRET_KEY=
MONTONIO_API_URL=https://stargate.montonio.com

# Application URLs
BASE_URL=http://localhost:5173
NOTIFY_URL=https://your-ngrok-url.ngrok-free.app  # See webhook setup below

# Google Sheets (optional - only needed for hoiukodu feature)
SHEETS_ID=your-google-sheet-id
# PROD_CREDENTIALS_PATH=/path/to/credentials.json

# Node Environment
NODE_ENV=development
```

**Note:** The default admin password is `admin123` (hash shown above).

### 5. Webhook Setup for Local Development

Montonio requires a publicly accessible webhook URL. For local development, use ngrok:

```bash
# Install ngrok
brew install ngrok  # macOS
# OR
snap install ngrok  # Linux
# OR download from https://ngrok.com/download

# Start ngrok tunnel (in a separate terminal)
ngrok http 3000

# Copy the HTTPS URL (e.g., https://abc123.ngrok-free.app)
# Update NOTIFY_URL in your .env file with this URL
```

Alternatively, you can use webhook.site for testing (webhooks won't update your local database):
```bash
NOTIFY_URL=https://webhook.site/your-unique-id
```

### 6. Start Development Server

```bash
# Start both frontend and backend
npm run dev

# Frontend will be available at http://localhost:5173
# Backend API at http://localhost:3000
```

Or run them separately:

```bash
# Frontend only
npm run dev:vite

# Backend only
npm run dev:api
```

### 7. Access the Application

- **Frontend:** http://localhost:5173
- **Admin Panel:** http://localhost:5173/admin (login: `admin` / `admin123`)
- **Prisma Studio:** Run `npx prisma studio` to view/edit database

## Available Scripts

| Command | Description |
|---------|-------------|
| `npm run dev` | Start both frontend and backend in development mode |
| `npm run dev:vite` | Start frontend only (Vite dev server) |
| `npm run dev:api` | Start backend only (Express with nodemon) |
| `npm run build` | Build frontend and backend for production |
| `npm run lint` | Run ESLint on all files |
| `npm run copy:prisma` | Copy Prisma client to dist folder (needed after build) |
| `npx prisma studio` | Open Prisma Studio GUI for database management |
| `npx prisma migrate dev` | Create and apply database migrations |

## Testing Payments

1. Ensure you're using Montonio sandbox credentials
2. Use ngrok or similar to expose your local server for webhooks
3. Select a donation amount and bank
4. Complete payment in Montonio's test environment
5. Verify donation is marked as `paid: true` in database (Prisma Studio)

**Test Banks:** All major Estonian banks are available in sandbox mode with test credentials provided by Montonio.

## Project Structure

```
annetamistalgud/
├── src/                      # React frontend
│   ├── App.tsx               # Main application component
│   ├── components/           # Reusable UI components
│   └── imports/              # Asset imports
├── server/                   # Express backend
│   ├── main.ts               # Server entry point
│   ├── controllers/          # API route handlers
│   ├── services/             # Business logic
│   │   ├── montonio-service.ts
│   │   ├── donation-service.ts
│   │   └── google/           # Google Sheets integration
│   └── prisma.ts             # Prisma client
├── prisma/                   # Database schema
│   ├── schema.prisma
│   └── models/               # Prisma model definitions
│       ├── goal.prisma
│       └── donation.prisma
└── types/                    # Shared TypeScript types
```

## API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/paymentData` | Get all goals with donation totals |
| POST | `/api/createOrder` | Create Montonio payment order |
| POST | `/api/paymentNotify` | Webhook for payment confirmation |
| GET | `/api/paymentReturn` | Handle payment return from Montonio |
| GET | `/api/goals` | Get all fundraising goals (admin) |
| POST | `/api/goals` | Create new goal (admin) |
| PUT | `/api/goals/:id` | Update goal (admin) |

## Deployment

The application is configured for deployment via GitHub Actions to a VPS:

1. Push to `main` branch triggers deployment
2. Frontend and backend are built
3. Files are copied to VPS via SCP
4. PM2 restarts the application

See `.github/workflows/deploy.yml` for details.

## Environment Variables Reference

### Required

- `DATABASE_URL` - MySQL connection string
- `MONTONIO_SANDBOX_ACCESS_KEY` - Montonio sandbox API key
- `MONTONIO_SANDBOX_SECRET_KEY` - Montonio sandbox secret
- `MONTONIO_SANDBOX_API_URL` - Montonio sandbox endpoint
- `BASE_URL` - Frontend URL for payment returns
- `NOTIFY_URL` - Backend URL for Montonio webhooks

### Optional

- `SHEETS_ID` - Google Sheet ID for hoiukodu data
- `PROD_CREDENTIALS_PATH` - Path to Google credentials JSON
- `JWT_SECRET` - Secret for admin authentication
- `ADMIN_PASSWORD_HASH` - Bcrypt hash of admin password

## Troubleshooting

### Payments not completing

- **Check webhook URL:** Ensure `NOTIFY_URL` is publicly accessible
- **Verify ngrok:** Make sure ngrok tunnel is running and URL is correct
- **Check logs:** Backend console shows Montonio API responses

### Database connection errors

- Ensure MySQL is running: `sudo systemctl status mysql`
- Verify credentials in `DATABASE_URL`
- Check database exists: `mysql -u root -p -e "SHOW DATABASES;"`

### Build fails

- Delete `node_modules` and reinstall: `rm -rf node_modules && npm install`
- Clear Vite cache: `rm -rf node_modules/.vite`
- Regenerate Prisma client: `npx prisma generate`

## Contributing

This is a private project for Cats HELP. For questions or issues, contact the development team.

## License

Copyright © 2025 Cats HELP. All rights reserved.

## Support Cats HELP

To support the rescue organization directly, visit [catshelp.ee](https://catshelp.ee) or make a donation through the platform!

🐱 Every euro helps save a life. Thank you! 💖
