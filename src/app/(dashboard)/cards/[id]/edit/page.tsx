import { auth } from '@/lib/auth'
import { prisma } from '@/lib/db'
import { notFound } from 'next/navigation'
import CardForm from '@/components/cards/CardForm'

export default async function EditCardPage({ params }: { params: { id: string } }) {
  const session = await auth()
  const card = await prisma.creditCard.findFirst({
    where: { id: params.id, userId: session!.user.id },
  })

  if (!card) notFound()

  const defaultValues = {
    ...card,
    creditLimit: Number(card.creditLimit),
    cashbackPercent: card.cashbackPercent ? Number(card.cashbackPercent) : '',
    cashbackCapAmount: card.cashbackCapAmount ? Number(card.cashbackCapAmount) : '',
    annualFeeAmount: card.annualFeeAmount ? Number(card.annualFeeAmount) : '',
    joiningFeeAmount: card.joiningFeeAmount ? Number(card.joiningFeeAmount) : '',
    annualSpendWaiver: card.annualSpendWaiver ? Number(card.annualSpendWaiver) : '',
  }

  return (
    <div className="max-w-2xl space-y-6 pb-8">
      <div>
        <h1 className="text-2xl font-bold text-foreground tracking-tight">Edit {card.nickname}</h1>
        <p className="text-muted-foreground text-sm mt-0.5">Update your card details</p>
      </div>
      <CardForm defaultValues={defaultValues} cardId={card.id} />
    </div>
  )
}
