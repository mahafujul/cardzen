'use client'

import { signOut } from 'next-auth/react'
import { LogOut, Bell, User } from 'lucide-react'

interface TopBarProps {
  user: { name?: string | null; email?: string | null }
}

export default function TopBar({ user }: TopBarProps) {
  return (
    <header className="h-14 border-b border-border bg-background/80 backdrop-blur-sm flex items-center justify-between px-4 lg:px-6 flex-shrink-0 pl-16 lg:pl-6">
      <div />
      <div className="flex items-center gap-2">
        <div className="flex items-center gap-2 pl-3 border-l border-border">
          <div className="w-7 h-7 rounded-full bg-blue-100 flex items-center justify-center">
            <User className="w-3.5 h-3.5 text-blue-600" />
          </div>
          <span className="text-sm font-medium text-foreground hidden sm:block">
            {user.name || user.email}
          </span>
          <button
            onClick={() => signOut({ callbackUrl: '/login' })}
            className="p-1.5 rounded-lg hover:bg-secondary text-muted-foreground hover:text-foreground transition-colors"
            title="Sign out"
          >
            <LogOut className="w-4 h-4" />
          </button>
        </div>
      </div>
    </header>
  )
}
