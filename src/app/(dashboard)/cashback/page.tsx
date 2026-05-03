import { auth } from '@/lib/auth'
import { prisma } from '@/lib/db'
import { formatCurrency, formatDate, getQuarterDates, percentOf } from '@/lib/utils'
import { cn } from '@/lib/utils'
import CashbackStatusBtn from '@/components/cashback/CashbackStatusBtn'
import { CheckCircle2, Clock, XCircle, TrendingUp } from 'lucide-react'

export default async function CashbackPage() {
  const session = await auth()
  const userId = session!.user.id

  const [cashbackRecords, cards] = await Promise.all([
    prisma.cashbackRecord.findMany({
      where: { card: { userId } },
      include: {
        card: { select: { id: true, nickname: true, bankName: true, cashbackCapType: true, cashbackCapAmount: true, quarterStartMonth: true } },
        transaction: { select: { title: true, amount: true, date: true, category: true } },
      },
      orderBy: { createdAt: 'desc' },
    }),
    prisma.creditCard.findMany({
      where: { userId, cardStatus: 'ACTIVE', cashbackCapType: { not: 'NO_CAP' } },
    }),
  ])

  const pending = cashbackRecords.filter(r => r.status === 'PENDING')
  const credited = cashbackRecords.filter(r => r.status === 'CREDITED')
  const missed = cashbackRecords.filter(r => r.status === 'MISSED')

  const totalPending = pending.reduce((sum, r) => sum + Number(r.expectedAmount), 0)
  const totalCredited = credited.reduce((sum, r) => sum + Number(r.creditedAmount || 0), 0)

  // Cashback cap calculations
  const capData = await Promise.all(
    cards.map(async (card) => {
      let periodStart = new Date()
      let resetDate = new Date()
      const now = new Date()

      if (card.cashbackCapType === 'QUARTERLY_CAP' && card.quarterStartMonth) {
        const { start, end } = getQuarterDates(card.quarterStartMonth)
        periodStart = start
        resetDate = new Date(end)
        resetDate.setDate(resetDate.getDate() + 1)
      } else if (card.cashbackCapType === 'MONTHLY_CAP') {
        periodStart = new Date(now.getFullYear(), now.getMonth(), 1)
        resetDate = new Date(now.getFullYear(), now.getMonth() + 1, 1)
      }

      const agg = await prisma.cashbackRecord.aggregate({
        where: { cardId: card.id, status: { not: 'MISSED' }, createdAt: { gte: periodStart } },
        _sum: { expectedAmount: true },
      })

      const used = Number(agg._sum.expectedAmount || 0)
      const cap = Number(card.cashbackCapAmount || 0)
      return { card, used, cap, remaining: Math.max(0, cap - used), pct: percentOf(used, cap), resetDate }
    })
  )

  const STATUS_MAP = {
    PENDING: { label: 'Pending', icon: Clock, cls: 'text-amber-600 bg-amber-50' },
    CREDITED: { label: 'Credited', icon: CheckCircle2, cls: 'text-emerald-600 bg-emerald-50' },
    MISSED: { label: 'Missed', icon: XCircle, cls: 'text-rose-600 bg-rose-50' },
  }

  return (
    <div className="space-y-6 pb-8">
      <div>
        <h1 className="text-2xl font-bold text-foreground tracking-tight">Cashback</h1>
        <p className="text-muted-foreground text-sm mt-0.5">Track your cashback earnings</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4">
        <div className="stat-card">
          <div className="w-8 h-8 rounded-lg bg-amber-50 text-amber-600 flex items-center justify-center mb-3">
            <Clock className="w-4 h-4" />
          </div>
          <p className="text-xl font-bold">{formatCurrency(totalPending)}</p>
          <p className="text-xs text-muted-foreground mt-0.5">Pending ({pending.length})</p>
        </div>
        <div className="stat-card">
          <div className="w-8 h-8 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center mb-3">
            <CheckCircle2 className="w-4 h-4" />
          </div>
          <p className="text-xl font-bold">{formatCurrency(totalCredited)}</p>
          <p className="text-xs text-muted-foreground mt-0.5">Credited ({credited.length})</p>
        </div>
        <div className="stat-card">
          <div className="w-8 h-8 rounded-lg bg-rose-50 text-rose-600 flex items-center justify-center mb-3">
            <XCircle className="w-4 h-4" />
          </div>
          <p className="text-xl font-bold">{missed.length}</p>
          <p className="text-xs text-muted-foreground mt-0.5">Missed</p>
        </div>
      </div>

      {/* Cap utilization cards */}
      {capData.length > 0 && (
        <div>
          <h2 className="section-heading mb-3">Cashback Cap Status</h2>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {capData.map(({ card, used, cap, remaining, pct, resetDate }) => (
              <div key={card.id} className={cn(
                'bg-white border rounded-2xl p-4',
                pct >= 100 ? 'border-rose-200' : pct >= 80 ? 'border-amber-200' : 'border-border'
              )}>
                <div className="flex items-center justify-between mb-3">
                  <div>
                    <p className="font-semibold text-sm text-foreground">{card.nickname}</p>
                    <p className="text-xs text-muted-foreground">{card.bankName}</p>
                  </div>
                  <span className={cn(
                    'text-xs font-bold px-2 py-0.5 rounded-full',
                    pct >= 100 ? 'bg-rose-100 text-rose-700' :
                      pct >= 80 ? 'bg-amber-100 text-amber-700' : 'bg-emerald-100 text-emerald-700'
                  )}>
                    {pct}%
                  </span>
                </div>
                <div className="space-y-2">
                  <div className="h-2 bg-secondary rounded-full overflow-hidden">
                    <div
                      className={cn(
                        'h-full rounded-full transition-all',
                        pct >= 100 ? 'bg-rose-500' : pct >= 80 ? 'bg-amber-500' : 'bg-blue-500'
                      )}
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                  <div className="flex justify-between text-xs text-muted-foreground">
                    <span>{formatCurrency(used)} used</span>
                    <span>{formatCurrency(cap)} cap</span>
                  </div>
                  {pct < 100 ? (
                    <p className="text-xs text-emerald-600 font-medium">
                      {formatCurrency(remaining)} remaining
                    </p>
                  ) : (
                    <p className="text-xs text-rose-600 font-medium">Cap fully utilized</p>
                  )}
                  <p className="text-xs text-muted-foreground">
                    Resets {formatDate(resetDate)}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Cashback records */}
      <div>
        <h2 className="section-heading mb-3">All Cashback Records</h2>
        {cashbackRecords.length === 0 ? (
          <div className="bg-white border border-border rounded-2xl p-10 text-center">
            <TrendingUp className="w-10 h-10 text-muted-foreground mx-auto mb-3" />
            <p className="font-semibold text-foreground mb-1">No cashback records</p>
            <p className="text-sm text-muted-foreground">Add transactions with cashback tracking to see them here</p>
          </div>
        ) : (
          <div className="bg-white border border-border rounded-2xl overflow-hidden">
            <table className="w-full">
              <thead>
                <tr className="border-b border-border bg-secondary/30">
                  <th className="text-left text-xs font-semibold text-muted-foreground px-5 py-3">Transaction</th>
                  <th className="text-left text-xs font-semibold text-muted-foreground px-3 py-3 hidden sm:table-cell">Card</th>
                  <th className="text-left text-xs font-semibold text-muted-foreground px-3 py-3 hidden md:table-cell">Expected Period</th>
                  <th className="text-left text-xs font-semibold text-muted-foreground px-3 py-3">Status</th>
                  <th className="text-right text-xs font-semibold text-muted-foreground px-5 py-3">Amount</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {cashbackRecords.map((record) => {
                  const statusInfo = STATUS_MAP[record.status as keyof typeof STATUS_MAP]
                  const Icon = statusInfo.icon
                  return (
                    <tr key={record.id} className="hover:bg-secondary/20 transition-colors">
                      <td className="px-5 py-3.5">
                        <p className="text-sm font-medium text-foreground">{record.transaction.title}</p>
                        <p className="text-xs text-muted-foreground">{formatDate(record.transaction.date)}</p>
                        <p className="text-xs text-muted-foreground">Spent: {formatCurrency(record.transaction.amount)}</p>
                      </td>
                      <td className="px-3 py-3.5 hidden sm:table-cell">
                        <p className="text-xs font-medium">{record.card.nickname}</p>
                        <p className="text-xs text-muted-foreground">{record.card.bankName}</p>
                      </td>
                      <td className="px-3 py-3.5 text-xs text-muted-foreground hidden md:table-cell">
                        <p>{formatDate(record.periodStart)}</p>
                        <p>to {formatDate(record.periodEnd)}</p>
                      </td>
                      <td className="px-3 py-3.5">
                        <CashbackStatusBtn record={record} />
                      </td>
                      <td className="px-5 py-3.5 text-right">
                        <p className="text-sm font-bold text-foreground">
                          {formatCurrency(record.creditedAmount || record.expectedAmount)}
                        </p>
                        {record.creditedAmount && Number(record.creditedAmount) !== Number(record.expectedAmount) && (
                          <p className="text-xs text-muted-foreground">
                            Expected: {formatCurrency(record.expectedAmount)}
                          </p>
                        )}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}
