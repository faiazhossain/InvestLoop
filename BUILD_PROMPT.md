# Build Prompt: Investment Pool Tracker Web App

## Project Overview

Build a **group investment tracking web application** where multiple people invest in monthly batches (rounds) with fixed share prices. Track contributions, returns at maturity, profit distribution by share proportion, and reinvestment flow. Deploy to Vercel with authentication and role-based access.

## Core Business Logic

### Investment Model

- **Batch (Investment Round)**: each month creates a new batch with:
  - Project Name
  - Batch ID
  - Start date
  - Term (e.g., 3 months)
  - Share price (e.g., 2000)
  - Maturity date (auto-calculated)
  - Status (Open/Closed)

- **Contribution**: members buy shares in a batch
  - Can invest any number of shares
  - Amount = Shares × Share Price
  - Source: `Cash` (new money) or `Reinvest` (from previous batch return)
  - Track source batch if reinvested

- **Return**: at maturity, record actual total return for the batch
  - Total return amount
  - Total principal = sum of all contributions
  - Batch profit = total return - total principal

- **Distribution (Payout)**: auto-calculate per member per batch
  - Member principal = their contribution to that batch
  - Member profit = (member principal / batch principal) × batch profit
  - Gross payout = member principal + member profit
  - Reinvested amount = sum of reinvestments from this batch into other batches
  - Cashout = gross payout - reinvested

### Key Requirements

1. **Append-only ledger**: never delete old records, always add new transactions
2. **Reinvestment tracking**: when profit is reinvested, create new contribution row linking back to source batch
3. **Automatic calculations**: principal, profit share, payout, reinvestment totals
4. **Maturity visibility**: dashboard showing upcoming maturities
5. **Member statements**: each member sees their total invested, total profit, pending batches

## Tech Stack

### Framework & Hosting

- **Next.js 14+** (App Router)
- **TypeScript**
- **Vercel** deployment
- **Tailwind CSS** for styling

### Database

Choose one:

- **Neon (PostgreSQL)** - recommended, free tier, Vercel integration
- **Supabase** - includes auth + database
- **PlanetScale (MySQL)** - alternative

Use **Prisma** as ORM

### Authentication

- **NextAuth.js v5** (Auth.js) or **Clerk**
- Role-based access:
  - `admin`: create batches, record returns, view all data, manage members
  - `member`: view own contributions, payouts, dashboard

### UI Components

- **shadcn/ui** or **Radix UI** for components
- **Recharts** or **tremor** for dashboard charts

## Database Schema (Prisma)

```prisma
model User {
  id            String         @id @default(cuid())
  email         String         @unique
  name          String
  role          Role           @default(MEMBER)
  phoneEmail    String?
  active        Boolean        @default(true)
  contributions Contribution[]
  payouts       Payout[]
  createdAt     DateTime       @default(now())
  updatedAt     DateTime       @updatedAt
}

enum Role {
  ADMIN
  MEMBER
}

model Batch {
  id              String         @id @default(cuid())
  batchId         String         @unique // e.g., "B001"
  startDate       DateTime
  termMonths      Int
  sharePrice      Decimal        @db.Decimal(10, 2)
  maturityDate    DateTime
  status          BatchStatus    @default(OPEN)
  contributions   Contribution[]
  return          Return?
  payouts         Payout[]
  createdAt       DateTime       @default(now())
  updatedAt       DateTime       @updatedAt
}

enum BatchStatus {
  OPEN
  CLOSED
}

model Contribution {
  id              String         @id @default(cuid())
  date            DateTime       @default(now())
  batchId         String
  batch           Batch          @relation(fields: [batchId], references: [id])
  userId          String
  user            User           @relation(fields: [userId], references: [id])
  shares          Decimal        @db.Decimal(10, 2)
  amount          Decimal        @db.Decimal(10, 2)
  source          ContributionSource @default(CASH)
  sourceBatchId   String?
  sourceBatch     Batch?         @relation("Reinvestments", fields: [sourceBatchId], references: [id])
  createdAt       DateTime       @default(now())
}

enum ContributionSource {
  CASH
  REINVEST
}

model Return {
  id              String         @id @default(cuid())
  batchId         String         @unique
  batch           Batch          @relation(fields: [batchId], references: [id])
  returnDate      DateTime
  totalReturn     Decimal        @db.Decimal(10, 2)
  totalPrincipal  Decimal        @db.Decimal(10, 2)
  profit          Decimal        @db.Decimal(10, 2)
  createdAt       DateTime       @default(now())
}

model Payout {
  id               String         @id @default(cuid())
  batchId          String
  batch            Batch          @relation(fields: [batchId], references: [id])
  userId           String
  user             User           @relation(fields: [userId], references: [id])
  principal        Decimal        @db.Decimal(10, 2)
  batchPrincipal   Decimal        @db.Decimal(10, 2)
  batchProfit      Decimal        @db.Decimal(10, 2)
  memberProfit     Decimal        @db.Decimal(10, 2)
  grossPayout      Decimal        @db.Decimal(10, 2)
  reinvested       Decimal        @db.Decimal(10, 2)
  cashout          Decimal        @db.Decimal(10, 2)
  createdAt        DateTime       @default(now())

  @@unique([batchId, userId])
}
```

## Features & Pages

