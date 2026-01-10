import { ReactNode } from 'react'

interface AuthLayoutProps {
  children: ReactNode
}

export default function AuthLayout({ children }: AuthLayoutProps) {
  // Auth pages render without the main dashboard layout
  return <>{children}</>
}
