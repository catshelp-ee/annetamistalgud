# Migration Plan: localStorage to Server API Integration

## Overview

Migrate the current localStorage-based vet bills management system (`src/App.tsx` and `src/pages/Admin.tsx`) to use the existing server API infrastructure, mirroring the architecture of `old_donations_page`.

**Current State:**
- Vet bills stored in browser localStorage
- Simple password-based admin authentication
- No actual payment processing
- Mock donation counter from `/api/totalDonations`
- Static data management

**Target State:**
- Vet bills as Goals in MySQL database (via Prisma)
- Server-side CRUD operations for Goals
- Montonio payment integration
- Real donation tracking
- Proper admin authentication

---

## 1. Database Schema Analysis

### Existing Schema

The database already has the necessary structure:

**Goal Model** (`prisma/models/goal.prisma`):
```prisma
model Goal {
  id          Int        @id @default(autoincrement())
  name        String     @db.Text
  code        String     @db.Text
  target      Float      @db.Double
  color       String     @db.Text
  unit        String     @default("€")
  link        String     @default("#donation-section") @db.Text
  message     String     @default("Toeta")
  description String     @default("default kijreldus") @db.Text
  donations   Donation[]
}
```

**Donation Model** (`prisma/models/donation.prisma`):
```prisma
model Donation {
  id                        Int      @id @default(autoincrement())
  goalID                    Int      @map("goal_id")
  goal                      Goal     @relation(fields: [goalID], references: [id])
  amount                    Float    @db.Double
  montonioMerchantReference String   @db.Text
  paid                      Boolean  @default(false)
  date                      DateTime @default(now())
}
```

### Required Schema Changes

**Add new field to Goal model** for vet bill "issue" (optional problem description):

```prisma
model Goal {
  // ... existing fields ...
  issue       String?    @db.Text  // NEW: Optional issue/problem description
}
```

**Migration command:**
```bash
npx prisma migrate dev --name add_issue_to_goals
```

---

## 2. Backend API Requirements

### Existing Endpoints (Already Available)

| Endpoint | Method | Purpose | Controller |
|----------|--------|---------|------------|
| `/api/paymentMethods` | GET | Fetch available banks from Montonio | `paymentMethodsHandler` |
| `/api/paymentData` | GET | Get all goals + aggregated donations | `paymentDataHandler` |
| `/api/totalDonations` | GET | Get total donations counter | `totalDonationsHandler` |
| `/api/createOrder` | POST | Create Montonio payment order | `createOrder` |
| `/api/paymentNotify` | POST | Webhook: Montonio payment confirmation | `paymentNotifyHandler` |
| `/api/paymentReturn` | GET | Decode payment status token | `paymentReturnHandler` |

### New Endpoints Required (Admin CRUD)

| Endpoint | Method | Purpose | Authentication |
|----------|--------|---------|----------------|
| `/api/admin/goals` | GET | List all goals (vet bills) | Required |
| `/api/admin/goals` | POST | Create new goal | Required |
| `/api/admin/goals/:id` | PUT | Update goal | Required |
| `/api/admin/goals/:id` | DELETE | Delete goal | Required |
| `/api/admin/login` | POST | Admin authentication | None |
| `/api/admin/verify` | GET | Verify admin session | Required |

### Backend Implementation Tasks

#### 2.1 Add Admin Authentication Middleware

**File:** `server/middleware/auth-middleware.ts` (NEW)

```typescript
import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key-change-in-production';

export interface AuthRequest extends Request {
  adminId?: string;
}

export const authenticateAdmin = (
  req: AuthRequest,
  res: Response,
  next: NextFunction
) => {
  const token = req.headers.authorization?.split(' ')[1];

  if (!token) {
    return res.status(401).json({ error: 'Authentication required' });
  }

  try {
    const decoded = jwt.verify(token, JWT_SECRET) as { adminId: string };
    req.adminId = decoded.adminId;
    next();
  } catch (error) {
    return res.status(401).json({ error: 'Invalid or expired token' });
  }
};
```

