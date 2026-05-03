import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/db'
import { z } from 'zod'

const paymentSchema = z.object({
  cycleId: z.string().cuid(),
  paidAmount: z.number().positive(),
  paidDate: z.string().datetime(),
})

export async function GET(req: NextRequest) {
  const session = await auth()
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { searchParams } = new URL(req.url)
  const cardId = searchParams.get('cardId')

  const cycles = await prisma.billingCycle.findMany({
    where: {
      card: { userId: session.user.id },
      ...(cardId ? { cardId } : {}),
    },
    include: {
      card: { select: { nickname: true, bankName: true } },
      transactions: {
        select: { id: true, title: true, amount: true, date: true, category: true },
        orderBy: { date: 'desc' },
      },
    },
    orderBy: { cycleStart: 'desc' },
    take: 24,
  })

  return NextResponse.json(cycles)
}

export async function PATCH(req: NextRequest) {
  const session = await auth()
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await req.json()
  const parsed = paymentSchema.safeParse(body)
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 })

  const cycle = await prisma.billingCycle.findFirst({
    where: { id: parsed.data.cycleId, card: { userId: session.user.id } },
  })
  if (!cycle) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  const totalPaid = Number(cycle.paidAmount) + parsed.data.paidAmount
  const totalSpend = Number(cycle.totalSpend)

  const paymentStatus = totalPaid >= totalSpend ? 'PAID' : totalPaid > 0 ? 'PARTIALLY_PAID' : 'UNPAID'

  const updated = await prisma.billingCycle.update({
    where: { id: parsed.data.cycleId },
    data: {
      paidAmount: totalPaid,
      paidDate: new Date(parsed.data.paidDate),
      paymentStatus,
    },
  })

  return NextResponse.json(updated)
}
