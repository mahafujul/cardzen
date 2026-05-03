'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Loader2 } from 'lucide-react'

const CARD_TYPES = ['VISA', 'MASTERCARD', 'RUPAY', 'AMEX', 'DINERS', 'OTHER']
const MONTHS = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December'
]

interface CardFormProps {
  defaultValues?: Record<string, any>
  cardId?: string
}

export default function CardForm({ defaultValues, cardId }: CardFormProps) {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const [form, setForm] = useState({
    nickname: defaultValues?.nickname || '',
    bankName: defaultValues?.bankName || '',
    cardType: defaultValues?.cardType || 'VISA',
    lastFourDigits: defaultValues?.lastFourDigits || '',
    creditLimit: defaultValues?.creditLimit || '',
    billingDate: defaultValues?.billingDate || '',
    dueDate: defaultValues?.dueDate || '20',
    cardStatus: defaultValues?.cardStatus || 'ACTIVE',
    cashbackType: defaultValues?.cashbackType || 'NONE',
    cashbackPercent: defaultValues?.cashbackPercent || '',
    cashbackCapType: defaultValues?.cashbackCapType || 'NO_CAP',
    cashbackCapAmount: defaultValues?.cashbackCapAmount || '',
    quarterStartMonth: defaultValues?.quarterStartMonth || '1',
    feeType: defaultValues?.feeType || 'LIFETIME_FREE',
    annualFeeAmount: defaultValues?.annualFeeAmount || '',
    joiningFeeAmount: defaultValues?.joiningFeeAmount || '',
    annualSpendWaiver: defaultValues?.annualSpendWaiver || '',
    feeRenewalMonth: defaultValues?.feeRenewalMonth || '',
  })

  function set(key: string, value: string) {
    setForm(prev => ({ ...prev, [key]: value }))
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError('')

    const payload: any = {
      ...form,
      creditLimit: parseFloat(form.creditLimit),
      billingDate: parseInt(form.billingDate),
      dueDate: parseInt(form.dueDate),
      cashbackPercent: form.cashbackPercent ? parseFloat(form.cashbackPercent) : null,
      cashbackCapAmount: form.cashbackCapAmount ? parseFloat(form.cashbackCapAmount) : null,
      quarterStartMonth: form.quarterStartMonth ? parseInt(form.quarterStartMonth) : null,
      annualFeeAmount: form.annualFeeAmount ? parseFloat(form.annualFeeAmount) : null,
      joiningFeeAmount: form.joiningFeeAmount ? parseFloat(form.joiningFeeAmount) : null,
      annualSpendWaiver: form.annualSpendWaiver ? parseFloat(form.annualSpendWaiver) : null,
      feeRenewalMonth: form.feeRenewalMonth ? parseInt(form.feeRenewalMonth) : null,
    }

    const url = cardId ? `/api/cards/${cardId}` : '/api/cards'
    const method = cardId ? 'PATCH' : 'POST'

    const res = await fetch(url, {
      method,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    })

    if (!res.ok) {
      const data = await res.json()
      setError(data.error?.formErrors?.[0] || 'Something went wrong')
      setLoading(false)
    } else {
      router.push('/cards')
      router.refresh()
    }
  }

  const showCashback = form.cashbackType !== 'NONE'
  const showCashbackCap = form.cashbackCapType !== 'NO_CAP'
  const showQuarter = form.cashbackCapType === 'QUARTERLY_CAP'
  const showAnnualFee = form.feeType !== 'LIFETIME_FREE'

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {error && (
        <div className="px-4 py-3 bg-rose-50 border border-rose-200 rounded-xl text-rose-700 text-sm">
          {error}
        </div>
      )}

      {/* Basic Info */}
      <section className="bg-white border border-border rounded-2xl p-6 space-y-4">
        <h2 className="font-bold text-foreground">Basic Information</h2>

        <div className="grid sm:grid-cols-2 gap-4">
          <Field label="Card Nickname" required>
            <input
              className="input-field"
              placeholder="e.g. Amazon ICICI"
              value={form.nickname}
              onChange={e => set('nickname', e.target.value)}
              required
            />
          </Field>
          <Field label="Bank Name" required>
            <input
              className="input-field"
              placeholder="e.g. ICICI Bank"
              value={form.bankName}
              onChange={e => set('bankName', e.target.value)}
              required
            />
          </Field>
        </div>

        <div className="grid sm:grid-cols-3 gap-4">
          <Field label="Card Type" required>
            <select className="input-field" value={form.cardType} onChange={e => set('cardType', e.target.value)}>
              {CARD_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
            </select>
          </Field>
          <Field label="Last 4 Digits" required>
            <input
              className="input-field"
              placeholder="1234"
              maxLength={4}
              pattern="[0-9]{4}"
              value={form.lastFourDigits}
              onChange={e => set('lastFourDigits', e.target.value.replace(/\D/g, ''))}
              required
            />
          </Field>
          <Field label="Status">
            <select className="input-field" value={form.cardStatus} onChange={e => set('cardStatus', e.target.value)}>
              <option value="ACTIVE">Active</option>
              <option value="INACTIVE">Inactive</option>
            </select>
          </Field>
        </div>

        <div className="grid sm:grid-cols-3 gap-4">
          <Field label="Credit Limit (₹)" required>
            <input
              className="input-field"
              type="number"
              placeholder="100000"
              value={form.creditLimit}
              onChange={e => set('creditLimit', e.target.value)}
              required
            />
          </Field>
          <Field label="Billing Date" required hint="Day of month statement generates">
            <input
              className="input-field"
              type="number"
              min="1"
              max="28"
              placeholder="20"
              value={form.billingDate}
              onChange={e => set('billingDate', e.target.value)}
              required
            />
          </Field>
          <Field label="Due Days After Billing" required hint="Days after billing date">
            <input
              className="input-field"
              type="number"
              min="1"
              max="60"
              placeholder="20"
              value={form.dueDate}
              onChange={e => set('dueDate', e.target.value)}
              required
            />
          </Field>
        </div>
      </section>

      {/* Cashback */}
      <section className="bg-white border border-border rounded-2xl p-6 space-y-4">
        <h2 className="font-bold text-foreground">Cashback Settings</h2>

        <Field label="Cashback Type">
          <select className="input-field" value={form.cashbackType} onChange={e => set('cashbackType', e.target.value)}>
            <option value="NONE">No Cashback</option>
            <option value="FLAT">Flat Cashback</option>
            <option value="CATEGORY_BASED">Category Based</option>
          </select>
        </Field>

        {showCashback && (
          <Field label="Cashback Percentage (%)">
            <input
              className="input-field"
              type="number"
              step="0.1"
              placeholder="1.5"
              value={form.cashbackPercent}
              onChange={e => set('cashbackPercent', e.target.value)}
            />
          </Field>
        )}

        <Field label="Cashback Cap">
          <select className="input-field" value={form.cashbackCapType} onChange={e => set('cashbackCapType', e.target.value)}>
            <option value="NO_CAP">No Cap</option>
            <option value="MONTHLY_CAP">Monthly Cap</option>
            <option value="QUARTERLY_CAP">Quarterly Cap</option>
            <option value="ANNUAL_CAP">Annual Cap</option>
          </select>
        </Field>

        {showCashbackCap && (
          <div className="grid sm:grid-cols-2 gap-4">
            <Field label="Maximum Cashback (₹)">
              <input
                className="input-field"
                type="number"
                placeholder="4000"
                value={form.cashbackCapAmount}
                onChange={e => set('cashbackCapAmount', e.target.value)}
              />
            </Field>
            {showQuarter && (
              <Field label="Quarter Start Month">
                <select className="input-field" value={form.quarterStartMonth} onChange={e => set('quarterStartMonth', e.target.value)}>
                  <option value="1">January (Jan-Mar)</option>
                  <option value="4">April (Apr-Jun)</option>
                  <option value="7">July (Jul-Sep)</option>
                  <option value="10">October (Oct-Dec)</option>
                </select>
              </Field>
            )}
          </div>
        )}
      </section>

      {/* Annual Fee */}
      <section className="bg-white border border-border rounded-2xl p-6 space-y-4">
        <h2 className="font-bold text-foreground">Annual Fee</h2>

        <Field label="Fee Type">
          <select className="input-field" value={form.feeType} onChange={e => set('feeType', e.target.value)}>
            <option value="LIFETIME_FREE">Lifetime Free</option>
            <option value="ANNUAL_FEE">Annual Fee</option>
            <option value="JOINING_AND_ANNUAL_FEE">Joining + Annual Fee</option>
          </select>
        </Field>

        {showAnnualFee && (
          <div className="grid sm:grid-cols-2 gap-4">
            {form.feeType === 'JOINING_AND_ANNUAL_FEE' && (
              <Field label="Joining Fee (₹)">
                <input
                  className="input-field"
                  type="number"
                  placeholder="999"
                  value={form.joiningFeeAmount}
                  onChange={e => set('joiningFeeAmount', e.target.value)}
                />
              </Field>
            )}
            <Field label="Annual Fee (₹)">
              <input
                className="input-field"
                type="number"
                placeholder="499"
                value={form.annualFeeAmount}
                onChange={e => set('annualFeeAmount', e.target.value)}
              />
            </Field>
            <Field label="Fee Renewal Month">
              <select className="input-field" value={form.feeRenewalMonth} onChange={e => set('feeRenewalMonth', e.target.value)}>
                <option value="">Select month</option>
                {MONTHS.map((m, i) => <option key={i + 1} value={i + 1}>{m}</option>)}
              </select>
            </Field>
            <Field label="Annual Spend for Waiver (₹)" hint="Spend this amount to waive fee">
              <input
                className="input-field"
                type="number"
                placeholder="100000"
                value={form.annualSpendWaiver}
                onChange={e => set('annualSpendWaiver', e.target.value)}
              />
            </Field>
          </div>
        )}
      </section>

      <div className="flex gap-3">
        <button
          type="submit"
          disabled={loading}
          className="flex-1 bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white font-semibold py-2.5 rounded-xl text-sm transition-all flex items-center justify-center gap-2"
        >
          {loading && <Loader2 className="w-4 h-4 animate-spin" />}
          {cardId ? 'Save Changes' : 'Add Card'}
        </button>
        <button
          type="button"
          onClick={() => router.back()}
          className="px-6 py-2.5 border border-border rounded-xl text-sm font-medium text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors"
        >
          Cancel
        </button>
      </div>
    </form>
  )
}

function Field({ label, children, required, hint }: {
  label: string
  children: React.ReactNode
  required?: boolean
  hint?: string
}) {
  return (
    <div>
      <label className="block text-sm font-medium text-foreground mb-1.5">
        {label}
        {required && <span className="text-rose-500 ml-0.5">*</span>}
      </label>
      {children}
      {hint && <p className="text-xs text-muted-foreground mt-1">{hint}</p>}
    </div>
  )
}
