import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/db'
import { getQuarterDates, getAnnualSpendStart, getDaysUntil, getBillingCycleDates } from '@/lib/utils'
import { startOfMonth, endOfMonth, subMonths } from 'date-fns'

export async function GET(req: NextRequest) {
  const session = await auth()
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const userId = session.user.id
  const now = new Date()
  const thisMonthStart = startOfMonth(now)
  const thisMonthEnd = endOfMonth(now)
  const lastMonthStart = startOfMonth(subMonths(now, 1))
  const lastMonthEnd = endOfMonth(subMonths(now, 1))

  const [
    cards,
    thisMonthTransactions,
    lastMonthTransactions,
    pendingCashback,
    creditedCashback,
    pendingBorrowed,
    recentTransactions,
    upcomingBillingCycles,
    categoryBreakdown,
  ] = await Promise.all([
    prisma.creditCard.findMany({
      where: { userId, cardStatus: 'ACTIVE' },
    }),
    prisma.transaction.aggregate({
      where: { userId, date: { gte: thisMonthStart, lte: thisMonthEnd } },
      _sum: { amount: true },
    }),
    prisma.transaction.aggregate({
      where: { userId, date: { gte: lastMonthStart, lte: lastMonthEnd } },
      _sum: { amount: true },
    }),
    prisma.cashbackRecord.aggregate({
      where: { card: { userId }, status: 'PENDING' },
      _sum: { expectedAmount: true },
    }),
    prisma.cashbackRecord.aggregate({
      where: { card: { userId }, status: 'CREDITED' },
      _sum: { creditedAmount: true },
    }),
    prisma.borrowedExpense.findMany({
      where: { userId, paymentStatus: { not: 'FULLY_PAID' } },
      include: {
        transaction: { include: { card: true } },
        repayments: true,
      },
    }),
    prisma.transaction.findMany({
      where: { userId },
      include: { card: true, borrowedExpense: { include: { repayments: true } }, cashbackRecord: true },
      orderBy: { date: 'desc' },
      take: 10,
    }),
    prisma.billingCycle.findMany({
      where: {
        card: { userId },
        paymentStatus: { not: 'PAID' },
        dueDate: { gte: now },
      },
      include: { card: true },
      orderBy: { dueDate: 'asc' },
      take: 10,
    }),
    prisma.transaction.groupBy({
      by: ['category'],
      where: { userId, date: { gte: thisMonthStart, lte: thisMonthEnd } },
      _sum: { amount: true },
      _count: { id: true },
    }),
  ])

  // Calculate outstanding per card
  let totalOutstanding = 0
  const upcomingDues = upcomingBillingCycles.map((cycle) => {
    const amount = Number(cycle.totalSpend) - Number(cycle.paidAmount)
    totalOutstanding += amount
    return {
      card: cycle.card,
      dueDate: cycle.dueDate,
      amount,
      daysUntilDue: getDaysUntil(cycle.dueDate),
    }
  })

  // Cashback cap alerts
  const cashbackCapAlerts = await Promise.all(
    cards
      .filter((c) => c.cashbackCapType !== 'NO_CAP' && c.cashbackCapAmount)
      .map(async (card) => {
        let periodStart: Date
        let resetDate: Date

        if (card.cashbackCapType === 'QUARTERLY_CAP' && card.quarterStartMonth) {
          const { start, end } = getQuarterDates(card.quarterStartMonth)
          periodStart = start
          resetDate = new Date(end)
          resetDate.setDate(resetDate.getDate() + 1)
        } else if (card.cashbackCapType === 'MONTHLY_CAP') {
          periodStart = thisMonthStart
          resetDate = new Date(thisMonthEnd)
          resetDate.setDate(resetDate.getDate() + 1)
        } else {
          periodStart = getAnnualSpendStart(card.feeRenewalMonth || 1)
          const end = new Date(periodStart)
          end.setFullYear(end.getFullYear() + 1)
          resetDate = end
        }

        const cashbackInPeriod = await prisma.cashbackRecord.aggregate({
          where: {
            cardId: card.id,
            status: { not: 'MISSED' },
            createdAt: { gte: periodStart },
          },
          _sum: { expectedAmount: true },
        })

        const usedAmount = Number(cashbackInPeriod._sum.expectedAmount || 0)
        const capAmount = Number(card.cashbackCapAmount)
        const remainingAmount = Math.max(0, capAmount - usedAmount)
        const percentUsed = Math.min(100, Math.round((usedAmount / capAmount) * 100))

        return {
          card,
          capAmount,
          usedAmount,
          remainingAmount,
          percentUsed,
          resetDate,
        }
      })
  )

  // Annual fee alerts
  const annualFeeAlerts = await Promise.all(
    cards
      .filter((c) => c.feeType !== 'LIFETIME_FREE' && c.annualFeeAmount && c.annualSpendWaiver)
      .map(async (card) => {
        const yearStart = getAnnualSpendStart(card.feeRenewalMonth || now.getMonth() + 1)
        const annualSpend = await prisma.transaction.aggregate({
          where: { cardId: card.id, date: { gte: yearStart } },
          _sum: { amount: true },
        })

        const currentSpend = Number(annualSpend._sum.amount || 0)
        const spendToWaive = Number(card.annualSpendWaiver)
        const remainingToWaive = Math.max(0, spendToWaive - currentSpend)

        return {
          card,
          feeAmount: Number(card.annualFeeAmount),
          spendToWaive,
          currentSpend,
          remainingToWaive,
          renewalMonth: card.feeRenewalMonth || 0,
        }
      })
  )

  const stats = {
    totalOutstanding,
    totalCashbackPending: Number(pendingCashback._sum.expectedAmount || 0),
    totalCashbackCredited: Number(creditedCashback._sum.creditedAmount || 0),
    totalBorrowedPending: pendingBorrowed.reduce(
      (sum, b) => sum + Number(b.amountOwed) - Number(b.amountReceived),
      0
    ),
    cardsCount: cards.length,
    thisMonthSpend: Number(thisMonthTransactions._sum.amount || 0),
    lastMonthSpend: Number(lastMonthTransactions._sum.amount || 0),
    upcomingDues,
    cashbackCapAlerts: cashbackCapAlerts.filter((a) => a.percentUsed >= 50),
    annualFeeAlerts,
    categoryBreakdown: categoryBreakdown.map((c) => ({
      category: c.category,
      amount: Number(c._sum.amount || 0),
      count: c._count.id,
    })),
    recentTransactions,
    borrowedExpenseAlerts: pendingBorrowed.filter(
      (b) => b.dueDate && getDaysUntil(b.dueDate) <= 7
    ),
  }

  return NextResponse.json(stats)
}
