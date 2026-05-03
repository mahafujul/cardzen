import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/db'
import { z } from 'zod'

const repaymentSchema = z.object({
  borrowedId: z.string().cuid(),
  amount: z.number().positive(),
  receivedDate: z.string().datetime(),
  notes: z.string().optional().nullable(),
})

export async function GET(req: NextRequest) {
  const session = await auth()
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { searchParams } = new URL(req.url)
  const status = searchParams.get('status')
  const personName = searchParams.get('person')

  const where: any = { userId: session.user.id }
  if (status) where.paymentStatus = status
  if (personName) where.personName = { contains: personName, mode: 'insensitive' }

  const borrowed = await prisma.borrowedExpense.findMany({
    where,
    include: {
      transaction: { include: { card: true } },
      repayments: { orderBy: { receivedDate: 'asc' } },
    },
    orderBy: { createdAt: 'desc' },
  })

  return NextResponse.json(borrowed)
}

export async function POST(req: NextRequest) {
  const session = await auth()
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await req.json()
  const parsed = repaymentSchema.safeParse(body)
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 })

  // Verify ownership
  const borrowed = await prisma.borrowedExpense.findFirst({
    where: { id: parsed.data.borrowedId, userId: session.user.id },
  })
  if (!borrowed) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  const newReceived = Number(borrowed.amountReceived) + parsed.data.amount
  const totalOwed = Number(borrowed.amountOwed)

  if (newReceived > totalOwed) {
    return NextResponse.json({ error: 'Repayment exceeds amount owed' }, { status: 400 })
  }

  const paymentStatus = newReceived >= totalOwed ? 'FULLY_PAID' :
    newReceived > 0 ? 'PARTIALLY_PAID' : 'NOT_PAID'

  const result = await prisma.$transaction(async (p) => {
    const repayment = await p.repaymentRecord.create({
      data: {
        borrowedId: parsed.data.borrowedId,
        amount: parsed.data.amount,
        receivedDate: new Date(parsed.data.receivedDate),
        notes: parsed.data.notes,
      },
    })

    await p.borrowedExpense.update({
      where: { id: parsed.data.borrowedId },
      data: {
        amountReceived: newReceived,
        paymentStatus,
      },
    })

    return repayment
  })

  return NextResponse.json(result, { status: 201 })
}
