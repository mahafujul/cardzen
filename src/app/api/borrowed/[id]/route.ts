import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/db'

export async function DELETE(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await auth()
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const borrowed = await prisma.borrowedExpense.findFirst({
    where: { id: params.id, userId: session.user.id },
  })

  if (!borrowed) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  await prisma.borrowedExpense.delete({ where: { id: params.id } })

  return NextResponse.json({ success: true })
}

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await auth()
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const borrowed = await prisma.borrowedExpense.findFirst({
    where: { id: params.id, userId: session.user.id },
  })

  if (!borrowed) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  const body = await req.json()

  const updated = await prisma.borrowedExpense.update({
    where: { id: params.id },
    data: {
      dueDate: body.dueDate ? new Date(body.dueDate) : undefined,
      notes: body.notes,
      personName: body.personName,
    },
  })

  return NextResponse.json(updated)
}
