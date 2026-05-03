import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { notFound } from "next/navigation";
import {
  formatCurrency,
  formatDate,
  getBillingCycleDates,
  getDaysUntil,
  percentOf,
} from "@/lib/utils";
import { cn } from "@/lib/utils";
import Link from "next/link";
import { ArrowLeft, Edit } from "lucide-react";
import AddTransactionBtn from "@/components/transactions/AddTransactionBtn";

const CARD_GRADIENTS = [
  "from-blue-600 to-blue-500",
  "from-violet-600 to-violet-500",
  "from-emerald-600 to-emerald-500",
  "from-rose-600 to-rose-500",
  "from-amber-600 to-amber-500",
  "from-slate-700 to-slate-600",
];

export default async function CardDetailPage({
  params,
}: {
  params: { id: string };
}) {
  const session = await auth();

  const card = await prisma.creditCard.findFirst({
    where: { id: params.id, userId: session!.user.id },
    include: {
      transactions: {
        orderBy: { date: "desc" },
        take: 20,
        include: {
          borrowedExpense: true,
          cashbackRecord: true,
        },
      },
      billingCycles: {
        orderBy: { cycleStart: "desc" },
        take: 6,
      },
    },
  });

  if (!card) notFound();

  const allCards = await prisma.creditCard.findMany({
    where: { userId: session!.user.id, cardStatus: "ACTIVE" },
    select: { id: true, nickname: true, bankName: true },
  });

  const { cycleStart, cycleEnd, dueDate } = getBillingCycleDates(
    card.billingDate,
    card.dueDate,
  );
  const cycleTransactions = card.transactions.filter(
    (t) => new Date(t.date) >= cycleStart && new Date(t.date) <= cycleEnd,
  );
  const thisCycleSpend = cycleTransactions.reduce(
    (sum, t) => sum + Number(t.amount),
    0,
  );
  const daysUntilDue = getDaysUntil(dueDate);

  const allTimeSpend = card.transactions.reduce(
    (sum, t) => sum + Number(t.amount),
    0,
  );

  const CATEGORY_ICONS: Record<string, string> = {
    FOOD: "🍽️",
    SHOPPING: "🛍️",
    TRAVEL: "✈️",
    UTILITY: "⚡",
    BILLS: "📋",
    SUBSCRIPTION: "🔄",
    MEDICAL: "🏥",
    FUEL: "⛽",
    OTHERS: "📦",
  };

  const cardIndex =
    allCards.findIndex((c) => c.id === card.id) % CARD_GRADIENTS.length;

  return (
    <div className="space-y-6 pb-8 max-w-4xl">
      <div className="flex items-center gap-3">
        <Link
          href="/cards"
          className="p-2 rounded-xl hover:bg-secondary transition-colors text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="w-4 h-4" />
        </Link>
        <div className="flex-1">
          <h1 className="text-2xl font-bold text-foreground">
            {card.nickname}
          </h1>
          <p className="text-muted-foreground text-sm">
            {card.bankName} · •••• {card.lastFourDigits}
          </p>
        </div>
        <div className="flex gap-2">
          <AddTransactionBtn cards={allCards} defaultCardId={card.id} />
          <Link
            href={`/cards/${card.id}/edit`}
            className="flex items-center gap-2 px-4 py-2 border border-border rounded-xl text-sm font-medium hover:bg-secondary transition-colors"
          >
            <Edit className="w-4 h-4" />
            Edit
          </Link>
        </div>
      </div>

      {/* Card visual */}
      <div
        className={cn(
          "bg-gradient-to-br rounded-2xl p-6 text-white",
          CARD_GRADIENTS[cardIndex],
        )}
      >
        <div className="flex justify-between items-start mb-6">
          <div>
            <p className="opacity-70 text-sm">{card.bankName}</p>
            <p className="text-2xl font-bold mt-1">{card.nickname}</p>
          </div>
          <div className="text-right">
            <p className="opacity-70 text-sm">•••• {card.lastFourDigits}</p>
            <p className="opacity-60 text-sm mt-0.5">{card.cardType}</p>
          </div>
        </div>
        <div className="grid grid-cols-3 gap-4">
          <div>
            <p className="opacity-60 text-xs">Credit Limit</p>
            <p className="font-bold">{formatCurrency(card.creditLimit)}</p>
          </div>
          <div>
            <p className="opacity-60 text-xs">Billing Date</p>
            <p className="font-bold">{card.billingDate}th</p>
          </div>
          <div>
            <p className="opacity-60 text-xs">Due In</p>
            <p className="font-bold">{daysUntilDue} days</p>
          </div>
        </div>
      </div>

      {/* Current cycle stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div className="stat-card">
          <p className="text-xs text-muted-foreground mb-1">This Cycle</p>
          <p className="text-lg font-bold text-foreground">
            {formatCurrency(thisCycleSpend)}
          </p>
          <p className="text-xs text-muted-foreground">
            {cycleTransactions.length} txns
          </p>
        </div>
        <div className="stat-card">
          <p className="text-xs text-muted-foreground mb-1">Due Date</p>
          <p className="text-lg font-bold text-foreground">
            {formatDate(dueDate)}
          </p>
          <p
            className={cn(
              "text-xs",
              daysUntilDue <= 3
                ? "text-rose-600 font-semibold"
                : "text-muted-foreground",
            )}
          >
            {daysUntilDue}d remaining
          </p>
        </div>
        <div className="stat-card">
          <p className="text-xs text-muted-foreground mb-1">Utilization</p>
          <p className="text-lg font-bold text-foreground">
            {percentOf(thisCycleSpend, Number(card.creditLimit))}%
          </p>
          <p className="text-xs text-muted-foreground">of limit</p>
        </div>
        <div className="stat-card">
          <p className="text-xs text-muted-foreground mb-1">All Time</p>
          <p className="text-lg font-bold text-foreground">
            {formatCurrency(allTimeSpend)}
          </p>
          <p className="text-xs text-muted-foreground">
            {card.transactions.length} transactions
          </p>
        </div>
      </div>

      {/* Recent transactions */}
      <div className="bg-white border border-border rounded-2xl overflow-hidden">
        <div className="px-5 py-4 border-b border-border flex items-center justify-between">
          <h2 className="font-bold text-foreground">Recent Transactions</h2>
          <Link
            href={`/transactions?cardId=${card.id}`}
            className="text-xs text-blue-600 hover:text-blue-500"
          >
            View all
          </Link>
        </div>
        {card.transactions.length === 0 ? (
          <div className="py-10 text-center">
            <p className="text-sm text-muted-foreground">No transactions yet</p>
            <AddTransactionBtn cards={allCards} defaultCardId={card.id} />
          </div>
        ) : (
          <div className="divide-y divide-border">
            {card.transactions.map((tx) => (
              <div
                key={tx.id}
                className="flex items-center justify-between px-5 py-3"
              >
                <div className="flex items-center gap-3">
                  <span className="text-lg">
                    {CATEGORY_ICONS[tx.category] || "📦"}
                  </span>
                  <div>
                    <p className="text-sm font-medium text-foreground">
                      {tx.title}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {formatDate(tx.date)}
                    </p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-sm font-bold">
                    {formatCurrency(tx.amount)}
                  </p>
                  {tx.cashbackRecord && (
                    <p className="text-xs text-amber-600">
                      +{formatCurrency(tx.cashbackRecord.expectedAmount)}
                    </p>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
