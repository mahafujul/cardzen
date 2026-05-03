import { auth } from '@/lib/auth'
import { prisma } from '@/lib/db'
import { formatCurrency, formatDate, getDaysUntil } from '@/lib/utils'
import { cn } from '@/lib/utils'
import { Users, AlertCircle, CheckCircle2, Clock } from 'lucide-react'
import AddRepaymentBtn from '@/components/borrowed/AddRepaymentBtn'

export default async function BorrowedPage() {
  const session = await auth()
  const userId = session!.user.id

  const borrowed = await prisma.borrowedExpense.findMany({
    where: { userId },
    include: {
      transaction: { include: { card: true } },
      repayments: { orderBy: { receivedDate: 'asc' } },
    },
    orderBy: { createdAt: 'desc' },
  })

  const pending = borrowed.filter(b => b.paymentStatus !== 'FULLY_PAID')
  const settled = borrowed.filter(b => b.paymentStatus === 'FULLY_PAID')
  const overdue = pending.filter(b => b.dueDate && getDaysUntil(b.dueDate) < 0)

  const totalPending = pending.reduce((sum, b) => sum + Number(b.amountOwed) - Number(b.amountReceived), 0)

  // Person-wise summary
  const personSummary: Record<string, { name: string; total: number; count: number }> = {}
  for (const b of pending) {
    if (!personSummary[b.personName]) {
      personSummary[b.personName] = { name: b.personName, total: 0, count: 0 }
    }
    personSummary[b.personName].total += Number(b.amountOwed) - Number(b.amountReceived)
    personSummary[b.personName].count++
  }
  const personList = Object.values(personSummary).sort((a, b) => b.total - a.total)

  const STATUS_COLORS = {
    NOT_PAID: 'text-rose-700 bg-rose-50',
    PARTIALLY_PAID: 'text-amber-700 bg-amber-50',
    FULLY_PAID: 'text-emerald-700 bg-emerald-50',
  }

  const PERSON_TYPE_ICONS: Record<string, string> = {
    FRIEND: '👫',
    FAMILY: '👨‍👩‍👧',
    RELATIVE: '👴',
    COLLEAGUE: '💼',
    OTHER: '👤',
  }

  return (
    <div className="space-y-6 pb-8">
      <div>
        <h1 className="text-2xl font-bold text-foreground tracking-tight">Money Owed</h1>
        <p className="text-muted-foreground text-sm mt-0.5">Track money people owe you</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4">
        <div className="stat-card">
          <div className="w-8 h-8 rounded-lg bg-violet-50 text-violet-600 flex items-center justify-center mb-3">
            <Users className="w-4 h-4" />
          </div>
          <p className="text-xl font-bold">{formatCurrency(totalPending)}</p>
          <p className="text-xs text-muted-foreground mt-0.5">Total Pending</p>
        </div>
        <div className="stat-card">
          <div className="w-8 h-8 rounded-lg bg-rose-50 text-rose-600 flex items-center justify-center mb-3">
            <AlertCircle className="w-4 h-4" />
          </div>
          <p className="text-xl font-bold">{overdue.length}</p>
          <p className="text-xs text-muted-foreground mt-0.5">Overdue</p>
        </div>
        <div className="stat-card">
          <div className="w-8 h-8 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center mb-3">
            <CheckCircle2 className="w-4 h-4" />
          </div>
          <p className="text-xl font-bold">{settled.length}</p>
          <p className="text-xs text-muted-foreground mt-0.5">Settled</p>
        </div>
      </div>

      {/* Person summary */}
      {personList.length > 0 && (
        <div className="bg-white border border-border rounded-2xl p-5">
          <h2 className="section-heading mb-4">Who Owes You</h2>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {personList.map((p) => (
              <div key={p.name} className="flex items-center justify-between p-3 bg-secondary/30 rounded-xl">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-full bg-violet-100 flex items-center justify-center text-sm">
                    {p.name.charAt(0).toUpperCase()}
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-foreground">{p.name}</p>
                    <p className="text-xs text-muted-foreground">{p.count} transaction{p.count !== 1 ? 's' : ''}</p>
                  </div>
                </div>
                <span className="text-sm font-bold text-violet-700">{formatCurrency(p.total)}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Pending */}
      {pending.length > 0 && (
        <div>
          <h2 className="section-heading mb-3">Pending Recovery</h2>
          <div className="space-y-3">
            {pending.map((b) => {
              const remaining = Number(b.amountOwed) - Number(b.amountReceived)
              const pct = Math.round((Number(b.amountReceived) / Number(b.amountOwed)) * 100)
              const isOverdue = b.dueDate && getDaysUntil(b.dueDate) < 0
              const daysLeft = b.dueDate ? getDaysUntil(b.dueDate) : null

              return (
                <div key={b.id} className={cn(
                  'bg-white border rounded-2xl p-5',
                  isOverdue ? 'border-rose-200' : 'border-border'
                )}>
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl bg-violet-100 flex items-center justify-center font-bold text-violet-700">
                        {b.personName.charAt(0).toUpperCase()}
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <p className="font-semibold text-foreground">{b.personName}</p>
                          <span className="text-xs text-muted-foreground">{PERSON_TYPE_ICONS[b.personType]} {b.personType.toLowerCase()}</span>
                        </div>
                        <p className="text-xs text-muted-foreground">{b.transaction.title} · {b.transaction.card.nickname}</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-lg font-bold text-violet-700">{formatCurrency(remaining)}</p>
                      <p className="text-xs text-muted-foreground">of {formatCurrency(b.amountOwed)}</p>
                    </div>
                  </div>

                  {/* Progress */}
                  {b.paymentStatus === 'PARTIALLY_PAID' && (
                    <div className="mb-3">
                      <div className="flex justify-between text-xs text-muted-foreground mb-1">
                        <span>Received: {formatCurrency(b.amountReceived)}</span>
                        <span>{pct}%</span>
                      </div>
                      <div className="h-1.5 bg-secondary rounded-full overflow-hidden">
                        <div className="h-full bg-amber-500 rounded-full" style={{ width: `${pct}%` }} />
                      </div>
                    </div>
                  )}

                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className={cn(
                        'text-xs font-semibold px-2 py-0.5 rounded-full',
                        STATUS_COLORS[b.paymentStatus as keyof typeof STATUS_COLORS]
                      )}>
                        {b.paymentStatus.replace(/_/g, ' ')}
                      </span>
                      {daysLeft !== null && (
                        <span className={cn(
                          'text-xs',
                          isOverdue ? 'text-rose-600 font-semibold' : 'text-muted-foreground'
                        )}>
                          {isOverdue ? `${Math.abs(daysLeft)}d overdue` : `due in ${daysLeft}d`}
                        </span>
                      )}
                    </div>
                    <AddRepaymentBtn borrowedId={b.id} personName={b.personName} remaining={remaining} />
                  </div>

                  {/* Repayment history */}
                  {b.repayments.length > 0 && (
                    <div className="mt-3 pt-3 border-t border-border space-y-1.5">
                      <p className="text-xs font-medium text-muted-foreground">Payment history:</p>
                      {b.repayments.map((r) => (
                        <div key={r.id} className="flex justify-between text-xs">
                          <span className="text-muted-foreground">{formatDate(r.receivedDate)}</span>
                          <span className="text-emerald-600 font-semibold">+{formatCurrency(r.amount)}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* Settled */}
      {settled.length > 0 && (
        <div>
          <h2 className="section-heading mb-3">Settled</h2>
          <div className="space-y-2">
            {settled.map((b) => (
              <div key={b.id} className="bg-white border border-border rounded-xl px-5 py-3 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <CheckCircle2 className="w-4 h-4 text-emerald-500 flex-shrink-0" />
                  <div>
                    <p className="text-sm font-semibold text-foreground">{b.personName}</p>
                    <p className="text-xs text-muted-foreground">{b.transaction.title}</p>
                  </div>
                </div>
                <span className="text-sm font-bold text-emerald-600">{formatCurrency(b.amountOwed)}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {borrowed.length === 0 && (
        <div className="text-center py-20">
          <Users className="w-12 h-12 text-muted-foreground mx-auto mb-3" />
          <h3 className="font-semibold mb-1">No borrowed expenses</h3>
          <p className="text-sm text-muted-foreground">When you add transactions for others, they'll appear here</p>
        </div>
      )}
    </div>
  )
}
