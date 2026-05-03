import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/db'
import { startOfMonth, endOfMonth, subMonths, format } from 'date-fns'

export async function GET(req: NextRequest) {
  const session = await auth()
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const userId = session.user.id
  const now = new Date()

  // Build last 6 months of data
  const months = Array.from({ length: 6 }, (_, i) => {
    const date = subMonths(now, 5 - i)
    return {
      label: format(date, 'MMM yyyy'),
      start: startOfMonth(date),
      end: endOfMonth(date),
    }
  })

  const monthlyData = await Promise.all(
    months.map(async ({ label, start, end }) => {
      const [spendAgg, categoryBreakdown, cashbackAgg] = await Promise.all([
        prisma.transaction.aggregate({
          where: { userId, date: { gte: start, lte: end } },
          _sum: { amount: true },
          _count: { id: true },
        }),
        prisma.transaction.groupBy({
          by: ['category'],
          where: { userId, date: { gte: start, lte: end } },
          _sum: { amount: true },
          orderBy: { _sum: { amount: 'desc' } },
        }),
        prisma.cashbackRecord.aggregate({
          where: {
            card: { userId },
            status: 'CREDITED',
            creditedDate: { gte: start, lte: end },
          },
          _sum: { creditedAmount: true },
        }),
      ])

      return {
        label,
        totalSpend: Number(spendAgg._sum.amount || 0),
        transactionCount: spendAgg._count.id,
        cashbackCredited: Number(cashbackAgg._sum.creditedAmount || 0),
        categoryBreakdown: categoryBreakdown.map((c) => ({
          category: c.category,
          amount: Number(c._sum.amount || 0),
        })),
      }
    })
  )

  // Card-wise summary for current month
  const cardSummary = await prisma.transaction.groupBy({
    by: ['cardId'],
    where: { userId, date: { gte: startOfMonth(now), lte: endOfMonth(now) } },
    _sum: { amount: true },
    _count: { id: true },
  })

  const cardDetails = await prisma.creditCard.findMany({
    where: { id: { in: cardSummary.map((c) => c.cardId) } },
    select: { id: true, nickname: true, bankName: true },
  })

  const cardWiseSummary = cardSummary.map((cs) => ({
    card: cardDetails.find((c) => c.id === cs.cardId),
    totalSpend: Number(cs._sum.amount || 0),
    transactionCount: cs._count.id,
  }))

  return NextResponse.json({ monthlyData, cardWiseSummary })
}
