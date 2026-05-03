'use client'

import { useState } from 'react'
import { Trash2, MoreVertical, Loader2 } from 'lucide-react'
import { useRouter } from 'next/navigation'

interface CardActionsProps {
  cardId: string
  cardName: string
}

export default function CardActions({ cardId, cardName }: CardActionsProps) {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [deleting, setDeleting] = useState(false)

  async function handleDelete() {
    if (!confirm(`Delete "${cardName}"? All transactions will be deleted.`)) return
    setDeleting(true)
    await fetch(`/api/cards/${cardId}`, { method: 'DELETE' })
    router.refresh()
  }

  return (
    <div className="relative">
      <button
        onClick={() => setOpen(!open)}
        className="p-2 rounded-lg hover:bg-secondary text-muted-foreground hover:text-foreground transition-colors"
      >
        <MoreVertical className="w-4 h-4" />
      </button>

      {open && (
        <>
          <div className="fixed inset-0 z-10" onClick={() => setOpen(false)} />
          <div className="absolute right-0 top-full mt-1 bg-white border border-border rounded-xl shadow-lg z-20 min-w-[120px] py-1">
            <button
              onClick={handleDelete}
              disabled={deleting}
              className="w-full flex items-center gap-2 px-3 py-2 text-sm text-rose-600 hover:bg-rose-50 transition-colors"
            >
              {deleting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />}
              Delete
            </button>
          </div>
        </>
      )}
    </div>
  )
}