**Dependencies to add:**
```bash
npm install jsonwebtoken bcrypt
npm install --save-dev @types/jsonwebtoken @types/bcrypt
```

#### 2.2 Create Admin Controller

**File:** `server/controllers/admin-controller.ts` (NEW)

```typescript
import { Request, Response } from 'express';
import { prisma } from '../prisma';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcrypt';

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key';
const ADMIN_PASSWORD_HASH = process.env.ADMIN_PASSWORD_HASH ||
  '$2b$10$...'; // bcrypt hash of 'catshelp2024'

export async function loginHandler(req: Request, res: Response) {
  const { password } = req.body;

  if (!password) {
    return res.status(400).json({ error: 'Password required' });
  }

  const isValid = await bcrypt.compare(password, ADMIN_PASSWORD_HASH);

  if (!isValid) {
    return res.status(401).json({ error: 'Invalid password' });
  }

  const token = jwt.sign({ adminId: 'admin' }, JWT_SECRET, { expiresIn: '24h' });
  res.json({ token });
}

export async function verifyHandler(req: Request, res: Response) {
  res.json({ valid: true });
}

export async function listGoalsHandler(req: Request, res: Response) {
  try {
    const goals = await prisma.goal.findMany({
      include: {
        donations: {
          where: { paid: true },
          select: { amount: true }
        }
      },
      orderBy: { id: 'asc' }
    });

    // Calculate current amounts
    const goalsWithAmounts = goals.map(goal => ({
      id: goal.id,
      name: goal.name,
      issue: goal.issue || '',
      current: goal.donations.reduce((sum, d) => sum + d.amount, 0),
      goal: goal.target,
      color: goal.color,
      code: goal.code
    }));

    res.json(goalsWithAmounts);
  } catch (error) {
    console.error('listGoalsHandler error:', error);
    res.status(500).json({ error: 'Failed to fetch goals' });
  }
}

export async function createGoalHandler(req: Request, res: Response) {
  const { name, issue, goal, color, code } = req.body;

  if (!name || !goal) {
    return res.status(400).json({ error: 'Name and goal are required' });
  }

  try {
    const newGoal = await prisma.goal.create({
      data: {
        name,
        issue: issue || null,
        target: parseFloat(goal),
        color: color || '#ff80ce',
        code: code || name.toLowerCase().replace(/\s+/g, '-'),
        unit: '€',
        link: '#donation-section',
        message: 'Anneta',
        description: name
      }
    });

    res.json(newGoal);
  } catch (error) {
    console.error('createGoalHandler error:', error);
    res.status(500).json({ error: 'Failed to create goal' });
  }
}

export async function updateGoalHandler(req: Request, res: Response) {
  const { id } = req.params;
  const { name, issue, goal, color } = req.body;

  try {
    const updated = await prisma.goal.update({
      where: { id: parseInt(id) },
      data: {
        name,
        issue: issue || null,
        target: parseFloat(goal),
        color: color || '#ff80ce'
      }
    });

    res.json(updated);
  } catch (error) {
    console.error('updateGoalHandler error:', error);
    res.status(500).json({ error: 'Failed to update goal' });
  }
}

export async function deleteGoalHandler(req: Request, res: Response) {
  const { id } = req.params;

  try {
    // First delete associated donations
    await prisma.donation.deleteMany({
      where: { goalID: parseInt(id) }
    });

    // Then delete the goal
    await prisma.goal.delete({
      where: { id: parseInt(id) }
    });

    res.json({ success: true });
  } catch (error) {
    console.error('deleteGoalHandler error:', error);
    res.status(500).json({ error: 'Failed to delete goal' });
  }
}
```

#### 2.3 Update Server Routes

**File:** `server/main.ts`

Add admin routes:

