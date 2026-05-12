# CardZen 💳

**Stay stress-free with your credit cards.**

CardZen is a production-ready personal credit card management system built to solve the real problem of tracking expenses, billing cycles, cashback, money owed by others, and annual fee waivers across multiple credit cards.

---

## Features

### Core Features
- 🃏 **Multi-card Management** — Add unlimited credit cards with full configuration
- 💸 **Expense Tracking** — Log transactions with categories, platforms, and merchants
- 📅 **Billing Cycle Intelligence** — Auto-calculates current cycle, due dates, and outstanding amounts
- 💚 **Cashback Tracking** — Track expected vs credited cashback per transaction
- 🎯 **Cashback Cap Monitoring** — Monthly/Quarterly/Annual cap tracking with reset alerts
- 👥 **Money Owed Tracking** — Track when friends/family owe you money from shared expenses
- 💰 **Repayment Tracking** — Full partial payment history with person-wise summaries
- 🎫 **Annual Fee Tracking** — Monitor fee waiver progress and renewal dates
- 📊 **Smart Dashboard** — Unified view of all financial alerts and summaries

### Security
- ✅ Passwords hashed with bcrypt (12 rounds)
- ✅ JWT-secured sessions via NextAuth
- ✅ Only last 4 card digits stored — no full card numbers, CVV, or sensitive data
- ✅ All API routes are authenticated
- ✅ Server-side input validation with Zod
- ✅ CSRF protection via NextAuth
- ✅ SQL injection protection via Prisma ORM

---

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Framework | Next.js 14 (App Router) |
| Language | TypeScript |
| Database | PostgreSQL (Neon-compatible) |
| ORM | Prisma 5 |
| Auth | NextAuth v5 |
| Styling | Tailwind CSS |
| Deployment | Docker + Docker Compose |

---

## Quick Start (Local Development)

### Prerequisites
- Node.js 20+
- Docker (for local PostgreSQL)

### 1. Clone & Install

```bash
git clone https://github.com/yourusername/cardzen
cd cardzen
npm install
```

### 2. Setup Environment

```bash
cp .env.example .env
```

Edit `.env`:

```env
# Option A: Use local Docker DB
DATABASE_URL="postgresql://cardzen:cardzen_dev@localhost:5432/cardzen"

# Option B: Use Neon (recommended for production)
DATABASE_URL="postgresql://username:password@ep-xxxx.us-east-2.aws.neon.tech/cardzen?sslmode=require"

NEXTAUTH_SECRET="generate-with: openssl rand -base64 32"
NEXTAUTH_URL="http://localhost:3000"
APP_ENV="development"
NEXT_PUBLIC_APP_URL="http://localhost:3000"
NEXT_PUBLIC_REGISTRATION_ENABLED=false
# Make the above variable true to enable user registration feature from the login page
```

### 3. Start Local Database (Docker)

```bash
docker-compose -f docker-compose.dev.yml up -d
```

### 4. Setup Database

```bash
npx prisma migrate dev --name init
npx prisma generate
```

### 5. Run Development Server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) and register your account.

---

## Using Neon (Recommended)

[Neon](https://neon.tech) provides serverless PostgreSQL — perfect for this app.

1. Create a free account at [neon.tech](https://neon.tech)
2. Create a new project called "cardzen"
3. Copy the connection string from the dashboard
4. Set it as `DATABASE_URL` in your `.env`
5. Run `npx prisma migrate deploy`

---

## Production Deployment (Docker)

### 1. Setup Environment

```bash
cp .env.example .env
# Edit .env with production values
```

Required environment variables:
```env
DATABASE_URL="your-neon-or-postgres-url"
NEXTAUTH_SECRET="super-secret-min-32-chars"
NEXTAUTH_URL="https://yourdomain.com"
APP_ENV="production"
NEXT_PUBLIC_APP_URL="http://localhost:3000"
NEXT_PUBLIC_REGISTRATION_ENABLED=false
```

If using bundled PostgreSQL (docker-compose.yml):
```env
POSTGRES_USER=cardzen
POSTGRES_PASSWORD=your_strong_password
```

### 2. Build & Deploy

```bash
docker-compose up -d --build
```

### 3. Run Migrations

```bash
docker-compose exec app npx prisma migrate deploy
```

### 4. Access

Open `http://your-server:3000` in your browser.

---

## Database Schema

```
User
├── CreditCard (many)
│   ├── Transaction (many)
│   │   ├── BorrowedExpense (one)
│   │   │   └── RepaymentRecord (many)
│   │   └── CashbackRecord (one)
│   ├── BillingCycle (many)
│   │   └── Transaction (many)
│   └── CashbackRecord (many)
```

---

## Project Structure

```
src/
├── app/
│   ├── (auth)/              # Login & Register pages
│   │   ├── login/
│   │   └── register/
│   ├── (dashboard)/         # Protected app pages
│   │   ├── dashboard/       # Main overview
│   │   ├── cards/           # Card management
│   │   ├── transactions/    # Expense tracking
│   │   ├── cashback/        # Cashback tracking
│   │   ├── borrowed/        # Money owed tracking
│   │   ├── annual-fee/      # Annual fee tracking
│   │   ├── billing/         # Billing cycles
│   │   └── settings/
│   └── api/                 # REST API routes
│       ├── auth/
│       ├── cards/
│       ├── transactions/
│       ├── cashback/
│       ├── borrowed/
│       ├── billing/
│       └── dashboard/
├── components/
│   ├── layout/              # Sidebar, TopBar
│   ├── cards/               # Card components
│   ├── transactions/        # Transaction components
│   ├── cashback/            # Cashback components
│   ├── borrowed/            # Borrowed expense components
│   ├── billing/             # Billing components
│   └── ui/                  # Base UI components
├── lib/
│   ├── auth.ts              # NextAuth config
│   ├── db.ts                # Prisma client
│   └── utils.ts             # Utilities
├── hooks/
│   └── use-toast.ts
├── types/
│   └── index.ts
└── middleware.ts
prisma/
└── schema.prisma
```

---

## API Reference

### Cards
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/cards` | List all cards |
| POST | `/api/cards` | Add new card |
| GET | `/api/cards/:id` | Get card details |
| PATCH | `/api/cards/:id` | Update card |
| DELETE | `/api/cards/:id` | Delete card |

### Transactions
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/transactions` | List transactions (with filters) |
| POST | `/api/transactions` | Add transaction |
| GET | `/api/transactions/:id` | Get transaction |
| PATCH | `/api/transactions/:id` | Update transaction |
| DELETE | `/api/transactions/:id` | Delete transaction |

### Borrowed Expenses
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/borrowed` | List borrowed expenses |
| POST | `/api/borrowed` | Record repayment |

### Cashback
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/cashback` | List cashback records |
| PATCH | `/api/cashback` | Update cashback status |

### Billing
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/billing` | List billing cycles |
| PATCH | `/api/billing` | Record cycle payment |

### Dashboard
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/dashboard` | Get all dashboard stats |

---

## Generating NEXTAUTH_SECRET

```bash
openssl rand -base64 32
```

---

## License

MIT — Use freely for personal projects.
