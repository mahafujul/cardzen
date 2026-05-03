export default function CardsLoading() {
  return (
    <div className="space-y-6 pb-8 animate-pulse">
      <div className="flex items-center justify-between">
        <div>
          <div className="h-8 w-32 bg-secondary rounded-lg" />
          <div className="h-4 w-24 bg-secondary rounded-lg mt-2" />
        </div>
        <div className="h-9 w-28 bg-secondary rounded-xl" />
      </div>
      <div className="grid sm:grid-cols-2 xl:grid-cols-3 gap-5">
        {[...Array(3)].map((_, i) => (
          <div key={i} className="bg-white rounded-2xl border border-border overflow-hidden">
            <div className="h-32 bg-secondary" />
            <div className="p-4 space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div className="h-14 bg-secondary rounded-xl" />
                <div className="h-14 bg-secondary rounded-xl" />
              </div>
              <div className="h-2 bg-secondary rounded-full" />
              <div className="h-8 bg-secondary rounded-xl" />
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
