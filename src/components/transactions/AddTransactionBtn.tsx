'use client'

import { useState } from 'react'
import { Plus, X, Loader2 } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { cn } from '@/lib/utils'

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

const PLATFORM_SOURCES = ['Amazon', 'Flipkart', 'Swiggy', 'Zomato', 'Myntra', 'Uber', 'Others']
const PERSON_TYPES = ['FRIEND', 'FAMILY', 'RELATIVE', 'COLLEAGUE', 'OTHER']

interface AddTransactionBtnProps {
  cards: { id: string; nickname: string; bankName: string }[]
  defaultCardId?: string
}

export default function AddTransactionBtn({ cards, defaultCardId }: AddTransactionBtnProps) {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const [form, setForm] = useState({
    cardId: defaultCardId || (cards[0]?.id || ''),
    title: '',
    amount: '',
    date: new Date().toISOString().slice(0, 16),
    merchantName: '',
    platformType: 'OFFLINE',
    platformSource: '',
    category: 'FOOD',
    notes: '',
    isBorrowed: false,
    personName: '',
    personType: 'FRIEND',
    amountOwed: '',
    dueDate: '',
    borrowedNotes: '',
    hasCashback: false,
    expectedCashback: '',
  })

  function set(key: string, value: any) {
    setForm(prev => ({ ...prev, [key]: value }))
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError('')

    const payload: any = {
      cardId: form.cardId,
      title: form.title,
      amount: parseFloat(form.amount),
      date: new Date(form.date).toISOString(),
      merchantName: form.merchantName || null,
      platformType: form.platformType,
      platformSource: form.platformType === 'ONLINE' ? form.platformSource : null,
      category: form.category,
      notes: form.notes || null,
      isBorrowed: form.isBorrowed,
      hasCashback: form.hasCashback,
    }

    if (form.isBorrowed) {
      payload.borrowedFrom = {
        personName: form.personName,
        personType: form.personType,
        amountOwed: parseFloat(form.amountOwed || form.amount),
        dueDate: form.dueDate ? new Date(form.dueDate).toISOString() : null,
        notes: form.borrowedNotes || null,
      }
    }

    if (form.hasCashback && form.expectedCashback) {
      payload.expectedCashback = parseFloat(form.expectedCashback)
    }

    const res = await fetch('/api/transactions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    })

    if (!res.ok) {
      const data = await res.json()
      setError(data.error?.formErrors?.[0] || 'Failed to add transaction')
      setLoading(false)
    } else {
      setOpen(false)
      setForm(prev => ({
        ...prev,
        title: '', amount: '', merchantName: '', notes: '',
        isBorrowed: false, hasCashback: false, personName: '',
        amountOwed: '', dueDate: '', expectedCashback: '',
      }))
      router.refresh()
    }
  }

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="flex items-center gap-2 bg-blue-600 hover:bg-blue-500 text-white px-4 py-2 rounded-xl text-sm font-semibold transition-colors"
      >
        <Plus className="w-4 h-4" />
        Add Transaction
      </button>

      {open && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4">
          <div className="fixed inset-0 bg-black/40 backdrop-blur-sm" onClick={() => setOpen(false)} />
          <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-xl max-h-[90vh] overflow-y-auto">
            <div className="sticky top-0 bg-white px-6 py-4 border-b border-border flex items-center justify-between">
              <h2 className="font-bold text-foreground">Add Transaction</h2>
              <button onClick={() => setOpen(false)} className="p-1.5 rounded-lg hover:bg-secondary">
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              {error && (
                <div className="px-4 py-3 bg-rose-50 border border-rose-200 rounded-xl text-rose-700 text-sm">
                  {error}
                </div>
              )}

              {/* Basic fields */}
              <div className="grid grid-cols-2 gap-3">
                <div className="col-span-2">
                  <label className="block text-sm font-medium mb-1.5">Card *</label>
                  <select
                    className="input-field"
                    value={form.cardId}
                    onChange={e => set('cardId', e.target.value)}
                    required
                  >
                    {cards.map(c => (
                      <option key={c.id} value={c.id}>{c.nickname} ({c.bankName})</option>
                    ))}
                  </select>
                </div>

                <div className="col-span-2">
                  <label className="block text-sm font-medium mb-1.5">Title *</label>
                  <input
                    className="input-field"
                    placeholder="e.g. Dinner at Taj Hotel"
                    value={form.title}
                    onChange={e => set('title', e.target.value)}
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium mb-1.5">Amount (₹) *</label>
                  <input
                    className="input-field"
                    type="number"
                    step="0.01"
                    placeholder="1500"
                    value={form.amount}
                    onChange={e => set('amount', e.target.value)}
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium mb-1.5">Date *</label>
                  <input
                    className="input-field"
                    type="datetime-local"
                    value={form.date}
                    onChange={e => set('date', e.target.value)}
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium mb-1.5">Category *</label>
                  <select
                    className="input-field"
                    value={form.category}
                    onChange={e => set('category', e.target.value)}
                  >
                    {CATEGORIES.map(c => (
                      <option key={c.value} value={c.value}>{c.label}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium mb-1.5">Platform</label>
                  <select
                    className="input-field"
                    value={form.platformType}
                    onChange={e => set('platformType', e.target.value)}
                  >
                    <option value="OFFLINE">Offline</option>
                    <option value="ONLINE">Online</option>
                  </select>
                </div>

                {form.platformType === 'ONLINE' && (
                  <div className="col-span-2">
                    <label className="block text-sm font-medium mb-1.5">Platform Source</label>
                    <select
                      className="input-field"
                      value={form.platformSource}
                      onChange={e => set('platformSource', e.target.value)}
                    >
                      <option value="">Select platform</option>
                      {PLATFORM_SOURCES.map(s => <option key={s} value={s}>{s}</option>)}
                    </select>
                  </div>
                )}

                <div className="col-span-2">
                  <label className="block text-sm font-medium mb-1.5">Merchant Name</label>
                  <input
                    className="input-field"
                    placeholder="e.g. Zomato, BigBazaar"
                    value={form.merchantName}
                    onChange={e => set('merchantName', e.target.value)}
                  />
                </div>

                <div className="col-span-2">
                  <label className="block text-sm font-medium mb-1.5">Notes</label>
                  <textarea
                    className="input-field h-16 resize-none"
                    placeholder="Any additional notes..."
                    value={form.notes}
                    onChange={e => set('notes', e.target.value)}
                  />
                </div>
              </div>

              {/* Borrowed toggle */}
              <div className="border border-border rounded-xl p-4">
                <label className="flex items-center gap-3 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={form.isBorrowed}
                    onChange={e => set('isBorrowed', e.target.checked)}
                    className="w-4 h-4 rounded accent-blue-600"
                  />
                  <div>
                    <p className="text-sm font-semibold text-foreground">Was this for someone else?</p>
                    <p className="text-xs text-muted-foreground">Track money someone owes you</p>
                  </div>
                </label>

                {form.isBorrowed && (
                  <div className="mt-4 grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-medium mb-1">Person Name *</label>
                      <input
                        className="input-field text-sm"
                        placeholder="Rahul Sharma"
                        value={form.personName}
                        onChange={e => set('personName', e.target.value)}
                        required={form.isBorrowed}
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium mb-1">Person Type</label>
                      <select
                        className="input-field text-sm"
                        value={form.personType}
                        onChange={e => set('personType', e.target.value)}
                      >
                        {PERSON_TYPES.map(t => <option key={t} value={t}>{t.charAt(0) + t.slice(1).toLowerCase()}</option>)}
                      </select>
                    </div>
                    <div>
                      <label className="block text-xs font-medium mb-1">Amount Owed (₹)</label>
                      <input
                        className="input-field text-sm"
                        type="number"
                        placeholder={form.amount || '0'}
                        value={form.amountOwed}
                        onChange={e => set('amountOwed', e.target.value)}
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium mb-1">Expected By</label>
                      <input
                        className="input-field text-sm"
                        type="datetime-local"
                        value={form.dueDate}
                        onChange={e => set('dueDate', e.target.value)}
                      />
                    </div>
                  </div>
                )}
              </div>

              {/* Cashback toggle */}
              <div className="border border-border rounded-xl p-4">
                <label className="flex items-center gap-3 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={form.hasCashback}
                    onChange={e => set('hasCashback', e.target.checked)}
                    className="w-4 h-4 rounded accent-blue-600"
                  />
                  <div>
                    <p className="text-sm font-semibold text-foreground">Track cashback for this?</p>
                    <p className="text-xs text-muted-foreground">Monitor expected cashback credit</p>
                  </div>
                </label>

                {form.hasCashback && (
                  <div className="mt-3">
                    <label className="block text-xs font-medium mb-1">Expected Cashback (₹)</label>
                    <input
                      className="input-field text-sm"
                      type="number"
                      step="0.01"
                      placeholder="75"
                      value={form.expectedCashback}
                      onChange={e => set('expectedCashback', e.target.value)}
                    />
                  </div>
                )}
              </div>

              <div className="flex gap-3 pt-2">
                <button
                  type="submit"
                  disabled={loading}
                  className="flex-1 bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white font-semibold py-2.5 rounded-xl text-sm flex items-center justify-center gap-2 transition-colors"
                >
                  {loading && <Loader2 className="w-4 h-4 animate-spin" />}
                  Add Transaction
                </button>
                <button
                  type="button"
                  onClick={() => setOpen(false)}
                  className="px-5 py-2.5 border border-border rounded-xl text-sm font-medium text-muted-foreground hover:bg-secondary transition-colors"
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  )
}
