'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Loader2, ChevronDown } from 'lucide-react'
import { cn } from '@/lib/utils'

interface CashbackRecord {
  id: string
  status: string
}

const STATUS_OPTIONS = [
  { value: 'PENDING', label: 'Pending', cls: 'text-amber-700 bg-amber-50 border-amber-200' },
  { value: 'CREDITED', label: 'Credited', cls: 'text-emerald-700 bg-emerald-50 border-emerald-200' },
  { value: 'MISSED', label: 'Missed', cls: 'text-rose-700 bg-rose-50 border-rose-200' },
]

export default function CashbackStatusBtn({ record }: { record: CashbackRecord }) {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const [creditedAmount, setCreditedAmount] = useState('')

  const current = STATUS_OPTIONS.find(s => s.value === record.status) || STATUS_OPTIONS[0]

  async function updateStatus(status: string) {
    setLoading(true)
    await fetch('/api/cashback', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        id: record.id,
        status,
        creditedAmount: status === 'CREDITED' && creditedAmount ? parseFloat(creditedAmount) : null,
        creditedDate: status === 'CREDITED' ? new Date().toISOString() : null,
      }),
    })
    setOpen(false)
    setLoading(false)
    router.refresh()
  }

  return (
    <div className="relative">
      <button
        onClick={() => setOpen(!open)}
        className={cn(
          'flex items-center gap-1.5 text-xs font-semibold px-2.5 py-1.5 rounded-lg border',
          current.cls
        )}
      >
        {loading ? <Loader2 className="w-3 h-3 animate-spin" /> : null}
        {current.label}
        <ChevronDown className="w-3 h-3" />
      </button>

      {open && (
        <>
          <div className="fixed inset-0 z-10" onClick={() => setOpen(false)} />
          <div className="absolute left-0 top-full mt-1 bg-white border border-border rounded-xl shadow-lg z-20 min-w-[160px] py-2">
            {STATUS_OPTIONS.map((opt) => (
              <div key={opt.value}>
                {opt.value === 'CREDITED' && (
                  <div className="px-3 pb-2">
                    <input
                      type="number"
                      placeholder="Credited amount"
                      value={creditedAmount}
                      onChange={e => setCreditedAmount(e.target.value)}
                      onClick={e => e.stopPropagation()}
                      className="w-full text-xs border border-input rounded-lg px-2 py-1.5 focus:outline-none focus:ring-1 focus:ring-ring"
                    />
                  </div>
                )}
                <button
                  onClick={() => updateStatus(opt.value)}
                  className={cn(
                    'w-full text-left px-3 py-2 text-sm hover:bg-secondary transition-colors',
                    record.status === opt.value && 'font-semibold'
                  )}
                >
                  {opt.label}
                </button>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  )
}
