import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import {
  formatCurrency,
  formatDate,
  getDaysUntil,
  percentOf,
} from "@/lib/utils";
import { startOfMonth, endOfMonth, subMonths } from "date-fns";
import {
  CreditCard,
  TrendingUp,
  TrendingDown,
  AlertCircle,
  Clock,
  Percent,
  Users,
  ArrowRight,
} from "lucide-react";
import Link from "next/link";
import { cn } from "@/lib/utils";

export default async function DashboardPage() {
  const session = await auth();
  const userId = session!.user.id;
  const now = new Date();

  const [cards, recentTx, pendingBorrowed, pendingCashback, upcomingCycles] =
    await Promise.all([
      prisma.creditCard.findMany({
        where: { userId, cardStatus: "ACTIVE" },
      }),
      prisma.transaction.findMany({
        where: { userId },
        include: { card: true, borrowedExpense: true },
        orderBy: { date: "desc" },
        take: 8,
      }),
      prisma.borrowedExpense.findMany({
        where: { userId, paymentStatus: { not: "FULLY_PAID" } },
        include: { transaction: { include: { card: true } } },
        orderBy: { createdAt: "desc" },
      }),
      prisma.cashbackRecord.findMany({
        where: { card: { userId }, status: "PENDING" },
        include: {
          card: { select: { nickname: true } },
          transaction: { select: { title: true } },
        },
        orderBy: { createdAt: "desc" },
        take: 5,
      }),
      prisma.billingCycle.findMany({
        where: {
          card: { userId },
          paymentStatus: { not: "PAID" },
          dueDate: { gte: now },
        },
        include: { card: true },
        orderBy: { dueDate: "asc" },
        take: 5,
      }),
    ]);

  const thisMonthStart = startOfMonth(now);
  const thisMonthEnd = endOfMonth(now);
  const lastMonthStart = startOfMonth(subMonths(now, 1));
  const lastMonthEnd = endOfMonth(subMonths(now, 1));

  const [thisMonthAgg, lastMonthAgg, categoryAgg] = await Promise.all([
    prisma.transaction.aggregate({
      where: { userId, date: { gte: thisMonthStart, lte: thisMonthEnd } },
      _sum: { amount: true },
    }),
    prisma.transaction.aggregate({
      where: { userId, date: { gte: lastMonthStart, lte: lastMonthEnd } },
      _sum: { amount: true },
    }),
    prisma.transaction.groupBy({
      by: ["category"],
      where: { userId, date: { gte: thisMonthStart, lte: thisMonthEnd } },
      _sum: { amount: true },
      _count: true,
      orderBy: { _sum: { amount: "desc" } },
      take: 5,
    }),
  ]);

  const thisMonthSpend = Number(thisMonthAgg._sum.amount || 0);
  const lastMonthSpend = Number(lastMonthAgg._sum.amount || 0);
  const spendDelta =
    lastMonthSpend > 0
      ? ((thisMonthSpend - lastMonthSpend) / lastMonthSpend) * 100
      : 0;

  const totalPendingBorrowed = pendingBorrowed.reduce(
    (sum, b) => sum + Number(b.amountOwed) - Number(b.amountReceived),
    0,
  );
  const totalCashbackPending = pendingCashback.reduce(
    (sum, c) => sum + Number(c.expectedAmount),
    0,
  );
  const totalOutstanding = upcomingCycles.reduce(
    (sum, c) => sum + Number(c.totalSpend) - Number(c.paidAmount),
    0,
  );

  const CATEGORY_LABELS: Record<string, string> = {
    FOOD: "🍽️ Food",
    SHOPPING: "🛍️ Shopping",
    TRAVEL: "✈️ Travel",
    UTILITY: "⚡ Utility",
    BILLS: "📋 Bills",
    SUBSCRIPTION: "🔄 Subscriptions",
    MEDICAL: "🏥 Medical",
    FUEL: "⛽ Fuel",
    OTHERS: "📦 Others",
  };

  const CARD_GRADIENTS = [
    "from-blue-600 to-blue-400",
    "from-violet-600 to-violet-400",
    "from-emerald-600 to-emerald-400",
    "from-rose-600 to-rose-400",
    "from-amber-600 to-amber-400",
    "from-slate-600 to-slate-400",
  ];

  return (
    <div className="space-y-6 pb-8">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-foreground tracking-tight">
          Dashboard
        </h1>
        <p className="text-muted-foreground text-sm mt-0.5">
          Your credit card overview
        </p>
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          label="Total Outstanding"
          value={formatCurrency(totalOutstanding)}
          icon={<CreditCard className="w-4 h-4" />}
          color="blue"
          sub={`${upcomingCycles.length} active cycles`}
        />
        <StatCard
          label="This Month"
          value={formatCurrency(thisMonthSpend)}
          icon={
            spendDelta >= 0 ? (
              <TrendingUp className="w-4 h-4" />
            ) : (
              <TrendingDown className="w-4 h-4" />
            )
          }
          color={spendDelta > 10 ? "rose" : "emerald"}
          sub={`${spendDelta > 0 ? "+" : ""}${spendDelta.toFixed(0)}% vs last month`}
        />
        <StatCard
          label="Cashback Pending"
          value={formatCurrency(totalCashbackPending)}
          icon={<Percent className="w-4 h-4" />}
          color="amber"
          sub={`${pendingCashback.length} transactions`}
        />
        <StatCard
          label="To Recover"
          value={formatCurrency(totalPendingBorrowed)}
          icon={<Users className="w-4 h-4" />}
          color="violet"
          sub={`${pendingBorrowed.length} people`}
        />
      </div>

      <div className="grid lg:grid-cols-3 gap-6">
        {/* Left column */}
        <div className="lg:col-span-2 space-y-6">
          {/* Upcoming dues */}
          {upcomingCycles.length > 0 && (
            <div className="stat-card">
              <div className="flex items-center justify-between mb-4">
                <h2 className="section-heading">Upcoming Payments</h2>
                <Link
                  href="/billing"
                  className="text-xs text-blue-600 hover:text-blue-500 flex items-center gap-1"
                >
                  View all <ArrowRight className="w-3 h-3" />
                </Link>
              </div>
              <div className="space-y-3">
                {upcomingCycles.map((cycle) => {
                  const days = getDaysUntil(cycle.dueDate);
                  const amount =
                    Number(cycle.totalSpend) - Number(cycle.paidAmount);
                  const urgent = days <= 3;
                  return (
                    <div
                      key={cycle.id}
                      className={cn(
                        "flex items-center justify-between p-3 rounded-xl border",
                        urgent
                          ? "bg-rose-50 border-rose-100"
                          : "bg-secondary/30 border-border",
                      )}
                    >
                      <div className="flex items-center gap-3">
                        {urgent && (
                          <AlertCircle className="w-4 h-4 text-rose-500 flex-shrink-0" />
                        )}
                        {!urgent && (
                          <Clock className="w-4 h-4 text-muted-foreground flex-shrink-0" />
                        )}
                        <div>
                          <p className="text-sm font-semibold text-foreground">
                            {cycle.card.nickname}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            {cycle.card.bankName}
                          </p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p
                          className={cn(
                            "text-sm font-bold",
                            urgent ? "text-rose-600" : "text-foreground",
                          )}
                        >
                          {formatCurrency(amount)}
                        </p>
                        <p
                          className={cn(
                            "text-xs",
                            urgent ? "text-rose-500" : "text-muted-foreground",
                          )}
                        >
                          Due in {days} day{days !== 1 ? "s" : ""}
                        </p>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Recent transactions */}
          <div className="stat-card">
            <div className="flex items-center justify-between mb-4">
              <h2 className="section-heading">Recent Transactions</h2>
              <Link
                href="/transactions"
                className="text-xs text-blue-600 hover:text-blue-500 flex items-center gap-1"
              >
                View all <ArrowRight className="w-3 h-3" />
              </Link>
            </div>
            {recentTx.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-6">
                No transactions yet
              </p>
            ) : (
              <div className="space-y-2">
                {recentTx.map((tx) => (
                  <div
                    key={tx.id}
                    className="flex items-center justify-between py-2.5 border-b border-border last:border-0"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-lg bg-secondary flex items-center justify-center text-sm">
                        {CATEGORY_LABELS[tx.category]?.charAt(0) || "📦"}
                      </div>
                      <div>
                        <p className="text-sm font-medium text-foreground">
                          {tx.title}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {tx.card.nickname} · {formatDate(tx.date)}
                        </p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-semibold text-foreground">
                        {formatCurrency(Number(tx.amount))}
                      </p>
                      {tx.borrowedExpense && (
                        <span className="text-xs text-violet-600 font-medium">
                          Borrowed
                        </span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Right column */}
        <div className="space-y-5">
          {/* My cards */}
          <div className="stat-card">
            <div className="flex items-center justify-between mb-4">
              <h2 className="section-heading">My Cards</h2>
              <Link
                href="/cards"
                className="text-xs text-blue-600 hover:text-blue-500 flex items-center gap-1"
              >
                Manage <ArrowRight className="w-3 h-3" />
              </Link>
            </div>
            {cards.length === 0 ? (
              <div className="text-center py-6">
                <p className="text-sm text-muted-foreground mb-3">
                  No cards added yet
                </p>
                <Link
                  href="/cards/new"
                  className="text-sm font-medium text-blue-600 hover:text-blue-500"
                >
                  Add your first card →
                </Link>
              </div>
            ) : (
              <div className="space-y-2.5">
                {cards.slice(0, 4).map((card, i) => (
                  <div
                    key={card.id}
                    className={cn(
                      "p-3 rounded-xl bg-gradient-to-r text-white",
                      CARD_GRADIENTS[i % CARD_GRADIENTS.length],
                    )}
                  >
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-xs font-medium opacity-80">
                          {card.bankName}
                        </p>
                        <p className="text-sm font-bold">{card.nickname}</p>
                      </div>
                      <div className="text-right">
                        <p className="text-xs opacity-80">
                          •••• {card.lastFourDigits}
                        </p>
                        <p className="text-xs opacity-70">{card.cardType}</p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Category breakdown */}
          {categoryAgg.length > 0 && (
            <div className="stat-card">
              <h2 className="section-heading mb-4">Spending This Month</h2>
              <div className="space-y-3">
                {categoryAgg.map((cat) => {
                  const amount = Number(cat._sum.amount || 0);
                  const pct = percentOf(amount, thisMonthSpend);
                  return (
                    <div key={cat.category}>
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-xs text-muted-foreground">
                          {CATEGORY_LABELS[cat.category] || cat.category}
                        </span>
                        <span className="text-xs font-semibold text-foreground">
                          {formatCurrency(amount)}
                        </span>
                      </div>
                      <div className="h-1.5 bg-secondary rounded-full overflow-hidden">
                        <div
                          className="h-full bg-blue-500 rounded-full transition-all"
                          style={{ width: `${pct}%` }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Cashback pending */}
          {pendingCashback.length > 0 && (
            <div className="stat-card">
              <div className="flex items-center justify-between mb-3">
                <h2 className="section-heading">Cashback Pending</h2>
                <Link
                  href="/cashback"
                  className="text-xs text-blue-600 hover:text-blue-500"
                >
                  View all
                </Link>
              </div>
              <div className="space-y-2">
                {pendingCashback.slice(0, 3).map((cb) => (
                  <div
                    key={cb.id}
                    className="flex items-center justify-between py-2 border-b border-border last:border-0"
                  >
                    <div>
                      <p className="text-xs font-medium text-foreground">
                        {cb.card.nickname}
                      </p>
                      <p className="text-xs text-muted-foreground truncate max-w-[120px]">
                        {cb.transaction.title}
                      </p>
                    </div>
                    <span className="text-sm font-bold text-amber-600">
                      {formatCurrency(Number(cb.expectedAmount))}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Money owed summary */}
          {pendingBorrowed.length > 0 && (
            <div className="stat-card">
              <div className="flex items-center justify-between mb-3">
                <h2 className="section-heading">Money Owed</h2>
                <Link
                  href="/borrowed"
                  className="text-xs text-blue-600 hover:text-blue-500"
                >
                  View all
                </Link>
              </div>
              <div className="space-y-2">
                {pendingBorrowed.slice(0, 3).map((b) => {
                  const remaining =
                    Number(b.amountOwed) - Number(b.amountReceived);
                  const overdue = b.dueDate && getDaysUntil(b.dueDate) < 0;
                  return (
                    <div
                      key={b.id}
                      className="flex items-center justify-between py-2 border-b border-border last:border-0"
                    >
                      <div>
                        <p className="text-xs font-medium text-foreground">
                          {b.personName}
                        </p>
                        <span
                          className={cn(
                            "text-xs",
                            overdue ? "text-rose-500" : "text-muted-foreground",
                          )}
                        >
                          {overdue
                            ? "Overdue"
                            : b.paymentStatus === "PARTIALLY_PAID"
                              ? "Partial"
                              : "Pending"}
                        </span>
                      </div>
                      <span className="text-sm font-bold text-violet-600">
                        {formatCurrency(remaining)}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function StatCard({
  label,
  value,
  icon,
  color,
  sub,
}: {
  label: string;
  value: string;
  icon: React.ReactNode;
  color: "blue" | "emerald" | "rose" | "amber" | "violet";
  sub: string;
}) {
  const colors = {
    blue: "bg-blue-50 text-blue-600",
    emerald: "bg-emerald-50 text-emerald-600",
    rose: "bg-rose-50 text-rose-600",
    amber: "bg-amber-50 text-amber-700",
    violet: "bg-violet-50 text-violet-600",
  };
  return (
    <div className="stat-card">
      <div
        className={cn(
          "w-8 h-8 rounded-lg flex items-center justify-center mb-3",
          colors[color],
        )}
      >
        {icon}
      </div>
      <p className="text-xl font-bold text-foreground tracking-tight">
        {value}
      </p>
      <p className="text-xs text-muted-foreground mt-0.5">{label}</p>
      <p className="text-xs text-muted-foreground mt-1">{sub}</p>
    </div>
  );
}
