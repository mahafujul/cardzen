import type {
  CreditCard,
  Transaction,
  BorrowedExpense,
  RepaymentRecord,
  CashbackRecord,
  BillingCycle,
  User,
} from '@prisma/client'

export type CardWithStats = CreditCard & {
  totalSpendThisCycle: number
  pendingPayment: number
  cashbackEarned: number
  cashbackPending: number
  annualSpendYTD: number
  cashbackCapUsed: number
  transactions?: Transaction[]
}

export type TransactionWithCard = Transaction & {
  card: CreditCard
  borrowedExpense?: BorrowedExpense & {
    repayments: RepaymentRecord[]
  }
  cashbackRecord?: CashbackRecord
}

export type BorrowedExpenseWithDetails = BorrowedExpense & {
  transaction: Transaction & {
    card: CreditCard
  }
  repayments: RepaymentRecord[]
}

export type DashboardStats = {
  totalOutstanding: number
  totalCashbackPending: number
  totalCashbackCredited: number
  totalBorrowedPending: number
  cardsCount: number
  thisMonthSpend: number
  lastMonthSpend: number
  upcomingDues: Array<{
    card: CreditCard
    dueDate: Date
    amount: number
    daysUntilDue: number
  }>
  cashbackCapAlerts: Array<{
    card: CreditCard
    capAmount: number
    usedAmount: number
    remainingAmount: number
    percentUsed: number
    resetDate: Date
  }>
  annualFeeAlerts: Array<{
    card: CreditCard
    feeAmount: number
    spendToWaive: number
    currentSpend: number
    remainingToWaive: number
    renewalMonth: number
  }>
  categoryBreakdown: Array<{
    category: string
    amount: number
    count: number
  }>
  recentTransactions: TransactionWithCard[]
  borrowedExpenseAlerts: BorrowedExpenseWithDetails[]
}

export type ActionResult<T = void> =
  | { success: true; data: T }
  | { success: false; error: string }

export type PaginationParams = {
  page: number
  limit: number
}

export type FilterParams = {
  cardId?: string
  category?: string
  startDate?: string
  endDate?: string
  search?: string
  platformType?: string
}
