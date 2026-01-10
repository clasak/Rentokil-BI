import type { Metadata } from 'next'
import './globals.css'
import { ThemeProvider } from '@/components/providers/ThemeProvider'
import { Toaster } from '@/components/ui/toaster'

export const metadata: Metadata = {
  title: 'Rentokil BI - Alpha',
  description: 'Enterprise Business Intelligence Dashboard for Rentokil Leadership - Alpha Testing',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className="font-sans antialiased" suppressHydrationWarning>
        <ThemeProvider>
          {children}
          <Toaster />
        </ThemeProvider>
      </body>
    </html>
  )
}
