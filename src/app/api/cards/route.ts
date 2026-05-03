import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/db'
import { z } from 'zod'

const cardSchema = z.object({
  nickname: z.string().min(1).max(50),
  bankName: z.string().min(1).max(50),
  cardType: z.enum(['VISA', 'MASTERCARD', 'RUPAY', 'AMEX', 'DINERS', 'OTHER']),
  lastFourDigits: z.string().length(4).regex(/^\d{4}$/),
  creditLimit: z.number().positive(),
  billingDate: z.number().min(1).max(28),
  dueDate: z.number().min(1).max(60),
  cashbackType: z.enum(['FLAT', 'CATEGORY_BASED', 'NONE']).default('NONE'),
  cashbackPercent: z.number().min(0).max(100).optional().nullable(),
  cashbackCapType: z.enum(['NO_CAP', 'MONTHLY_CAP', 'QUARTERLY_CAP', 'ANNUAL_CAP']).default('NO_CAP'),
  cashbackCapAmount: z.number().positive().optional().nullable(),
  cashbackCapPeriod: z.enum(['MONTHLY', 'QUARTERLY', 'ANNUALLY']).optional().nullable(),
  quarterStartMonth: z.number().min(1).max(12).optional().nullable(),
  feeType: z.enum(['LIFETIME_FREE', 'ANNUAL_FEE', 'JOINING_AND_ANNUAL_FEE']).default('LIFETIME_FREE'),
  annualFeeAmount: z.number().positive().optional().nullable(),
  joiningFeeAmount: z.number().positive().optional().nullable(),
  annualSpendWaiver: z.number().positive().optional().nullable(),
  feeRenewalMonth: z.number().min(1).max(12).optional().nullable(),
  cardStatus: z.enum(['ACTIVE', 'INACTIVE']).default('ACTIVE'),
})

export async function GET(req: NextRequest) {
  const session = await auth()
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const cards = await prisma.creditCard.findMany({
    where: { userId: session.user.id },
    include: {
      transactions: {
        select: { amount: true, date: true, category: true },
        orderBy: { date: 'desc' },
      },
    },
    orderBy: { createdAt: 'asc' },
  })

  return NextResponse.json(cards)
}

export async function POST(req: NextRequest) {
  const session = await auth()
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const body = await req.json()
  const parsed = cardSchema.safeParse(body)

  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 })
  }

  const card = await prisma.creditCard.create({
    data: {
      ...parsed.data,
      userId: session.user.id,
      creditLimit: parsed.data.creditLimit,
    },
  })

  return NextResponse.json(card, { status: 201 })
}
