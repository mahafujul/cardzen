import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { formatCurrency, formatDate, getDaysUntil } from "@/lib/utils";
import { cn } from "@/lib/utils";
import { Calendar, CheckCircle2, AlertCircle, Clock } from "lucide-react";
import RecordPaymentBtn from "@/components/billing/RecordPaymentBtn";
import { getBillingCycleDates } from "@/lib/utils";

export default async function BillingPage() {
  const session = await auth();
  const userId = session!.user.id;

  const [cycles, cards] = await Promise.all([
    prisma.billingCycle.findMany({
      where: { card: { userId } },
      include: {
        card: {
          select: {
            nickname: true,
            bankName: true,
            billingDate: true,
            dueDate: true,
          },
        },
        transactions: {
          select: {
            id: true,
            title: true,
            amount: true,
            date: true,
            category: true,
          },
          orderBy: { date: "desc" },
          take: 5,
        },
      },
      orderBy: { dueDate: "desc" },
    }),
    prisma.creditCard.findMany({
      where: { userId, cardStatus: "ACTIVE" },
      select: {
        id: true,
        nickname: true,
        bankName: true,
        billingDate: true,
        dueDate: true,
        creditLimit: true,
      },
    }),
  ]);

  // For cards without billing cycles, show current cycle stats
  const cycleCardIds = new Set(cycles.map((c) => c.cardId));

  const unpaid = cycles.filter((c) => c.paymentStatus !== "PAID");
  const paid = cycles.filter((c) => c.paymentStatus === "PAID");
  const totalOutstanding = unpaid.reduce(
    (sum, c) => sum + Number(c.totalSpend) - Number(c.paidAmount),
    0,
  );

  const STATUS_MAP = {
    UNPAID: { label: "Unpaid", cls: "text-rose-700 bg-rose-50" },
    PARTIALLY_PAID: { label: "Partial", cls: "text-amber-700 bg-amber-50" },
    PAID: { label: "Paid", cls: "text-emerald-700 bg-emerald-50" },
  };

  return (
    <div className="space-y-6 pb-8">
      <div>
        <h1 className="text-2xl font-bold text-foreground tracking-tight">
          Billing Cycles
        </h1>
        <p className="text-muted-foreground text-sm mt-0.5">
          Track your billing cycles and payments
        </p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4">
        <div className="stat-card">
          <div className="w-8 h-8 rounded-lg bg-rose-50 text-rose-600 flex items-center justify-center mb-3">
            <AlertCircle className="w-4 h-4" />
          </div>
          <p className="text-xl font-bold">
            {formatCurrency(totalOutstanding)}
          </p>
          <p className="text-xs text-muted-foreground mt-0.5">
            Total Outstanding
          </p>
        </div>
        <div className="stat-card">
          <div className="w-8 h-8 rounded-lg bg-amber-50 text-amber-600 flex items-center justify-center mb-3">
            <Clock className="w-4 h-4" />
          </div>
          <p className="text-xl font-bold">{unpaid.length}</p>
          <p className="text-xs text-muted-foreground mt-0.5">Pending Cycles</p>
        </div>
        <div className="stat-card">
          <div className="w-8 h-8 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center mb-3">
            <CheckCircle2 className="w-4 h-4" />
          </div>
          <p className="text-xl font-bold">{paid.length}</p>
          <p className="text-xs text-muted-foreground mt-0.5">Paid Cycles</p>
        </div>
      </div>

      {/* Current cycle estimates for active cards */}
      {cards.length > 0 && (
        <div>
          <h2 className="section-heading mb-3">Current Billing Cycles</h2>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {cards.map((card) => {
              const {
                cycleStart,
                cycleEnd,
                dueDate: cycleDue,
              } = getBillingCycleDates(card.billingDate, card.dueDate);
              const daysUntilDue = getDaysUntil(cycleDue);
              const urgent = daysUntilDue <= 3;

              return (
                <div
                  key={card.id}
                  className={cn(
                    "bg-white border rounded-2xl p-4",
                    urgent ? "border-rose-200" : "border-border",
                  )}
                >
                  <div className="flex items-center justify-between mb-3">
                    <div>
                      <p className="font-semibold text-sm text-foreground">
                        {card.nickname}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {card.bankName}
                      </p>
                    </div>
                    {urgent && (
                      <AlertCircle className="w-4 h-4 text-rose-500" />
                    )}
                  </div>
                  <div className="space-y-1 text-xs">
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Cycle</span>
                      <span className="font-medium">
                        {formatDate(cycleStart)} – {formatDate(cycleEnd)}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Due Date</span>
                      <span
                        className={cn(
                          "font-semibold",
                          urgent ? "text-rose-600" : "text-foreground",
                        )}
                      >
                        {formatDate(cycleDue)} ({daysUntilDue}d)
                      </span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* All cycles */}
      {cycles.length > 0 ? (
        <div>
          <h2 className="section-heading mb-3">All Cycles</h2>
          <div className="space-y-3">
            {cycles.map((cycle) => {
              const outstanding =
                Number(cycle.totalSpend) - Number(cycle.paidAmount);
              const statusInfo =
                STATUS_MAP[cycle.paymentStatus as keyof typeof STATUS_MAP];
              const daysUntilDue = getDaysUntil(cycle.dueDate);
              const isUpcoming =
                daysUntilDue >= 0 && cycle.paymentStatus !== "PAID";

              return (
                <div
                  key={cycle.id}
                  className="bg-white border border-border rounded-2xl overflow-hidden"
                >
                  <div className="flex items-center justify-between p-4">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl bg-blue-50 flex items-center justify-center">
                        <Calendar className="w-5 h-5 text-blue-600" />
                      </div>
                      <div>
                        <p className="font-semibold text-foreground">
                          {cycle.card.nickname}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {formatDate(cycle.cycleStart)} –{" "}
                          {formatDate(cycle.cycleEnd)}
                        </p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-lg font-bold text-foreground">
                        {formatCurrency(Number(cycle.totalSpend))}
                      </p>
                      {outstanding > 0 && (
                        <p className="text-xs text-rose-600 font-medium">
                          {formatCurrency(outstanding)} pending
                        </p>
                      )}
                    </div>
                  </div>

                  <div className="px-4 pb-4 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <span
                        className={cn(
                          "text-xs font-semibold px-2 py-0.5 rounded-full",
                          statusInfo.cls,
                        )}
                      >
                        {statusInfo.label}
                      </span>
                      <span
                        className={cn(
                          "text-xs",
                          isUpcoming && daysUntilDue <= 3
                            ? "text-rose-600 font-semibold"
                            : "text-muted-foreground",
                        )}
                      >
                        Due {formatDate(cycle.dueDate)}
                        {isUpcoming && ` (${daysUntilDue}d)`}
                      </span>
                      {cycle.paidAmount && Number(cycle.paidAmount) > 0 && (
                        <span className="text-xs text-emerald-600">
                          Paid: {formatCurrency(Number(cycle.paidAmount))}
                        </span>
                      )}
                    </div>
                    {cycle.paymentStatus !== "PAID" && outstanding > 0 && (
                      <RecordPaymentBtn
                        cycleId={cycle.id}
                        cardName={cycle.card.nickname}
                        outstanding={outstanding}
                      />
                    )}
                  </div>

                  {/* Recent transactions preview */}
                  {cycle.transactions.length > 0 && (
                    <div className="border-t border-border px-4 py-3">
                      <p className="text-xs text-muted-foreground mb-2">
                        {cycle.transactions.length} transaction
                        {cycle.transactions.length !== 1 ? "s" : ""} this cycle
                      </p>
                      <div className="space-y-1">
                        {cycle.transactions.slice(0, 3).map((tx) => (
                          <div
                            key={tx.id}
                            className="flex justify-between text-xs"
                          >
                            <span className="text-foreground">{tx.title}</span>
                            <span className="text-muted-foreground">
                              {formatCurrency(Number(tx.amount))}
                            </span>
                          </div>
                        ))}
                        {cycle.transactions.length > 3 && (
                          <p className="text-xs text-muted-foreground">
                            + {cycle.transactions.length - 3} more
                          </p>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      ) : (
        <div className="text-center py-20">
          <Calendar className="w-12 h-12 text-muted-foreground mx-auto mb-3" />
          <h3 className="font-semibold mb-1">No billing cycles yet</h3>
          <p className="text-sm text-muted-foreground">
            Billing cycles are created automatically when you add transactions
          </p>
        </div>
      )}
    </div>
  );
}
