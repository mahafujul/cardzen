# CardZen Deployment Guide

## Option A: Local Development

### Requirements
- Node.js 20+
- PostgreSQL (local or Neon)

### Steps

```bash
# 1. Install & setup
bash setup.sh

# OR manually:
npm install
cp .env.example .env
# Edit .env with your DATABASE_URL and NEXTAUTH_SECRET
npx prisma generate
npx prisma migrate deploy
npm run dev
```

### Local PostgreSQL via Docker

```bash
docker-compose -f docker-compose.dev.yml up -d
# DATABASE_URL="postgresql://cardzen:cardzen_dev@localhost:5432/cardzen"
```

---

## Option B: Full Docker Deployment

### Requirements
- Docker & Docker Compose

### Steps

```bash
# 1. Clone & configure
cp .env.example .env

# Edit .env — minimum required:
# DATABASE_URL=postgresql://cardzen:YOURPASS@db:5432/cardzen
# NEXTAUTH_SECRET=<run: openssl rand -base64 32>
# NEXTAUTH_URL=http://your-server-ip:3000
# POSTGRES_PASSWORD=YOURPASS

# 2. Build & start
docker-compose up -d --build

# 3. Run migrations (first time only)
docker-compose exec app npx prisma migrate deploy

# 4. Access
open http://localhost:3000
```

### View logs
```bash
docker-compose logs -f app
docker-compose logs -f db
```

### Stop
```bash
docker-compose down
```

### Destroy (removes all data)
```bash
docker-compose down -v
```

---

## Option C: Neon + Vercel (Recommended for Production)

### 1. Database (Neon)
1. Create account at https://neon.tech
2. New project → name it "cardzen"
3. Copy the **pooled connection string**

### 2. Deploy to Vercel
1. Push code to GitHub
2. Import project at https://vercel.com
3. Add environment variables:
   - `DATABASE_URL` — Neon connection string
   - `NEXTAUTH_SECRET` — `openssl rand -base64 32`
   - `NEXTAUTH_URL` — `https://your-app.vercel.app`
   - `APP_ENV` — `production`

### 3. Run migrations
```bash
# From local machine with DATABASE_URL set to Neon:
npx prisma migrate deploy
```

---

## Environment Variables Reference

| Variable | Required | Description |
|----------|----------|-------------|
| `DATABASE_URL` | ✅ | PostgreSQL connection string |
| `NEXTAUTH_SECRET` | ✅ | Random secret for JWT signing (min 32 chars) |
| `NEXTAUTH_URL` | ✅ | Full URL of your app (e.g. http://localhost:3000) |
| `APP_ENV` | ❌ | `development` or `production` (default: production) |
| `POSTGRES_USER` | Docker only | PostgreSQL username |
| `POSTGRES_PASSWORD` | Docker only | PostgreSQL password |

### Generate NEXTAUTH_SECRET
```bash
openssl rand -base64 32
```

---

## Database Backup

```bash
# Backup
docker-compose exec db pg_dump -U cardzen cardzen > backup_$(date +%Y%m%d).sql

# Restore
docker-compose exec -T db psql -U cardzen cardzen < backup_20240101.sql
```

---

## Troubleshooting

### "Cannot connect to database"
- Check `DATABASE_URL` in `.env`
- Ensure PostgreSQL is running
- For Neon, ensure SSL mode is set: `?sslmode=require`

### "NEXTAUTH_SECRET is missing"
```bash
# Generate one:
openssl rand -base64 32
```

### "Prisma client not found"
```bash
npx prisma generate
```

### Container won't start
```bash
docker-compose logs app
```
