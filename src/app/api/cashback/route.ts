import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/db'
import { z } from 'zod'

const updateSchema = z.object({
  id: z.string().cuid(),
  status: z.enum(['PENDING', 'CREDITED', 'MISSED']),
  creditedAmount: z.number().positive().optional().nullable(),
  creditedDate: z.string().datetime().optional().nullable(),
})

export async function GET(req: NextRequest) {
  const session = await auth()
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { searchParams } = new URL(req.url)
  const cardId = searchParams.get('cardId')
  const status = searchParams.get('status')

  const where: any = { card: { userId: session.user.id } }
  if (cardId) where.cardId = cardId
  if (status) where.status = status

  const cashback = await prisma.cashbackRecord.findMany({
    where,
    include: {
      card: { select: { nickname: true, bankName: true } },
      transaction: { select: { title: true, amount: true, date: true } },
    },
    orderBy: { createdAt: 'desc' },
  })

  return NextResponse.json(cashback)
}

export async function PATCH(req: NextRequest) {
  const session = await auth()
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await req.json()
  const parsed = updateSchema.safeParse(body)
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 })

  // Verify ownership via card
  const record = await prisma.cashbackRecord.findFirst({
    where: { id: parsed.data.id, card: { userId: session.user.id } },
  })
  if (!record) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  const updated = await prisma.cashbackRecord.update({
    where: { id: parsed.data.id },
    data: {
      status: parsed.data.status,
      creditedAmount: parsed.data.creditedAmount,
      creditedDate: parsed.data.creditedDate ? new Date(parsed.data.creditedDate) : null,
    },
  })

  return NextResponse.json(updated)
}
