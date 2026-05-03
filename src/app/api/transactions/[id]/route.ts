import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/db'
import { z } from 'zod'

const updateSchema = z.object({
  title: z.string().min(1).max(200).optional(),
  amount: z.number().positive().optional(),
  date: z.string().datetime().optional(),
  merchantName: z.string().max(100).optional().nullable(),
  platformType: z.enum(['ONLINE', 'OFFLINE']).optional(),
  platformSource: z.string().optional().nullable(),
  category: z.enum(['FOOD', 'SHOPPING', 'TRAVEL', 'UTILITY', 'BILLS', 'SUBSCRIPTION', 'MEDICAL', 'FUEL', 'OTHERS']).optional(),
  notes: z.string().max(500).optional().nullable(),
})

export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await auth()
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const transaction = await prisma.transaction.findFirst({
    where: { id: params.id, userId: session.user.id },
    include: {
      card: true,
      borrowedExpense: { include: { repayments: true } },
      cashbackRecord: true,
    },
  })

  if (!transaction) return NextResponse.json({ error: 'Not found' }, { status: 404 })
  return NextResponse.json(transaction)
}

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await auth()
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const tx = await prisma.transaction.findFirst({
    where: { id: params.id, userId: session.user.id },
  })
  if (!tx) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  const body = await req.json()
  const parsed = updateSchema.safeParse(body)
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 })

  const amountDiff = parsed.data.amount ? parsed.data.amount - Number(tx.amount) : 0

  const updated = await prisma.$transaction(async (prismaClient) => {
    const transaction = await prismaClient.transaction.update({
      where: { id: params.id },
      data: {
        ...parsed.data,
        date: parsed.data.date ? new Date(parsed.data.date) : undefined,
      },
      include: {
        card: true,
        borrowedExpense: { include: { repayments: true } },
        cashbackRecord: true,
      },
    })

    if (amountDiff !== 0 && tx.billingCycleId) {
      await prismaClient.billingCycle.update({
        where: { id: tx.billingCycleId },
        data: { totalSpend: { increment: amountDiff } },
      })
    }

    return transaction
  })

  return NextResponse.json(updated)
}

export async function DELETE(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await auth()
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const tx = await prisma.transaction.findFirst({
    where: { id: params.id, userId: session.user.id },
  })
  if (!tx) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  await prisma.$transaction(async (p) => {
    if (tx.billingCycleId) {
      await p.billingCycle.update({
        where: { id: tx.billingCycleId },
        data: { totalSpend: { decrement: Number(tx.amount) } },
      })
    }
    await p.transaction.delete({ where: { id: params.id } })
  })

  return NextResponse.json({ success: true })
}
