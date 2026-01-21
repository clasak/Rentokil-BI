"use client"

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useAppStore } from '@/store'

export default function NewStartsRedirect() {
  const router = useRouter()
  const { settings } = useAppStore()
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
  }, [])

  useEffect(() => {
    if (!mounted) return

    const role = settings.role
    if (role === 'rep') {
      router.replace('/ae/new-starts')
    } else if (role === 'ops_manager') {
      router.replace('/ops/new-starts')
    } else {
      // Default to ops view for other roles
      router.replace('/ops/new-starts')
    }
  }, [mounted, settings.role, router])

  return (
    <div className="flex items-center justify-center min-h-[50vh]">
      <div className="text-gray-500">Redirecting...</div>
    </div>
  )
}