### Public (Unauthenticated)

- `/` - Landing page with login button
- `/login` - Sign in page

### Member Dashboard (`/dashboard`)

- Summary metrics:
  - Total invested (all time)
  - Total profit earned
  - Current active investments
  - Upcoming maturities
- My contributions table
- My payouts table
- Charts: profit over time, contribution breakdown

### Admin Pages

#### `/admin/batches`

- List all batches with status
- Create new batch form:
  - Batch ID (auto-generate or manual)
  - Start date
  - Term months
  - Share price
- Filter: Open/Closed
- Actions: View details, Close batch

#### `/admin/contributions`

- Add contribution form:
  - Member (dropdown)
  - Batch (dropdown - only open batches)
  - Shares
  - Source (Cash/Reinvest)
  - Source Batch (if reinvest)
- Table: all contributions with filters by batch/member
- Bulk import (CSV optional)

#### `/admin/returns`

- List batches ready for return entry
- Record return form:
  - Batch (dropdown - only closed batches without return)
  - Return date
  - Total return amount
- Auto-calculate profit after entry

#### `/admin/payouts`

- Auto-generated after return is recorded
- Table view by batch or by member
- Export member statements (PDF/CSV)

#### `/admin/members`

- List all members
- Add/edit member
- Set active/inactive
- Reset password (if using email/password)

#### `/admin/dashboard`

- Full system metrics:
  - Total capital
  - Total returns
  - Total profit
  - Open batches count
  - Members count
- Charts: monthly inflow/outflow, ROI by batch

### API Routes

#### `/api/batches`

- `GET` - list batches (admin: all, member: own)
- `POST` - create batch (admin only)
- `PATCH /:id` - update status (admin only)

#### `/api/contributions`

- `GET` - list contributions
- `POST` - create contribution (admin only)

#### `/api/returns`

- `GET` - list returns
- `POST` - record return (admin only)
- Auto-trigger payout calculation on POST

#### `/api/payouts`

- `GET` - list payouts
- Calculation function (server-side)

#### `/api/members`

- `GET` - list members (admin only)
- `POST` - create member (admin only)
- `PATCH /:id` - update member (admin only)

## Key Implementation Details

### Auto-Calculations (Server-Side)

When return is recorded:

```typescript
async function calculatePayouts(batchId: string) {
  // 1. Get batch return
  const batchReturn = await prisma.return.findUnique({ where: { batchId } });

  // 2. Get all contributions for this batch
  const contributions = await prisma.contribution.findMany({
    where: { batchId },
  });

  // 3. Calculate each member's payout
  const totalPrincipal = batchReturn.totalPrincipal;
  const batchProfit = batchReturn.profit;

  for (const contrib of contributions) {
    const memberPrincipal = /* sum member's contributions to this batch */;
    const memberProfit = (memberPrincipal / totalPrincipal) * batchProfit;
    const grossPayout = memberPrincipal + memberProfit;

    // 4. Calculate reinvested amount from this batch
    const reinvested = await prisma.contribution.aggregate({
      where: {
        userId: contrib.userId,
        source: 'REINVEST',
        sourceBatchId: batchId,
      },
      _sum: { amount: true },
    });

    const cashout = grossPayout - (reinvested._sum.amount || 0);

    // 5. Create payout record
    await prisma.payout.create({
      data: {
        batchId,
        userId: contrib.userId,
        principal: memberPrincipal,
        batchPrincipal: totalPrincipal,
        batchProfit,
        memberProfit,
        grossPayout,
        reinvested: reinvested._sum.amount || 0,
        cashout,
      },
    });
  }
}
```

### Authentication Middleware

Protect routes:

- `/dashboard/*` - authenticated users
- `/admin/*` - admin role only

### Deployment Steps

1. Push code to GitHub
2. Connect repo to Vercel
3. Add environment variables:
   - `DATABASE_URL`
   - `NEXTAUTH_SECRET` / `AUTH_SECRET`
   - `NEXTAUTH_URL`
4. Run migration: `npx prisma migrate deploy`
5. Seed admin user

## Edge Cases to Handle

1. Multiple contributions by same member in same batch (sum them)
2. Reinvestment before source batch matures (track as pending)
3. Member removed/inactive (still show historical data)
4. Negative profit (loss) - member gets back less than principal
5. Partial reinvestment (some cashout, some reinvest from same payout)

## Deliverables

1. Working Next.js app deployed to Vercel
2. Database with schema and migrations
3. Admin login seeded
4. All CRUD operations functional
5. Automatic payout calculation working
6. Member and admin dashboards complete
7. Mobile-responsive UI
8. README with setup instructions

## Optional Enhancements (Phase 2)

- Email notifications on maturity
- CSV/PDF export for tax reporting
- Multi-currency support
- Batch performance comparison charts
- Member invite system with email
- Audit log for all admin actions
- Dark mode
- Real-time updates with websockets

## Success Criteria

- Admin can create batch, add contributions, record returns
- Payouts auto-calculate correctly with proportional profit split
- Members see only their own data
- Reinvestment flow tracks source batch correctly
- Dashboard shows upcoming maturities
- No data loss, all transactions append-only
- Works on mobile browsers

---

**Build this application following modern Next.js best practices with clean component structure, proper error handling, loading states, and optimistic updates where appropriate.**
