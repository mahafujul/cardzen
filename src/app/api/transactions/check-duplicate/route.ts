import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/db'
import { subDays } from 'date-fns'

export async function POST(req: NextRequest) {
  const session = await auth()
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const body = await req.json()
  const { cardId, amount, title, date } = body

  if (!cardId || !amount || !title || !date) {
    return NextResponse.json({ duplicates: [] })
  }

  const txDate = new Date(date)
  const windowStart = subDays(txDate, 2)
  const windowEnd = new Date(txDate)
  windowEnd.setDate(windowEnd.getDate() + 2)

  // Find potential duplicates: same card, same amount, similar title, within ±2 days
  const candidates = await prisma.transaction.findMany({
    where: {
      userId: session.user.id,
      cardId,
      amount: { equals: amount },
      date: { gte: windowStart, lte: windowEnd },
    },
    select: { id: true, title: true, amount: true, date: true, merchantName: true },
    take: 5,
  })

  // Filter by title similarity (simple check)
  const titleLower = title.toLowerCase().trim()
  const duplicates = candidates.filter((tx) => {
    const txTitleLower = tx.title.toLowerCase().trim()
    // Check if titles share at least 4 chars in common or are similar
    return txTitleLower.includes(titleLower.slice(0, 4)) || titleLower.includes(txTitleLower.slice(0, 4))
  })

  return NextResponse.json({ duplicates })
}
