import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/db'
import { z } from 'zod'
import { getBillingCycleDates } from '@/lib/utils'

const transactionSchema = z.object({
  cardId: z.string().cuid(),
  title: z.string().min(1).max(200),
  amount: z.number().positive(),
  date: z.string().datetime(),
  merchantName: z.string().max(100).optional().nullable(),
  platformType: z.enum(['ONLINE', 'OFFLINE']).default('OFFLINE'),
  platformSource: z.string().optional().nullable(),
  category: z.enum(['FOOD', 'SHOPPING', 'TRAVEL', 'UTILITY', 'BILLS', 'SUBSCRIPTION', 'MEDICAL', 'FUEL', 'OTHERS']),
  notes: z.string().max(500).optional().nullable(),
  // Borrowed expense
  isBorrowed: z.boolean().default(false),
  borrowedFrom: z.object({
    personName: z.string().min(1),
    personType: z.enum(['FRIEND', 'FAMILY', 'RELATIVE', 'COLLEAGUE', 'OTHER']),
    amountOwed: z.number().positive(),
    dueDate: z.string().datetime().optional().nullable(),
    notes: z.string().optional().nullable(),
  }).optional(),
  // Cashback
  hasCashback: z.boolean().default(false),
  expectedCashback: z.number().positive().optional().nullable(),
})

export async function GET(req: NextRequest) {
  const session = await auth()
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { searchParams } = new URL(req.url)
  const cardId = searchParams.get('cardId')
  const category = searchParams.get('category')
  const startDate = searchParams.get('startDate')
  const endDate = searchParams.get('endDate')
  const search = searchParams.get('search')
  const page = parseInt(searchParams.get('page') || '1')
  const limit = parseInt(searchParams.get('limit') || '20')

  const where: any = { userId: session.user.id }
  if (cardId) where.cardId = cardId
  if (category) where.category = category
  if (startDate || endDate) {
    where.date = {}
    if (startDate) where.date.gte = new Date(startDate)
    if (endDate) where.date.lte = new Date(endDate)
  }
  if (search) {
    where.OR = [
      { title: { contains: search, mode: 'insensitive' } },
      { merchantName: { contains: search, mode: 'insensitive' } },
    ]
  }

  const [transactions, total] = await Promise.all([
    prisma.transaction.findMany({
      where,
      include: {
        card: true,
        borrowedExpense: { include: { repayments: true } },
        cashbackRecord: true,
      },
      orderBy: { date: 'desc' },
      skip: (page - 1) * limit,
      take: limit,
    }),
    prisma.transaction.count({ where }),
  ])

  return NextResponse.json({
    transactions,
    total,
    page,
    totalPages: Math.ceil(total / limit),
  })
}

export async function POST(req: NextRequest) {
  const session = await auth()
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await req.json()
  const parsed = transactionSchema.safeParse(body)
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 })

  // Verify card belongs to user
  const card = await prisma.creditCard.findFirst({
    where: { id: parsed.data.cardId, userId: session.user.id },
  })
  if (!card) return NextResponse.json({ error: 'Card not found' }, { status: 404 })

  // Find or create billing cycle
  const txDate = new Date(parsed.data.date)
  const { cycleStart, cycleEnd, dueDate } = getBillingCycleDates(card.billingDate, card.dueDate)

  let billingCycle = await prisma.billingCycle.findFirst({
    where: {
      cardId: card.id,
      cycleStart: { lte: txDate },
      cycleEnd: { gte: txDate },
    },
  })

  if (!billingCycle) {
    // Determine correct cycle for this transaction date
    const txMonth = txDate.getMonth()
    const txYear = txDate.getFullYear()
    const txDay = txDate.getDate()

    let cStart: Date, cEnd: Date, cDue: Date
    if (txDay > card.billingDate) {
      cStart = new Date(txYear, txMonth, card.billingDate + 1)
      cEnd = new Date(txYear, txMonth + 1, card.billingDate)
    } else {
      cStart = new Date(txYear, txMonth - 1, card.billingDate + 1)
      cEnd = new Date(txYear, txMonth, card.billingDate)
    }
    cDue = new Date(cEnd)
    cDue.setDate(cDue.getDate() + card.dueDate)

    billingCycle = await prisma.billingCycle.create({
      data: {
        cardId: card.id,
        cycleStart: cStart,
        cycleEnd: cEnd,
        dueDate: cDue,
        totalSpend: 0,
      },
    })
  }

  // Create transaction + related records in a transaction
  const result = await prisma.$transaction(async (tx) => {
    const transaction = await tx.transaction.create({
      data: {
        userId: session.user.id,
        cardId: parsed.data.cardId,
        title: parsed.data.title,
        amount: parsed.data.amount,
        date: new Date(parsed.data.date),
        merchantName: parsed.data.merchantName,
        platformType: parsed.data.platformType,
        platformSource: parsed.data.platformSource,
        category: parsed.data.category,
        notes: parsed.data.notes,
        billingCycleId: billingCycle!.id,
      },
    })

    // Update billing cycle total
    await tx.billingCycle.update({
      where: { id: billingCycle!.id },
      data: { totalSpend: { increment: parsed.data.amount } },
    })

    // Create borrowed expense if applicable
    if (parsed.data.isBorrowed && parsed.data.borrowedFrom) {
      await tx.borrowedExpense.create({
        data: {
          userId: session.user.id,
          transactionId: transaction.id,
          personName: parsed.data.borrowedFrom.personName,
          personType: parsed.data.borrowedFrom.personType,
          amountOwed: parsed.data.borrowedFrom.amountOwed,
          dueDate: parsed.data.borrowedFrom.dueDate ? new Date(parsed.data.borrowedFrom.dueDate) : null,
          notes: parsed.data.borrowedFrom.notes,
        },
      })
    }

    // Create cashback record if applicable
    if (parsed.data.hasCashback && parsed.data.expectedCashback) {
      const periodStart = billingCycle!.cycleStart
      const periodEnd = billingCycle!.cycleEnd
      const nextPeriodStart = new Date(periodEnd)
      nextPeriodStart.setDate(nextPeriodStart.getDate() + 1)
      const nextPeriodEnd = new Date(nextPeriodStart)
      nextPeriodEnd.setMonth(nextPeriodEnd.getMonth() + 1)

      await tx.cashbackRecord.create({
        data: {
          cardId: parsed.data.cardId,
          transactionId: transaction.id,
          expectedAmount: parsed.data.expectedCashback,
          periodStart: nextPeriodStart,
          periodEnd: nextPeriodEnd,
        },
      })
    }

    return transaction
  })

  const full = await prisma.transaction.findUnique({
    where: { id: result.id },
    include: {
      card: true,
      borrowedExpense: { include: { repayments: true } },
      cashbackRecord: true,
    },
  })

  return NextResponse.json(full, { status: 201 })
}
