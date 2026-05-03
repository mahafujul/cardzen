import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import Link from "next/link";
import { ArrowLeftRight } from "lucide-react";
import { formatCurrency, formatDate } from "@/lib/utils";
import { cn } from "@/lib/utils";
import TransactionFilters from "@/components/transactions/TransactionFilters";
import AddTransactionBtn from "@/components/transactions/AddTransactionBtn";
import ExportCSVBtn from "@/components/transactions/ExportCSVBtn";

interface PageProps {
  searchParams: {
    cardId?: string;
    category?: string;
    search?: string;
    page?: string;
  };
}

export default async function TransactionsPage({ searchParams }: PageProps) {
  const session = await auth();
  const userId = session!.user.id;
  const page = parseInt(searchParams.page || "1");
  const limit = 25;

  const where: any = { userId };
  if (searchParams.cardId) where.cardId = searchParams.cardId;
  if (searchParams.category) where.category = searchParams.category;
  if (searchParams.search) {
    where.OR = [
      { title: { contains: searchParams.search, mode: "insensitive" } },
      { merchantName: { contains: searchParams.search, mode: "insensitive" } },
    ];
  }

  const [transactions, total, cards] = await Promise.all([
    prisma.transaction.findMany({
      where,
      include: {
        card: true,
        borrowedExpense: { include: { repayments: true } },
        cashbackRecord: true,
      },
      orderBy: { date: "desc" },
      skip: (page - 1) * limit,
      take: limit,
    }),
    prisma.transaction.count({ where }),
    prisma.creditCard.findMany({
      where: { userId, cardStatus: "ACTIVE" },
      select: { id: true, nickname: true, bankName: true },
    }),
  ]);

  const totalPages = Math.ceil(total / limit);

  const CATEGORY_LABELS: Record<string, { label: string; icon: string }> = {
    FOOD: { label: "Food", icon: "🍽️" },
    SHOPPING: { label: "Shopping", icon: "🛍️" },
    TRAVEL: { label: "Travel", icon: "✈️" },
    UTILITY: { label: "Utility", icon: "⚡" },
    BILLS: { label: "Bills", icon: "📋" },
    SUBSCRIPTION: { label: "Subscription", icon: "🔄" },
    MEDICAL: { label: "Medical", icon: "🏥" },
    FUEL: { label: "Fuel", icon: "⛽" },
    OTHERS: { label: "Others", icon: "📦" },
  };

  return (
    <div className="space-y-6 pb-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground tracking-tight">
            Transactions
          </h1>
          <p className="text-muted-foreground text-sm mt-0.5">
            {total} total transactions
          </p>
        </div>
        <div className="flex items-center gap-2">
          <ExportCSVBtn cardId={searchParams.cardId} />
          <AddTransactionBtn cards={cards} />
        </div>
      </div>

      <TransactionFilters cards={cards} searchParams={searchParams} />

      {transactions.length === 0 ? (
        <div className="text-center py-20">
          <div className="w-14 h-14 bg-secondary rounded-2xl flex items-center justify-center mx-auto mb-4">
            <ArrowLeftRight className="w-6 h-6 text-muted-foreground" />
          </div>
          <h3 className="font-semibold text-foreground mb-1">
            No transactions found
          </h3>
          <p className="text-sm text-muted-foreground">
            Try adjusting your filters or add a new transaction
          </p>
        </div>
      ) : (
        <div className="bg-white rounded-2xl border border-border overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-border bg-secondary/30">
                  <th className="text-left text-xs font-semibold text-muted-foreground px-5 py-3">
                    Transaction
                  </th>
                  <th className="text-left text-xs font-semibold text-muted-foreground px-3 py-3 hidden sm:table-cell">
                    Card
                  </th>
                  <th className="text-left text-xs font-semibold text-muted-foreground px-3 py-3 hidden md:table-cell">
                    Category
                  </th>
                  <th className="text-left text-xs font-semibold text-muted-foreground px-3 py-3 hidden lg:table-cell">
                    Date
                  </th>
                  <th className="text-right text-xs font-semibold text-muted-foreground px-5 py-3">
                    Amount
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {transactions.map((tx) => {
                  const cat = CATEGORY_LABELS[tx.category];
                  return (
                    <tr
                      key={tx.id}
                      className="hover:bg-secondary/20 transition-colors"
                    >
                      <td className="px-5 py-3.5">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-lg bg-secondary flex items-center justify-center text-base flex-shrink-0">
                            {cat?.icon || "📦"}
                          </div>
                          <div>
                            <p className="text-sm font-semibold text-foreground">
                              {tx.title}
                            </p>
                            {tx.merchantName && (
                              <p className="text-xs text-muted-foreground">
                                {tx.merchantName}
                              </p>
                            )}
                            <div className="flex items-center gap-1.5 mt-0.5">
                              {tx.borrowedExpense && (
                                <span className="badge-neutral text-xs">
                                  👤 {tx.borrowedExpense.personName}
                                </span>
                              )}
                              {tx.cashbackRecord && (
                                <span
                                  className={cn(
                                    "text-xs font-medium",
                                    tx.cashbackRecord.status === "CREDITED"
                                      ? "text-emerald-600"
                                      : tx.cashbackRecord.status === "PENDING"
                                        ? "text-amber-600"
                                        : "text-muted-foreground",
                                  )}
                                >
                                  +
                                  {formatCurrency(
                                    Number(tx.cashbackRecord.expectedAmount),
                                  )}{" "}
                                  cashback
                                </span>
                              )}
                            </div>
                          </div>
                        </div>
                      </td>
                      <td className="px-3 py-3.5 hidden sm:table-cell">
                        <p className="text-xs font-medium text-foreground">
                          {tx.card.nickname}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {tx.card.bankName}
                        </p>
                      </td>
                      <td className="px-3 py-3.5 hidden md:table-cell">
                        <span className="text-xs px-2 py-1 bg-secondary rounded-lg font-medium">
                          {cat?.label || tx.category}
                        </span>
                      </td>
                      <td className="px-3 py-3.5 text-sm text-muted-foreground hidden lg:table-cell">
                        {formatDate(tx.date)}
                      </td>
                      <td className="px-5 py-3.5 text-right">
                        <p className="text-sm font-bold text-foreground">
                          {formatCurrency(Number(tx.amount))}
                        </p>
                        {tx.platformType === "ONLINE" && tx.platformSource && (
                          <p className="text-xs text-muted-foreground">
                            {tx.platformSource}
                          </p>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between px-5 py-3 border-t border-border">
              <p className="text-sm text-muted-foreground">
                Page {page} of {totalPages} · {total} results
              </p>
              <div className="flex gap-2">
                {page > 1 && (
                  <Link
                    href={`?${new URLSearchParams({ ...searchParams, page: String(page - 1) })}`}
                    className="px-3 py-1.5 text-sm border border-border rounded-lg hover:bg-secondary transition-colors"
                  >
                    Previous
                  </Link>
                )}
                {page < totalPages && (
                  <Link
                    href={`?${new URLSearchParams({ ...searchParams, page: String(page + 1) })}`}
                    className="px-3 py-1.5 text-sm border border-border rounded-lg hover:bg-secondary transition-colors"
                  >
                    Next
                  </Link>
                )}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