```typescript
import * as AdminController from './controllers/admin-controller';
import { authenticateAdmin } from './middleware/auth-middleware';

// ... existing routes ...

// Admin routes
app.post('/api/admin/login', AdminController.loginHandler);
app.get('/api/admin/verify', authenticateAdmin, AdminController.verifyHandler);
app.get('/api/admin/goals', authenticateAdmin, AdminController.listGoalsHandler);
app.post('/api/admin/goals', authenticateAdmin, AdminController.createGoalHandler);
app.put('/api/admin/goals/:id', authenticateAdmin, AdminController.updateGoalHandler);
app.delete('/api/admin/goals/:id', authenticateAdmin, AdminController.deleteGoalHandler);
```

#### 2.4 Update Donation Service

**File:** `server/services/donation-service.ts`

Add function to get vet bills format:

```typescript
export async function getVetBills() {
  const goals = await prisma.goal.findMany({
    where: {
      code: {
        not: 'hoiukodu' // Exclude special goals
      }
    }
  });

  const donationsSummary = await prisma.donation.groupBy({
    by: ['goalID'],
    _sum: { amount: true },
    where: { paid: true }
  });

  return goals.map(goal => {
    const donation = donationsSummary.find(d => d.goalID === goal.id);
    return {
      id: goal.id,
      name: goal.name,
      issue: goal.issue || '',
      current: donation?._sum.amount ?? 0,
      goal: goal.target,
      color: goal.color
    };
  });
}
```

---

## 3. Frontend Changes

### 3.1 App.tsx Migration

**Current:** Uses localStorage for vet bills, mock payment buttons
**Target:** Fetch vet bills from API, integrate Montonio payment

#### Changes Required:

1. **Remove localStorage logic**
   - Remove `getDefaultVetBills()`
   - Remove `localStorage.getItem/setItem` for vetBills
   - Remove storage event listeners

2. **Add API data fetching**
   ```typescript
   useEffect(() => {
     const fetchVetBills = async () => {
       try {
         const response = await fetch('/api/paymentData');
         const goals = await response.json();

         // Transform Goal[] to VetBill[] format
         const bills = goals
           .filter(g => g.code !== 'hoiukodu')
           .map(g => ({
             name: g.name,
             issue: g.description || '',
             current: g.amountDonated,
             goal: g.donationGoal
           }));

         setVetBills(bills);
       } catch (error) {
         console.error('Failed to fetch vet bills:', error);
       }
     };

     fetchVetBills();
     // Refresh every 5 minutes
     const interval = setInterval(fetchVetBills, 5 * 60 * 1000);
     return () => clearInterval(interval);
   }, []);
   ```

3. **Integrate Montonio payment**
   - Add Montonio checkout script loading
   - Replace mock payment button with actual Montonio integration
   - Add payment methods fetching from `/api/paymentMethods`
   - Implement `createOrder` API call on payment

4. **Update bank selection**
   - Keep the current inline style approach
   - Add bank selection state management
   - Validate bank selection before payment

#### New Dependencies:

```bash
npm install axios  # For API calls (if not already installed)
```

#### File Structure:
```typescript
// src/App.tsx
interface VetBill {
  id?: number;        // Add ID from database
  name: string;
  issue: string;
  current: number;
  goal: number;
}

interface TotalDonations {
  totalAmount: number;
  totalCount: number;
  lastUpdated: string;
}

// Add Montonio types
declare global {
  interface Window {
    Montonio?: {
      Checkout?: {
        PaymentInitiation?: {
          create: (config: any) => {
            init: () => void;
          };
        };
      };
    };
  }
}
```

### 3.2 Admin.tsx Migration

**Current:** CRUD operations on localStorage
**Target:** CRUD operations via API with JWT authentication

#### Changes Required:

1. **Replace localStorage with API calls**
   - Login: POST `/api/admin/login` → store JWT token
   - Load bills: GET `/api/admin/goals`
   - Add bill: POST `/api/admin/goals`
   - Update bill: PUT `/api/admin/goals/:id`
   - Delete bill: DELETE `/api/admin/goals/:id`

