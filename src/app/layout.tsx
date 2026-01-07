import type { Metadata } from 'next'
import './globals.css'
import { MainLayout } from '@/components/layout/MainLayout'
import { ThemeProvider } from '@/components/providers/ThemeProvider'

export const metadata: Metadata = {
  title: 'Rentokil BI - Business Operating System',
  description: 'Enterprise Business Intelligence Dashboard for Rentokil Leadership',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className="font-sans antialiased">
        <ThemeProvider>
          <MainLayout>
            {children}
          </MainLayout>
        </ThemeProvider>
      </body>
    </html>
  )
}
