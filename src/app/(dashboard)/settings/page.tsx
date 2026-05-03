import { auth } from '@/lib/auth'
import AccountForm from '@/components/settings/AccountForm'

export default async function SettingsPage() {
  const session = await auth()
  const user = session!.user

  return (
    <div className="max-w-2xl space-y-6 pb-8">
      <div>
        <h1 className="text-2xl font-bold text-foreground tracking-tight">Settings</h1>
        <p className="text-muted-foreground text-sm mt-0.5">Manage your account</p>
      </div>

      <AccountForm name={user.name || ''} email={user.email || ''} />

      <div className="bg-white border border-border rounded-2xl p-6">
        <h2 className="font-bold text-foreground mb-4">Security</h2>
        <div className="space-y-2.5 text-sm text-muted-foreground">
          {[
            'Only last 4 digits of cards stored — no full card numbers, no CVV',
            'Passwords hashed with bcrypt (12 rounds)',
            'All sessions secured with JWT',
            'API routes protected with auth middleware',
            'SQL injection protection via Prisma ORM',
            'Input validation with Zod on all API routes',
          ].map((item) => (
            <div key={item} className="flex items-start gap-2.5">
              <span className="w-4 h-4 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center text-xs flex-shrink-0 mt-0.5">✓</span>
              <span>{item}</span>
            </div>
          ))}
        </div>
      </div>

      <div className="bg-white border border-border rounded-2xl p-5">
        <p className="text-xs text-muted-foreground">
          <strong>CardZen</strong> v1.0.0 · Built to keep you stress-free with credit cards
        </p>
      </div>
    </div>
  )
}
