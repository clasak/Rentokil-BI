'use client'

import { useState } from 'react'
import Link from 'next/link'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import { ExternalLink, Shield } from 'lucide-react'
import { ROLE_PERMISSIONS } from '@/store'
import { Sidebar } from '@/components/layout/Sidebar'
import type { Role } from '@/types'

const ROLES: Array<{ value: Role; label: string }> = [
  { value: 'exec', label: 'Executive' },
  { value: 'market_vp', label: 'Market VP' },
  { value: 'market_sales_director', label: 'Market Sales Director' },
  { value: 'region_director', label: 'Region Director' },
  { value: 'region_sales_manager', label: 'Region Sales Manager' },
  { value: 'manager', label: 'Branch Manager' },
  { value: 'sales_manager', label: 'Sales Manager' },
  { value: 'ops_manager', label: 'Operations Manager' },
  { value: 'rep', label: 'Account Executive' },
  { value: 'technician', label: 'Technician' },
]

export function RolePreview() {
  const [selectedRole, setSelectedRole] = useState<Role>('exec')

  const rolePermissions = ROLE_PERMISSIONS[selectedRole]

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Shield className="h-5 w-5" />
          Role Sidebar Preview
        </CardTitle>
        <CardDescription>
          Preview the actual navigation sidebar for each role
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex items-center justify-between">
          <Select value={selectedRole} onValueChange={(v) => setSelectedRole(v as Role)}>
            <SelectTrigger className="w-[250px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {ROLES.map((role) => (
                <SelectItem key={role.value} value={role.value}>
                  {role.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Button asChild variant="outline" size="sm">
            <Link href={`/?preview_role=${selectedRole}`} target="_blank" rel="noopener">
              <ExternalLink className="w-4 h-4 mr-2" />
              Open as {ROLES.find((r) => r.value === selectedRole)?.label}
            </Link>
          </Button>
        </div>

        <Separator />

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          {/* Actual Sidebar Preview */}
          <div className="lg:col-span-2 border rounded-lg bg-white dark:bg-gray-900 overflow-hidden">
            <div className="p-3 border-b bg-gray-50 dark:bg-gray-800">
              <span className="text-sm font-medium text-gray-600 dark:text-gray-400">
                Actual Sidebar for {ROLES.find((r) => r.value === selectedRole)?.label}
              </span>
            </div>
            <div className="h-[500px] overflow-y-auto">
              <Sidebar key={selectedRole} previewRole={selectedRole} isPreview={true} />
            </div>
          </div>

          {/* Role Details */}
          <div className="space-y-4">
            <div className="p-4 bg-gray-50 dark:bg-gray-800 rounded-lg">
              <div className="text-sm font-medium mb-2 dark:text-gray-100">Role Details</div>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-500 dark:text-gray-400">Name:</span>
                  <span className="font-medium dark:text-gray-200">{rolePermissions?.label}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500 dark:text-gray-400">Admin Access:</span>
                  <Badge variant={selectedRole === 'exec' ? 'default' : 'secondary'}>
                    {selectedRole === 'exec' ? 'Yes' : 'No'}
                  </Badge>
                </div>
              </div>
            </div>

            <div className="p-4 bg-gray-50 dark:bg-gray-800 rounded-lg">
              <div className="text-sm font-medium mb-2 dark:text-gray-100">Permissions</div>
              <div className="space-y-2">
                <div>
                  <span className="text-xs text-gray-500 dark:text-gray-400">Can View:</span>
                  <div className="flex flex-wrap gap-1 mt-1">
                    {rolePermissions?.canView.slice(0, 5).map((v) => (
                      <Badge key={v} variant="outline" className="text-xs">
                        {v.replace('_', ' ')}
                      </Badge>
                    ))}
                    {rolePermissions && rolePermissions.canView.length > 5 && (
                      <Badge variant="outline" className="text-xs">
                        +{rolePermissions.canView.length - 5} more
                      </Badge>
                    )}
                  </div>
                </div>
                <div>
                  <span className="text-xs text-gray-500 dark:text-gray-400">Can Edit:</span>
                  <div className="flex flex-wrap gap-1 mt-1">
                    {rolePermissions?.canEdit.map((e) => (
                      <Badge key={e} variant="secondary" className="text-xs">
                        {e.replace('_', ' ')}
                      </Badge>
                    ))}
                  </div>
                </div>
              </div>
            </div>

            <p className="text-xs text-gray-500 dark:text-gray-400">
              {rolePermissions?.description}
            </p>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
