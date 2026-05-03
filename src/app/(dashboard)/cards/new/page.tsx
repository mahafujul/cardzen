import CardForm from '@/components/cards/CardForm'

export default function NewCardPage() {
  return (
    <div className="max-w-2xl space-y-6 pb-8">
      <div>
        <h1 className="text-2xl font-bold text-foreground tracking-tight">Add New Card</h1>
        <p className="text-muted-foreground text-sm mt-0.5">Fill in your card details to start tracking</p>
      </div>
      <CardForm />
    </div>
  )
}
