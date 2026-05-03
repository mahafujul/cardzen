export default function DashboardLoading() {
  return (
    <div className="space-y-6 pb-8 animate-pulse">
      <div>
        <div className="h-8 w-40 bg-secondary rounded-lg" />
        <div className="h-4 w-56 bg-secondary rounded-lg mt-2" />
      </div>
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[...Array(4)].map((_, i) => (
          <div key={i} className="stat-card">
            <div className="w-8 h-8 rounded-lg bg-secondary mb-3" />
            <div className="h-7 w-24 bg-secondary rounded-lg" />
            <div className="h-3 w-32 bg-secondary rounded-lg mt-2" />
          </div>
        ))}
      </div>
      <div className="grid lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          <div className="stat-card h-48" />
          <div className="stat-card h-64" />
        </div>
        <div className="space-y-5">
          <div className="stat-card h-40" />
          <div className="stat-card h-40" />
        </div>
      </div>
    </div>
  )
}
