import type { Metadata } from 'next'
import './globals.css'
import { MainLayout } from '@/components/layout/MainLayout'

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
    <html lang="en">
      <body className="font-sans antialiased">
        <MainLayout>
          {children}
        </MainLayout>
      </body>
    </html>
  )
}
