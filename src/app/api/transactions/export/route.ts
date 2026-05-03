import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/db'
import { format } from 'date-fns'

export async function GET(req: NextRequest) {
  const session = await auth()
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { searchParams } = new URL(req.url)
  const cardId = searchParams.get('cardId')
  const startDate = searchParams.get('startDate')
  const endDate = searchParams.get('endDate')

  const where: any = { userId: session.user.id }
  if (cardId) where.cardId = cardId
  if (startDate || endDate) {
    where.date = {}
    if (startDate) where.date.gte = new Date(startDate)
    if (endDate) where.date.lte = new Date(endDate)
  }

  const transactions = await prisma.transaction.findMany({
    where,
    include: {
      card: { select: { nickname: true, bankName: true, lastFourDigits: true } },
      borrowedExpense: { select: { personName: true, amountOwed: true, amountReceived: true, paymentStatus: true } },
      cashbackRecord: { select: { expectedAmount: true, status: true, creditedAmount: true } },
    },
    orderBy: { date: 'desc' },
  })

  // Build CSV
  const headers = [
    'Date',
    'Title',
    'Amount (₹)',
    'Category',
    'Card',
    'Bank',
    'Last 4',
    'Platform',
    'Platform Source',
    'Merchant',
    'Notes',
    'Borrowed Person',
    'Amount Owed',
    'Amount Received',
    'Repayment Status',
    'Expected Cashback',
    'Cashback Status',
    'Cashback Credited',
  ]

  const rows = transactions.map((tx) => [
    format(new Date(tx.date), 'dd/MM/yyyy HH:mm'),
    tx.title,
    Number(tx.amount).toFixed(2),
    tx.category,
    tx.card.nickname,
    tx.card.bankName,
    tx.card.lastFourDigits,
    tx.platformType,
    tx.platformSource || '',
    tx.merchantName || '',
    tx.notes || '',
    tx.borrowedExpense?.personName || '',
    tx.borrowedExpense ? Number(tx.borrowedExpense.amountOwed).toFixed(2) : '',
    tx.borrowedExpense ? Number(tx.borrowedExpense.amountReceived).toFixed(2) : '',
    tx.borrowedExpense?.paymentStatus || '',
    tx.cashbackRecord ? Number(tx.cashbackRecord.expectedAmount).toFixed(2) : '',
    tx.cashbackRecord?.status || '',
    tx.cashbackRecord?.creditedAmount ? Number(tx.cashbackRecord.creditedAmount).toFixed(2) : '',
  ])

  const csvContent = [
    headers.join(','),
    ...rows.map((row) =>
      row
        .map((cell) => {
          const str = String(cell)
          if (str.includes(',') || str.includes('"') || str.includes('\n')) {
            return `"${str.replace(/"/g, '""')}"`
          }
          return str
        })
        .join(',')
    ),
  ].join('\n')

  const filename = `cardzen-transactions-${format(new Date(), 'yyyy-MM-dd')}.csv`

  return new NextResponse(csvContent, {
    headers: {
      'Content-Type': 'text/csv; charset=utf-8',
      'Content-Disposition': `attachment; filename="${filename}"`,
    },
  })
}
