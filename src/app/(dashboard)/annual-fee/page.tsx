import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { formatCurrency, getAnnualSpendStart, percentOf } from "@/lib/utils";
import { cn } from "@/lib/utils";
import { BadgeDollarSign, CheckCircle2, AlertCircle, Info } from "lucide-react";

const MONTHS = [
  "Jan",
  "Feb",
  "Mar",
  "Apr",
  "May",
  "Jun",
  "Jul",
  "Aug",
  "Sep",
  "Oct",
  "Nov",
  "Dec",
];

export default async function AnnualFeePage() {
  const session = await auth();
  const userId = session!.user.id;

  const cards = await prisma.creditCard.findMany({
    where: { userId },
    orderBy: { createdAt: "asc" },
  });

  // Calculate annual spend for each card
  const cardData = await Promise.all(
    cards.map(async (card) => {
      const now = new Date();
      let yearStart: Date;
      let renewalDate: Date | null = null;

      if (card.feeType !== "LIFETIME_FREE" && card.feeRenewalMonth) {
        yearStart = getAnnualSpendStart(card.feeRenewalMonth);
        renewalDate = new Date(yearStart);
        renewalDate.setFullYear(renewalDate.getFullYear() + 1);
      } else {
        yearStart = new Date(now.getFullYear(), 0, 1);
      }

      const agg = await prisma.transaction.aggregate({
        where: { cardId: card.id, date: { gte: yearStart } },
        _sum: { amount: true },
      });

      const annualSpend = Number(agg._sum.amount || 0);
      const waiverTarget = card.annualSpendWaiver
        ? Number(card.annualSpendWaiver)
        : 0;
      const remaining = Math.max(0, waiverTarget - annualSpend);
      const pct = waiverTarget > 0 ? percentOf(annualSpend, waiverTarget) : 100;
      const waiverAchieved = waiverTarget > 0 && annualSpend >= waiverTarget;

      return {
        card,
        annualSpend,
        waiverTarget,
        remaining,
        pct,
        waiverAchieved,
        renewalDate,
        yearStart,
      };
    }),
  );

  const ltfCards = cardData.filter((d) => d.card.feeType === "LIFETIME_FREE");
  const feeCards = cardData.filter((d) => d.card.feeType !== "LIFETIME_FREE");
  const waiverAchieved = feeCards.filter((d) => d.waiverAchieved);
  const waiverPending = feeCards.filter(
    (d) => !d.waiverAchieved && d.waiverTarget > 0,
  );
  const noWaiver = feeCards.filter((d) => d.waiverTarget === 0);

  const potentialSavings = feeCards.reduce(
    (sum, d) =>
      sum + (d.waiverAchieved ? Number(d.card.annualFeeAmount || 0) : 0),
    0,
  );

  return (
    <div className="space-y-6 pb-8">
      <div>
        <h1 className="text-2xl font-bold text-foreground tracking-tight">
          Annual Fees
        </h1>
        <p className="text-muted-foreground text-sm mt-0.5">
          Track annual fee waivers and renewals
        </p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4">
        <div className="stat-card">
          <div className="w-8 h-8 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center mb-3">
            <CheckCircle2 className="w-4 h-4" />
          </div>
          <p className="text-xl font-bold">{waiverAchieved.length}</p>
          <p className="text-xs text-muted-foreground mt-0.5">
            Waiver Achieved
          </p>
        </div>
        <div className="stat-card">
          <div className="w-8 h-8 rounded-lg bg-amber-50 text-amber-600 flex items-center justify-center mb-3">
            <AlertCircle className="w-4 h-4" />
          </div>
          <p className="text-xl font-bold">{waiverPending.length}</p>
          <p className="text-xs text-muted-foreground mt-0.5">Waiver Pending</p>
        </div>
        <div className="stat-card">
          <div className="w-8 h-8 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center mb-3">
            <BadgeDollarSign className="w-4 h-4" />
          </div>
          <p className="text-xl font-bold">
            {formatCurrency(potentialSavings)}
          </p>
          <p className="text-xs text-muted-foreground mt-0.5">Fees Saved</p>
        </div>
      </div>

      {/* Cards with fees */}
      {feeCards.length > 0 && (
        <div>
          <h2 className="section-heading mb-3">Cards with Annual Fee</h2>
          <div className="grid sm:grid-cols-2 gap-4">
            {feeCards.map(
              ({
                card,
                annualSpend,
                waiverTarget,
                remaining,
                pct,
                waiverAchieved,
                renewalDate,
              }) => (
                <div
                  key={card.id}
                  className={cn(
                    "bg-white border rounded-2xl p-5",
                    waiverAchieved
                      ? "border-emerald-200"
                      : remaining > 0 && remaining < 20000
                        ? "border-amber-200"
                        : "border-border",
                  )}
                >
                  <div className="flex items-start justify-between mb-4">
                    <div>
                      <p className="font-bold text-foreground">
                        {card.nickname}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {card.bankName}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-bold text-foreground">
                        {formatCurrency(Number(card.annualFeeAmount) || 0)}/yr
                      </p>
                      {card.joiningFeeAmount && (
                        <p className="text-xs text-muted-foreground">
                          +{formatCurrency(Number(card.joiningFeeAmount))}{" "}
                          joining
                        </p>
                      )}
                    </div>
                  </div>

                  {waiverTarget > 0 ? (
                    <div className="space-y-2">
                      <div className="flex justify-between text-xs text-muted-foreground">
                        <span>Spend for waiver</span>
                        <span>{formatCurrency(waiverTarget)}</span>
                      </div>
                      <div className="h-2 bg-secondary rounded-full overflow-hidden">
                        <div
                          className={cn(
                            "h-full rounded-full transition-all",
                            waiverAchieved
                              ? "bg-emerald-500"
                              : pct >= 80
                                ? "bg-amber-500"
                                : "bg-blue-500",
                          )}
                          style={{ width: `${Math.min(pct, 100)}%` }}
                        />
                      </div>
                      <div className="flex justify-between text-xs">
                        <span className="text-muted-foreground">
                          {formatCurrency(annualSpend)} spent ({pct}%)
                        </span>
                        {waiverAchieved ? (
                          <span className="text-emerald-600 font-bold flex items-center gap-1">
                            <CheckCircle2 className="w-3 h-3" />
                            Waiver achieved!
                          </span>
                        ) : (
                          <span className="text-amber-600 font-semibold">
                            {formatCurrency(remaining)} more needed
                          </span>
                        )}
                      </div>
                    </div>
                  ) : (
                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                      <Info className="w-3.5 h-3.5" />
                      No spend waiver available
                    </div>
                  )}

                  {renewalDate && (
                    <div className="mt-3 pt-3 border-t border-border">
                      <p className="text-xs text-muted-foreground">
                        Renewal:{" "}
                        <span className="font-medium text-foreground">
                          {MONTHS[renewalDate.getMonth()]}{" "}
                          {renewalDate.getFullYear()}
                        </span>
                      </p>
                    </div>
                  )}

                  <div className="mt-2">
                    <span
                      className={cn(
                        "text-xs font-medium px-2 py-0.5 rounded-full",
                        card.feeType === "JOINING_AND_ANNUAL_FEE"
                          ? "bg-secondary text-muted-foreground"
                          : "bg-secondary text-muted-foreground",
                      )}
                    >
                      {card.feeType === "JOINING_AND_ANNUAL_FEE"
                        ? "Joining + Annual"
                        : "Annual Fee"}
                    </span>
                  </div>
                </div>
              ),
            )}
          </div>
        </div>
      )}

      {/* Lifetime free cards */}
      {ltfCards.length > 0 && (
        <div>
          <h2 className="section-heading mb-3">Lifetime Free Cards</h2>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {ltfCards.map(({ card, annualSpend }) => (
              <div
                key={card.id}
                className="bg-white border border-border rounded-2xl p-4 flex items-center justify-between"
              >
                <div>
                  <p className="font-semibold text-sm text-foreground">
                    {card.nickname}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {card.bankName}
                  </p>
                  <span className="text-xs text-emerald-600 font-medium">
                    ✓ Lifetime Free
                  </span>
                </div>
                <div className="text-right">
                  <p className="text-sm font-bold text-foreground">
                    {formatCurrency(annualSpend)}
                  </p>
                  <p className="text-xs text-muted-foreground">this year</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {cards.length === 0 && (
        <div className="text-center py-20">
          <BadgeDollarSign className="w-12 h-12 text-muted-foreground mx-auto mb-3" />
          <h3 className="font-semibold mb-1">No cards yet</h3>
          <p className="text-sm text-muted-foreground">
            Add cards to track annual fees
          </p>
        </div>
      )}
    </div>
  );
}
