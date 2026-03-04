# Investment Pool Tracker

A web application for tracking group investments, contributions, and payouts. Built with Next.js 14+, TypeScript, Neon PostgreSQL, Prisma, Clerk authentication, shadcn/ui, and Recharts.

## Features

- **User Authentication**: Role-based access (Admin/Member) via Clerk
- **Batch Management**: Create and manage investment batches
- **Contribution Tracking**: Record member contributions with cash or reinvestment sources
- **Return Calculation**: Record investment returns and automatically calculate payouts
- **Payout Management**: View and export payout details by batch or member
- **Dashboard Analytics**: Visual overview of investment statistics

## Tech Stack

- **Framework**: Next.js 15 with App Router
- **Language**: TypeScript
- **Database**: Neon PostgreSQL with Prisma ORM
- **Authentication**: Clerk
- **UI Components**: shadcn/ui + Tailwind CSS
- **Charts**: Recharts
- **Deployment**: Vercel-ready

## Prerequisites

- Node.js 18+
- npm or yarn
- A [Neon](https://neon.tech) account for PostgreSQL database
- A [Clerk](https://clerk.com) account for authentication

## Setup

### 1. Clone and Install Dependencies

```bash
git clone <repository-url>
cd investment
npm install
```

### 2. Set Up Neon Database

1. Create a new project at [neon.tech](https://neon.tech)
2. Copy the connection string (DATABASE_URL)

### 3. Set Up Clerk

1. Create a new application at [clerk.com](https://clerk.com)
2. Go to API Keys and copy:
   - Publishable Key
   - Secret Key

### 4. Configure Environment Variables

Copy `.env.example` to `.env` and fill in your values:

```bash
cp .env.example .env
```

Edit `.env`:

```env
# Database - Get from Neon dashboard
DATABASE_URL="postgresql://username:password@ep-xxx.us-east-2.aws.neon.tech/neondb?sslmode=require"

# Clerk - Get from Clerk dashboard
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY="pk_test_..."
CLERK_SECRET_KEY="sk_test_..."

# Clerk URLs (can use defaults)
NEXT_PUBLIC_CLERK_SIGN_IN_URL="/login"
NEXT_PUBLIC_CLERK_SIGN_UP_URL="/signup"
NEXT_PUBLIC_CLERK_AFTER_SIGN_IN_URL="/dashboard"
NEXT_PUBLIC_CLERK_AFTER_SIGN_UP_URL="/dashboard"
```

### 5. Initialize Database

```bash
# Generate Prisma client
npm run db:generate

# Push schema to database
npm run db:push
```

### 6. Run Development Server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

## Database Commands

```bash
# Generate Prisma client
npm run db:generate

# Push schema changes to database
npm run db:push

# Create a migration (for production)
npm run db:migrate

# Open Prisma Studio (database GUI)
npm run db:studio

# Seed database with sample data
npm run db:seed
```

## User Roles

### Admin

- Access to all admin pages
- Create and manage batches
- Add contributions for any member
- Record returns and trigger payout calculations
- Manage members

### Member

- View personal dashboard
- See own contributions and payouts
- View profit chart

## Workflow

1. **Admin creates a batch** - Opens a new investment period
2. **Admin adds contributions** - Records member investments (cash or reinvested)
3. **Admin closes the batch** - Marks batch as closed for returns
4. **Admin records return** - Enters total return and profit, triggers payout calculation
5. **Payouts are calculated** - Automatically distributed based on contribution shares

## Project Structure

```
src/
├── app/
│   ├── (auth)/          # Authentication pages
│   ├── (dashboard)/     # Member dashboard
│   ├── (admin)/         # Admin pages
│   ├── api/             # API routes
│   └── ...
├── components/
│   └── ui/              # shadcn/ui components
├── lib/
│   ├── prisma.ts        # Database client
│   ├── utils.ts         # Utility functions
│   └── calculations.ts  # Payout calculations
├── types/               # TypeScript types
└── middleware.ts        # Auth middleware
```

## Deployment

### Vercel

1. Push code to GitHub
2. Connect repository to Vercel
3. Add environment variables in Vercel dashboard
4. Deploy

Build command: `prisma generate && next build`

## License

MIT