2. **Add authentication state management**
   ```typescript
   const [authToken, setAuthToken] = useState<string | null>(
     () => localStorage.getItem('adminToken')
   );

   const handleLogin = async (e: React.FormEvent) => {
     e.preventDefault();
     try {
       const response = await fetch('/api/admin/login', {
         method: 'POST',
         headers: { 'Content-Type': 'application/json' },
         body: JSON.stringify({ password })
       });

       if (!response.ok) throw new Error('Invalid password');

       const { token } = await response.json();
       setAuthToken(token);
       localStorage.setItem('adminToken', token);
       setIsAuthenticated(true);
     } catch (error) {
       alert('Vale parool!');
     }
   };
   ```

3. **Add API helper functions**
   ```typescript
   const apiHeaders = () => ({
     'Content-Type': 'application/json',
     'Authorization': `Bearer ${authToken}`
   });

   const fetchVetBills = async () => {
     const response = await fetch('/api/admin/goals', {
       headers: apiHeaders()
     });
     return response.json();
   };

   const createVetBill = async (bill: VetBill) => {
     const response = await fetch('/api/admin/goals', {
       method: 'POST',
       headers: apiHeaders(),
       body: JSON.stringify(bill)
     });
     return response.json();
   };

   // Similar for update and delete...
   ```

4. **Add error handling**
   - Handle 401 Unauthorized → logout user
   - Handle network errors → show user-friendly messages
   - Add loading states for async operations

5. **Remove localStorage sync**
   - Remove `window.dispatchEvent(new Event("vetBillsUpdated"))`
   - Remove storage event listeners

6. **Update logout**
   ```typescript
   const handleLogout = () => {
     setAuthToken(null);
     localStorage.removeItem('adminToken');
     setIsAuthenticated(false);
   };
   ```

### 3.3 Add React Router (Optional)

If separate pages are needed:

```bash
npm install react-router-dom
```

**File:** `src/main.tsx`
```typescript
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import App from './App';
import Admin from './pages/Admin';

root.render(
  <React.StrictMode>
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<App />} />
        <Route path="/admin" element={<Admin />} />
      </Routes>
    </BrowserRouter>
  </React.StrictMode>
);
```

---

## 4. Migration Strategy

### Phase 1: Database Setup (Day 1)

1. Add `issue` field to Goal model
2. Run migration: `npx prisma migrate dev --name add_issue_to_goals`
3. Generate Prisma client: `npx prisma generate`
4. Seed database with current vet bills data

**Seed script** (`prisma/seed.ts`):
```typescript
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  const vetBills = [
    { name: "Cat Clinicus", issue: "", current: 1988, goal: 2845 },
    { name: "Miki loomakliinikus", issue: "", current: 1230, goal: 3000 },
    // ... rest of the bills
  ];

  for (const bill of vetBills) {
    await prisma.goal.create({
      data: {
        name: bill.name,
        issue: bill.issue || null,
        target: bill.goal,
        code: bill.name.toLowerCase().replace(/\s+/g, '-'),
        color: '#ff80ce',
        unit: '€',
        link: '#donation-section',
        message: 'Anneta',
        description: bill.name
      }
    });
  }
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
```

Run: `npx prisma db seed`

### Phase 2: Backend Development (Day 2-3)

1. Install dependencies: `jsonwebtoken`, `bcrypt`
2. Create auth middleware
3. Create admin controller
4. Update server routes
5. Generate password hash for production
6. Test all endpoints with Postman/curl

**Generate password hash:**
```bash
node -e "const bcrypt = require('bcrypt'); bcrypt.hash('catshelp2024', 10, (e,h) => console.log(h));"
```

### Phase 3: Frontend Admin Page (Day 4-5)

1. Update `Admin.tsx` with API integration
2. Add authentication flow
3. Add error handling and loading states
4. Test CRUD operations
5. Test authentication expiry

### Phase 4: Frontend Main Page (Day 6-7)

1. Update `App.tsx` with API integration
2. Remove localStorage dependencies
3. Add Montonio checkout integration
4. Test payment flow in sandbox mode
5. Test real-time donation updates

### Phase 5: Testing & Deployment (Day 8-9)

1. End-to-end testing in development
2. Test payment flow thoroughly
3. Update environment variables for production
4. Deploy to VPS
5. Verify production deployment
6. Monitor for issues

