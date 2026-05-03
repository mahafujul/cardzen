import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/db'
import { z } from 'zod'

const updateSchema = z.object({
  nickname: z.string().min(1).max(50).optional(),
  bankName: z.string().min(1).max(50).optional(),
  cardType: z.enum(['VISA', 'MASTERCARD', 'RUPAY', 'AMEX', 'DINERS', 'OTHER']).optional(),
  creditLimit: z.number().positive().optional(),
  billingDate: z.number().min(1).max(28).optional(),
  dueDate: z.number().min(1).max(60).optional(),
  cashbackType: z.enum(['FLAT', 'CATEGORY_BASED', 'NONE']).optional(),
  cashbackPercent: z.number().min(0).max(100).optional().nullable(),
  cashbackCapType: z.enum(['NO_CAP', 'MONTHLY_CAP', 'QUARTERLY_CAP', 'ANNUAL_CAP']).optional(),
  cashbackCapAmount: z.number().positive().optional().nullable(),
  cashbackCapPeriod: z.enum(['MONTHLY', 'QUARTERLY', 'ANNUALLY']).optional().nullable(),
  quarterStartMonth: z.number().min(1).max(12).optional().nullable(),
  feeType: z.enum(['LIFETIME_FREE', 'ANNUAL_FEE', 'JOINING_AND_ANNUAL_FEE']).optional(),
  annualFeeAmount: z.number().positive().optional().nullable(),
  joiningFeeAmount: z.number().positive().optional().nullable(),
  annualSpendWaiver: z.number().positive().optional().nullable(),
  feeRenewalMonth: z.number().min(1).max(12).optional().nullable(),
  cardStatus: z.enum(['ACTIVE', 'INACTIVE']).optional(),
})

async function getCardAndVerify(cardId: string, userId: string) {
  return prisma.creditCard.findFirst({
    where: { id: cardId, userId },
  })
}

export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await auth()
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const card = await getCardAndVerify(params.id, session.user.id)
  if (!card) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  const cardWithDetails = await prisma.creditCard.findUnique({
    where: { id: params.id },
    include: {
      transactions: {
        orderBy: { date: 'desc' },
        take: 20,
        include: {
          borrowedExpense: { include: { repayments: true } },
          cashbackRecord: true,
        },
      },
      cashbackRecords: { orderBy: { createdAt: 'desc' }, take: 10 },
      billingCycles: { orderBy: { cycleStart: 'desc' }, take: 6 },
    },
  })

  return NextResponse.json(cardWithDetails)
}

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await auth()
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const card = await getCardAndVerify(params.id, session.user.id)
  if (!card) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  const body = await req.json()
  const parsed = updateSchema.safeParse(body)
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 })

  const updated = await prisma.creditCard.update({
    where: { id: params.id },
    data: parsed.data,
  })

  return NextResponse.json(updated)
}

export async function DELETE(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await auth()
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const card = await getCardAndVerify(params.id, session.user.id)
  if (!card) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  await prisma.creditCard.delete({ where: { id: params.id } })
  return NextResponse.json({ success: true })
}
