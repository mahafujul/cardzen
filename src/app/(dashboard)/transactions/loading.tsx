export default function TransactionsLoading() {
  return (
    <div className="space-y-6 pb-8 animate-pulse">
      <div className="flex items-center justify-between">
        <div>
          <div className="h-8 w-40 bg-secondary rounded-lg" />
          <div className="h-4 w-32 bg-secondary rounded-lg mt-2" />
        </div>
        <div className="h-9 w-36 bg-secondary rounded-xl" />
      </div>
      <div className="bg-white border border-border rounded-2xl p-4">
        <div className="flex gap-3">
          <div className="flex-1 h-10 bg-secondary rounded-xl" />
          <div className="w-36 h-10 bg-secondary rounded-xl" />
          <div className="w-36 h-10 bg-secondary rounded-xl" />
        </div>
      </div>
      <div className="bg-white border border-border rounded-2xl overflow-hidden">
        <div className="h-10 bg-secondary/50" />
        {[...Array(8)].map((_, i) => (
          <div key={i} className="flex items-center justify-between px-5 py-4 border-b border-border">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg bg-secondary" />
              <div>
                <div className="h-4 w-36 bg-secondary rounded" />
                <div className="h-3 w-24 bg-secondary rounded mt-1" />
              </div>
            </div>
            <div className="h-5 w-20 bg-secondary rounded" />
          </div>
        ))}
      </div>
    </div>
  )
}
