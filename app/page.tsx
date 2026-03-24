"use client"

import { AuthProvider, useAuth } from "@/lib/auth-context"
import { LoginPage } from "@/components/login-page"
import { Dashboard } from "@/components/dashboard"

function AppRouter() {
  const { user } = useAuth()

  if (!user) {
    return <LoginPage />
  }

  return <Dashboard />
}

export default function Page() {
  return (
    <AuthProvider>
      <AppRouter />
    </AuthProvider>
  )
}
