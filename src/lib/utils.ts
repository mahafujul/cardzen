import { clsx, type ClassValue } from 'clsx'
import { twMerge } from 'tailwind-merge'
import { format, addDays, addMonths, startOfMonth, endOfMonth, isAfter, isBefore } from 'date-fns'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function formatCurrency(amount: number | string): string {
  const num = typeof amount === 'string' ? parseFloat(amount) : amount
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 0,
  }).format(num)
}

export function formatDate(date: Date | string): string {
  const d = typeof date === 'string' ? new Date(date) : date
  return format(d, 'dd MMM yyyy')
}

export function formatDateShort(date: Date | string): string {
  const d = typeof date === 'string' ? new Date(date) : date
  return format(d, 'dd MMM')
}

export function getDaysUntil(date: Date | string): number {
  const d = typeof date === 'string' ? new Date(date) : date
  const now = new Date()
  const diff = d.getTime() - now.getTime()
  return Math.ceil(diff / (1000 * 60 * 60 * 24))
}

export function getBillingCycleDates(billingDate: number, dueDateOffset: number) {
  const now = new Date()
  const currentMonth = now.getMonth()
  const currentYear = now.getFullYear()
  const currentDay = now.getDate()

  let cycleStart: Date
  let cycleEnd: Date
  let dueDate: Date

  if (currentDay > billingDate) {
    // We're past the billing date, so current cycle started this month
    cycleStart = new Date(currentYear, currentMonth, billingDate + 1)
    cycleEnd = new Date(currentYear, currentMonth + 1, billingDate)
    dueDate = addDays(cycleEnd, dueDateOffset)
  } else {
    // We're before the billing date, so current cycle started last month
    cycleStart = new Date(currentYear, currentMonth - 1, billingDate + 1)
    cycleEnd = new Date(currentYear, currentMonth, billingDate)
    dueDate = addDays(cycleEnd, dueDateOffset)
  }

  return { cycleStart, cycleEnd, dueDate }
}

export function getQuarterDates(quarterStartMonth: number): { start: Date; end: Date } {
  const now = new Date()
  const year = now.getFullYear()
  
  // quarterStartMonth is 1-based (1=Jan, 4=Apr, 7=Jul, 10=Oct)
  const quarters = [quarterStartMonth - 1, quarterStartMonth + 2, quarterStartMonth + 5, quarterStartMonth + 8]
    .map(m => m % 12)
  
  const currentMonth = now.getMonth()
  let startMonth = quarters[0]
  
  for (let i = quarters.length - 1; i >= 0; i--) {
    if (currentMonth >= quarters[i]) {
      startMonth = quarters[i]
      break
    }
  }
  
  const start = new Date(year, startMonth, 1)
  const end = endOfMonth(new Date(year, startMonth + 2, 1))
  
  return { start, end }
}

export function getAnnualSpendStart(feeRenewalMonth: number): Date {
  const now = new Date()
  const year = now.getFullYear()
  const currentMonth = now.getMonth() + 1

  if (currentMonth >= feeRenewalMonth) {
    return new Date(year, feeRenewalMonth - 1, 1)
  } else {
    return new Date(year - 1, feeRenewalMonth - 1, 1)
  }
}

export function percentOf(value: number, total: number): number {
  if (total === 0) return 0
  return Math.min(100, Math.round((value / total) * 100))
}

export function truncate(str: string, length: number): string {
  if (str.length <= length) return str
  return str.slice(0, length) + '…'
}

export const CATEGORIES = [
  { value: 'FOOD', label: 'Food & Dining', icon: '🍽️' },
  { value: 'SHOPPING', label: 'Shopping', icon: '🛍️' },
  { value: 'TRAVEL', label: 'Travel', icon: '✈️' },
  { value: 'UTILITY', label: 'Utility', icon: '⚡' },
  { value: 'BILLS', label: 'Bills', icon: '📋' },
  { value: 'SUBSCRIPTION', label: 'Subscription', icon: '🔄' },
  { value: 'MEDICAL', label: 'Medical', icon: '🏥' },
  { value: 'FUEL', label: 'Fuel', icon: '⛽' },
  { value: 'OTHERS', label: 'Others', icon: '📦' },
] as const

export const PLATFORM_SOURCES = [
  'Amazon', 'Flipkart', 'Swiggy', 'Zomato', 'Myntra', 'Uber', 'Others'
] as const

export const CARD_TYPES = [
  { value: 'VISA', label: 'Visa' },
  { value: 'MASTERCARD', label: 'MasterCard' },
  { value: 'RUPAY', label: 'RuPay' },
  { value: 'AMEX', label: 'Amex' },
  { value: 'DINERS', label: 'Diners' },
  { value: 'OTHER', label: 'Other' },
] as const

export const PERSON_TYPES = [
  { value: 'FRIEND', label: 'Friend' },
  { value: 'FAMILY', label: 'Family' },
  { value: 'RELATIVE', label: 'Relative' },
  { value: 'COLLEAGUE', label: 'Colleague' },
  { value: 'OTHER', label: 'Other' },
] as const
