import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import Link from "next/link";
import { Plus, CreditCard } from "lucide-react";
import { formatCurrency, getBillingCycleDates, percentOf } from "@/lib/utils";
import { cn } from "@/lib/utils";
import CardActions from "@/components/cards/CardActions";

const CARD_GRADIENTS = [
  "from-blue-600 to-blue-500",
  "from-violet-600 to-violet-500",
  "from-emerald-600 to-emerald-500",
  "from-rose-600 to-rose-500",
  "from-amber-600 to-amber-500",
  "from-slate-700 to-slate-600",
];

export default async function CardsPage() {
  const session = await auth();
  const userId = session!.user.id;
  const now = new Date();

  const cards = await prisma.creditCard.findMany({
    where: { userId },
    include: {
      transactions: {
        select: { amount: true, date: true },
      },
      billingCycles: {
        where: { paymentStatus: { not: "PAID" } },
        orderBy: { dueDate: "asc" },
        take: 1,
      },
      cashbackRecords: {
        where: { status: "PENDING" },
        select: { expectedAmount: true },
      },
    },
    orderBy: { createdAt: "asc" },
  });

  return (
    <div className="space-y-6 pb-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground tracking-tight">
            My Cards
          </h1>
          <p className="text-muted-foreground text-sm mt-0.5">
            {cards.length} card{cards.length !== 1 ? "s" : ""} added
          </p>
        </div>
        <Link
          href="/cards/new"
          className="flex items-center gap-2 bg-blue-600 hover:bg-blue-500 text-white px-4 py-2 rounded-xl text-sm font-semibold transition-colors"
        >
          <Plus className="w-4 h-4" />
          Add Card
        </Link>
      </div>

      {cards.length === 0 ? (
        <div className="text-center py-20">
          <div className="w-14 h-14 bg-secondary rounded-2xl flex items-center justify-center mx-auto mb-4">
            <CreditCard className="w-6 h-6 text-muted-foreground" />
          </div>
          <h3 className="font-semibold text-foreground mb-1">No cards yet</h3>
          <p className="text-sm text-muted-foreground mb-4">
            Add your first credit card to get started
          </p>
          <Link
            href="/cards/new"
            className="text-blue-600 font-semibold hover:text-blue-500 text-sm"
          >
            Add your first card →
          </Link>
        </div>
      ) : (
        <div className="grid sm:grid-cols-2 xl:grid-cols-3 gap-5">
          {cards.map((card, i) => {
            const { cycleStart, cycleEnd } = getBillingCycleDates(
              card.billingDate,
              card.dueDate,
            );
            const thisCycleSpend = card.transactions
              .filter(
                (t) =>
                  new Date(t.date) >= cycleStart &&
                  new Date(t.date) <= cycleEnd,
              )
              .reduce((sum, t) => sum + Number(t.amount), 0);

            const pendingPayment = card.billingCycles[0]
              ? Number(card.billingCycles[0].totalSpend) -
                Number(card.billingCycles[0].paidAmount)
              : 0;

            const cashbackPending = card.cashbackRecords.reduce(
              (sum, c) => sum + Number(c.expectedAmount),
              0,
            );

            const utilization = percentOf(
              thisCycleSpend,
              Number(card.creditLimit),
            );

            return (
              <div
                key={card.id}
                className="bg-white rounded-2xl border border-border shadow-sm overflow-hidden hover:shadow-md transition-shadow"
              >
                {/* Card visual */}
                <div
                  className={cn(
                    "bg-gradient-to-br p-5 relative",
                    CARD_GRADIENTS[i % CARD_GRADIENTS.length],
                  )}
                >
                  <div className="flex items-start justify-between">
                    <div>
                      <p className="text-white/70 text-xs font-medium">
                        {card.bankName}
                      </p>
                      <p className="text-white text-lg font-bold mt-0.5">
                        {card.nickname}
                      </p>
                    </div>
                    <div className="text-white/70 text-xs text-right">
                      <p>•••• {card.lastFourDigits}</p>
                      <p className="mt-0.5">{card.cardType}</p>
                    </div>
                  </div>
                  <div className="mt-4 flex items-end justify-between">
                    <div>
                      <p className="text-white/60 text-xs">Credit Limit</p>
                      <p className="text-white font-semibold">
                        {formatCurrency(Number(card.creditLimit))}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-white/60 text-xs">Billing Date</p>
                      <p className="text-white font-semibold">
                        {card.billingDate}th
                      </p>
                    </div>
                  </div>
                  {card.cardStatus === "INACTIVE" && (
                    <div className="absolute top-3 right-3 px-2 py-0.5 bg-black/30 rounded-full text-white text-xs">
                      Inactive
                    </div>
                  )}
                </div>

                {/* Stats */}
                <div className="p-4 space-y-3">
                  <div className="grid grid-cols-2 gap-3">
                    <div className="bg-secondary/50 rounded-xl p-3">
                      <p className="text-xs text-muted-foreground">
                        This Cycle
                      </p>
                      <p className="font-bold text-foreground text-sm mt-0.5">
                        {formatCurrency(thisCycleSpend)}
                      </p>
                    </div>
                    <div className="bg-secondary/50 rounded-xl p-3">
                      <p className="text-xs text-muted-foreground">To Pay</p>
                      <p
                        className={cn(
                          "font-bold text-sm mt-0.5",
                          pendingPayment > 0
                            ? "text-rose-600"
                            : "text-emerald-600",
                        )}
                      >
                        {formatCurrency(pendingPayment)}
                      </p>
                    </div>
                  </div>

                  {/* Utilization bar */}
                  <div>
                    <div className="flex justify-between text-xs text-muted-foreground mb-1">
                      <span>Cycle Utilization</span>
                      <span>{utilization}%</span>
                    </div>
                    <div className="h-1.5 bg-secondary rounded-full overflow-hidden">
                      <div
                        className={cn(
                          "h-full rounded-full transition-all",
                          utilization > 80
                            ? "bg-rose-500"
                            : utilization > 50
                              ? "bg-amber-500"
                              : "bg-blue-500",
                        )}
                        style={{ width: `${utilization}%` }}
                      />
                    </div>
                  </div>

                  {cashbackPending > 0 && (
                    <div className="flex items-center justify-between py-1.5 px-3 bg-amber-50 rounded-lg">
                      <span className="text-xs text-amber-700">
                        Cashback pending
                      </span>
                      <span className="text-xs font-bold text-amber-700">
                        {formatCurrency(cashbackPending)}
                      </span>
                    </div>
                  )}

                  {/* Fee badge */}
                  <div className="flex items-center gap-2">
                    <span
                      className={cn(
                        "text-xs px-2 py-0.5 rounded-full font-medium",
                        card.feeType === "LIFETIME_FREE"
                          ? "bg-emerald-100 text-emerald-700"
                          : "bg-secondary text-muted-foreground",
                      )}
                    >
                      {card.feeType === "LIFETIME_FREE"
                        ? "✓ Lifetime Free"
                        : card.feeType === "ANNUAL_FEE"
                          ? `₹${card.annualFeeAmount}/yr`
                          : "Joining + Annual Fee"}
                    </span>
                    {card.cashbackType !== "NONE" && (
                      <span className="text-xs px-2 py-0.5 rounded-full font-medium bg-blue-100 text-blue-700">
                        {card.cashbackPercent?.toNumber() ?? 0}% cashback
                      </span>
                    )}
                  </div>

                  <div className="flex gap-2 pt-1">
                    <Link
                      href={`/cards/${card.id}`}
                      className="flex-1 text-center text-xs font-semibold text-blue-600 hover:text-blue-500 py-2 rounded-lg hover:bg-blue-50 transition-colors"
                    >
                      View Details
                    </Link>
                    <Link
                      href={`/cards/${card.id}/edit`}
                      className="flex-1 text-center text-xs font-semibold text-muted-foreground hover:text-foreground py-2 rounded-lg hover:bg-secondary transition-colors"
                    >
                      Edit
                    </Link>
                    <CardActions cardId={card.id} cardName={card.nickname} />
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
