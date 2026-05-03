import { auth } from '@/lib/auth'
import { prisma } from '@/lib/db'
import { startOfMonth, endOfMonth, subMonths, format } from 'date-fns'
import { formatCurrency } from '@/lib/utils'
import SpendingCharts from '@/components/dashboard/SpendingCharts'

export default async function AnalyticsPage() {
  const session = await auth()
  const userId = session!.user.id
  const now = new Date()

  // Last 6 months monthly data
  const months = Array.from({ length: 6 }, (_, i) => {
    const date = subMonths(now, 5 - i)
    return { label: format(date, 'MMM'), start: startOfMonth(date), end: endOfMonth(date) }
  })

  const monthlyData = await Promise.all(
    months.map(async ({ label, start, end }) => {
      const agg = await prisma.transaction.aggregate({
        where: { userId, date: { gte: start, lte: end } },
        _sum: { amount: true },
      })
      return { label, amount: Number(agg._sum.amount || 0) }
    })
  )

  // Category breakdown this month
  const categoryData = await prisma.transaction.groupBy({
    by: ['category'],
    where: { userId, date: { gte: startOfMonth(now), lte: endOfMonth(now) } },
    _sum: { amount: true },
    orderBy: { _sum: { amount: 'desc' } },
  })

  const totalThisMonth = categoryData.reduce((sum, c) => sum + Number(c._sum.amount || 0), 0)

  const categoryColors: Record<string, string> = {
    FOOD: '#3b82f6', SHOPPING: '#8b5cf6', TRAVEL: '#06b6d4', UTILITY: '#f59e0b',
    BILLS: '#ef4444', SUBSCRIPTION: '#10b981', MEDICAL: '#ec4899', FUEL: '#f97316', OTHERS: '#6b7280',
  }

  const categoryLabels: Record<string, string> = {
    FOOD: 'Food', SHOPPING: 'Shopping', TRAVEL: 'Travel', UTILITY: 'Utility',
    BILLS: 'Bills', SUBSCRIPTION: 'Subscription', MEDICAL: 'Medical', FUEL: 'Fuel', OTHERS: 'Others',
  }

  const chartCategoryData = categoryData.map((c) => ({
    name: categoryLabels[c.category] || c.category,
    value: Number(c._sum.amount || 0),
    color: categoryColors[c.category] || '#6b7280',
  }))

  // Card-wise current month
  const cardData = await prisma.transaction.groupBy({
    by: ['cardId'],
    where: { userId, date: { gte: startOfMonth(now), lte: endOfMonth(now) } },
    _sum: { amount: true },
    orderBy: { _sum: { amount: 'desc' } },
  })

  const cards = await prisma.creditCard.findMany({
    where: { id: { in: cardData.map((c) => c.cardId) } },
    select: { id: true, nickname: true, bankName: true },
  })

  const cardChartData = cardData.map((cd) => {
    const card = cards.find((c) => c.id === cd.cardId)
    return {
      name: card?.nickname || 'Unknown',
      amount: Number(cd._sum.amount || 0),
    }
  })

  return (
    <div className="space-y-6 pb-8">
      <div>
        <h1 className="text-2xl font-bold text-foreground tracking-tight">Analytics</h1>
        <p className="text-muted-foreground text-sm mt-0.5">Spending insights and trends</p>
      </div>

      <SpendingCharts
        monthlyData={monthlyData}
        categoryData={chartCategoryData}
        cardData={cardChartData}
        totalThisMonth={totalThisMonth}
      />
    </div>
  )
}
