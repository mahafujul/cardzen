#!/bin/bash
set -e

echo "🃏 CardZen Setup"
echo "================"

# Check Node
if ! command -v node &> /dev/null; then
  echo "❌ Node.js is required. Install from https://nodejs.org"
  exit 1
fi
echo "✅ Node.js $(node -v)"

# Check npm
if ! command -v npm &> /dev/null; then
  echo "❌ npm is required"
  exit 1
fi

# Check .env
if [ ! -f ".env" ]; then
  echo ""
  echo "📋 Creating .env from .env.example..."
  cp .env.example .env
  echo "⚠️  Please edit .env and set:"
  echo "   DATABASE_URL - your PostgreSQL connection string"
  echo "   NEXTAUTH_SECRET - run: openssl rand -base64 32"
  echo ""
  read -p "Press Enter after editing .env..."
fi

# Install dependencies
echo ""
echo "📦 Installing dependencies..."
npm install

# Generate Prisma client
echo ""
echo "🔧 Generating Prisma client..."
npx prisma generate

# Run migrations
echo ""
echo "🗄️  Running database migrations..."
npx prisma migrate deploy

echo ""
echo "✅ Setup complete!"
echo ""
echo "▶️  Run the app:"
echo "   npm run dev"
echo ""
echo "🌐 Open: http://localhost:3000"
