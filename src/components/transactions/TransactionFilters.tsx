'use client'

import { useRouter, usePathname } from 'next/navigation'
import { Search, X } from 'lucide-react'
import { useCallback, useState } from 'react'

const CATEGORIES = [
  { value: 'FOOD', label: '🍽️ Food' },
  { value: 'SHOPPING', label: '🛍️ Shopping' },
  { value: 'TRAVEL', label: '✈️ Travel' },
  { value: 'UTILITY', label: '⚡ Utility' },
  { value: 'BILLS', label: '📋 Bills' },
  { value: 'SUBSCRIPTION', label: '🔄 Subscription' },
  { value: 'MEDICAL', label: '🏥 Medical' },
  { value: 'FUEL', label: '⛽ Fuel' },
  { value: 'OTHERS', label: '📦 Others' },
]

interface TransactionFiltersProps {
  cards: { id: string; nickname: string; bankName: string }[]
  searchParams: Record<string, string | undefined>
}

export default function TransactionFilters({ cards, searchParams }: TransactionFiltersProps) {
  const router = useRouter()
  const pathname = usePathname()
  const [search, setSearch] = useState(searchParams.search || '')

  function updateParam(key: string, value: string) {
    const params = new URLSearchParams()
    Object.entries({ ...searchParams, [key]: value, page: '1' }).forEach(([k, v]) => {
      if (v) params.set(k, v)
    })
    router.push(`${pathname}?${params.toString()}`)
  }

  function clearParam(key: string) {
    const params = new URLSearchParams()
    Object.entries({ ...searchParams }).forEach(([k, v]) => {
      if (k !== key && v) params.set(k, v)
    })
    params.set('page', '1')
    router.push(`${pathname}?${params.toString()}`)
  }

  function clearAll() {
    router.push(pathname)
    setSearch('')
  }

  function handleSearch(e: React.FormEvent) {
    e.preventDefault()
    updateParam('search', search)
  }

  const hasFilters = searchParams.cardId || searchParams.category || searchParams.search

  return (
    <div className="bg-white border border-border rounded-2xl p-4 space-y-3">
      <div className="flex flex-wrap gap-3">
        {/* Search */}
        <form onSubmit={handleSearch} className="flex-1 min-w-[200px] relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <input
            type="text"
            placeholder="Search transactions..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="w-full pl-9 pr-3 py-2 text-sm border border-input rounded-xl focus:outline-none focus:ring-2 focus:ring-ring"
          />
        </form>

        {/* Card filter */}
        <select
          className="text-sm border border-input rounded-xl px-3 py-2 focus:outline-none focus:ring-2 focus:ring-ring bg-white"
          value={searchParams.cardId || ''}
          onChange={e => e.target.value ? updateParam('cardId', e.target.value) : clearParam('cardId')}
        >
          <option value="">All Cards</option>
          {cards.map(c => (
            <option key={c.id} value={c.id}>{c.nickname} ({c.bankName})</option>
          ))}
        </select>

        {/* Category filter */}
        <select
          className="text-sm border border-input rounded-xl px-3 py-2 focus:outline-none focus:ring-2 focus:ring-ring bg-white"
          value={searchParams.category || ''}
          onChange={e => e.target.value ? updateParam('category', e.target.value) : clearParam('category')}
        >
          <option value="">All Categories</option>
          {CATEGORIES.map(c => (
            <option key={c.value} value={c.value}>{c.label}</option>
          ))}
        </select>

        {hasFilters && (
          <button
            onClick={clearAll}
            className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground px-3 py-2 rounded-xl hover:bg-secondary transition-colors"
          >
            <X className="w-3.5 h-3.5" />
            Clear
          </button>
        )}
      </div>
    </div>
  )
}