---

## 5. Environment Variables

Add to `.env`:

```bash
# JWT Secret (generate with: openssl rand -hex 32)
JWT_SECRET=your-secret-key-change-in-production

# Admin Password Hash (generated with bcrypt)
ADMIN_PASSWORD_HASH=$2b$10$...hash-from-bcrypt...

# Existing variables remain the same
DATABASE_URL=...
MONTONIO_SANDBOX_ACCESS_KEY=...
# etc.
```

---

## 6. Testing Checklist

### Backend API Tests

- [ ] Admin login with correct password returns JWT
- [ ] Admin login with wrong password returns 401
- [ ] Protected routes return 401 without token
- [ ] Protected routes work with valid token
- [ ] GET `/api/admin/goals` returns all goals with current amounts
- [ ] POST `/api/admin/goals` creates new goal
- [ ] PUT `/api/admin/goals/:id` updates existing goal
- [ ] DELETE `/api/admin/goals/:id` deletes goal and its donations
- [ ] GET `/api/paymentData` returns goals in correct format
- [ ] Montonio payment flow works end-to-end

### Frontend Tests

- [ ] Admin page: Login works
- [ ] Admin page: Shows all vet bills
- [ ] Admin page: Can create new vet bill
- [ ] Admin page: Can edit existing vet bill
- [ ] Admin page: Can delete vet bill
- [ ] Admin page: Logout clears token
- [ ] Main page: Fetches vet bills from API
- [ ] Main page: Displays progress bars correctly
- [ ] Main page: Bank selection works
- [ ] Main page: Payment flow redirects to Montonio
- [ ] Main page: Payment return shows success/failure
- [ ] Main page: Donations update after payment

---

## 7. Rollback Plan

If critical issues arise:

1. **Immediate rollback:**
   - Revert to previous git commit
   - Restore localStorage-based version
   - Deploy old version to VPS

2. **Database rollback:**
   - Run: `npx prisma migrate reset` (WARNING: loses data)
   - Or manually restore from backup

3. **Partial rollback:**
   - Keep backend API running
   - Serve old frontend build
   - Debug issues in development

---

## 8. Post-Migration Tasks

1. **Remove old code:**
   - Delete `old_donations_page` folder after verification
   - Clean up unused localStorage code

2. **Documentation:**
   - Update README with new architecture
   - Document admin credentials management
   - Add API endpoint documentation

3. **Monitoring:**
   - Set up error logging (e.g., Sentry)
   - Monitor payment failures
   - Track API response times

4. **Security:**
   - Rotate JWT secret in production
   - Use HTTPS for all API calls
   - Implement rate limiting on login endpoint
   - Add CSRF protection if needed

---

## 9. Migration Timeline

| Phase | Duration | Tasks |
|-------|----------|-------|
| Database Setup | 0.5 day | Schema changes, migration, seeding |
| Backend Development | 2 days | Auth, controllers, routes, testing |
| Frontend Admin | 1.5 days | API integration, auth flow |
| Frontend Main | 1.5 days | API integration, Montonio |
| Testing & QA | 1.5 days | End-to-end testing |
| Deployment | 0.5 day | Production deployment |
| **Total** | **7.5 days** | |

---

## 10. Success Criteria

Migration is successful when:

- ✅ All vet bills displayed on main page come from database
- ✅ Admin can login with password
- ✅ Admin can create, edit, delete vet bills via UI
- ✅ Changes in admin panel reflect on main page immediately
- ✅ Users can make donations via Montonio
- ✅ Donation counters update after successful payment
- ✅ No localStorage dependencies remain
- ✅ All tests pass
- ✅ Production deployment successful
- ✅ No critical bugs for 48 hours post-deployment

---

## Notes

- Keep `ADMIN_PASSWORD` in `.env` instead of hardcoded
- Consider adding email notifications for new donations
- Future: Add multi-admin support with proper user table
- Future: Add donation analytics dashboard
- Future: Add automated backup system for database