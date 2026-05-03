'use client'

import { useState } from 'react'
import { Loader2, Eye, EyeOff } from 'lucide-react'

interface AccountFormProps {
  name: string
  email: string
}

export default function AccountForm({ name, email }: AccountFormProps) {
  const [nameVal, setNameVal] = useState(name)
  const [currentPass, setCurrentPass] = useState('')
  const [newPass, setNewPass] = useState('')
  const [showCurrentPass, setShowCurrentPass] = useState(false)
  const [showNewPass, setShowNewPass] = useState(false)
  const [loadingName, setLoadingName] = useState(false)
  const [loadingPass, setLoadingPass] = useState(false)
  const [nameMsg, setNameMsg] = useState('')
  const [passMsg, setPassMsg] = useState('')
  const [nameError, setNameError] = useState('')
  const [passError, setPassError] = useState('')

  async function handleNameSave(e: React.FormEvent) {
    e.preventDefault()
    setLoadingName(true)
    setNameMsg('')
    setNameError('')

    const res = await fetch('/api/user', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: nameVal }),
    })

    if (res.ok) {
      setNameMsg('Name updated successfully')
    } else {
      setNameError('Failed to update name')
    }
    setLoadingName(false)
  }

  async function handlePassSave(e: React.FormEvent) {
    e.preventDefault()
    if (!currentPass || !newPass) return

    setLoadingPass(true)
    setPassMsg('')
    setPassError('')

    const res = await fetch('/api/user', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ currentPassword: currentPass, newPassword: newPass }),
    })

    if (res.ok) {
      setPassMsg('Password changed successfully')
      setCurrentPass('')
      setNewPass('')
    } else {
      const data = await res.json()
      setPassError(data.error || 'Failed to change password')
    }
    setLoadingPass(false)
  }

  return (
    <div className="space-y-4">
      {/* Profile */}
      <div className="bg-white border border-border rounded-2xl p-6">
        <h2 className="font-bold text-foreground mb-4">Profile</h2>
        <form onSubmit={handleNameSave} className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-1.5">Name</label>
            <input
              type="text"
              value={nameVal}
              onChange={e => setNameVal(e.target.value)}
              minLength={2}
              maxLength={50}
              required
              className="input-field"
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1.5">Email</label>
            <input
              type="email"
              value={email}
              disabled
              className="input-field bg-secondary/50 text-muted-foreground cursor-not-allowed"
            />
            <p className="text-xs text-muted-foreground mt-1">Email cannot be changed</p>
          </div>
          {nameMsg && <p className="text-sm text-emerald-600 font-medium">{nameMsg}</p>}
          {nameError && <p className="text-sm text-rose-600">{nameError}</p>}
          <button
            type="submit"
            disabled={loadingName}
            className="flex items-center gap-2 bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white px-5 py-2 rounded-xl text-sm font-semibold transition-colors"
          >
            {loadingName && <Loader2 className="w-4 h-4 animate-spin" />}
            Save Name
          </button>
        </form>
      </div>

      {/* Change password */}
      <div className="bg-white border border-border rounded-2xl p-6">
        <h2 className="font-bold text-foreground mb-4">Change Password</h2>
        <form onSubmit={handlePassSave} className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-1.5">Current Password</label>
            <div className="relative">
              <input
                type={showCurrentPass ? 'text' : 'password'}
                value={currentPass}
                onChange={e => setCurrentPass(e.target.value)}
                placeholder="Enter current password"
                className="input-field pr-10"
              />
              <button
                type="button"
                onClick={() => setShowCurrentPass(!showCurrentPass)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
              >
                {showCurrentPass ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium mb-1.5">New Password</label>
            <div className="relative">
              <input
                type={showNewPass ? 'text' : 'password'}
                value={newPass}
                onChange={e => setNewPass(e.target.value)}
                placeholder="Minimum 8 characters"
                minLength={8}
                className="input-field pr-10"
              />
              <button
                type="button"
                onClick={() => setShowNewPass(!showNewPass)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
              >
                {showNewPass ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>
          {passMsg && <p className="text-sm text-emerald-600 font-medium">{passMsg}</p>}
          {passError && <p className="text-sm text-rose-600">{passError}</p>}
          <button
            type="submit"
            disabled={loadingPass || !currentPass || !newPass}
            className="flex items-center gap-2 bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white px-5 py-2 rounded-xl text-sm font-semibold transition-colors"
          >
            {loadingPass && <Loader2 className="w-4 h-4 animate-spin" />}
            Change Password
          </button>
        </form>
      </div>
    </div>
  )
}
