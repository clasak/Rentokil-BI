"use client"

/**
 * Admin User Management Page
 *
 * Features:
 * - View all users and their roles
 * - See Workday job title vs assigned dashboard role
 * - Override/change any user's role
 * - Filter by role, SSO provider, branch, region, market
 * - Search by name, email, employee number
 */

import { useState, useEffect, useCallback } from 'react'
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
} from '@/components/ui/dialog'
import {
  Users,
  Search,
  RefreshCw,
  Edit2,
  Shield,
  Building2,
  UserCheck,
  AlertCircle,
  Loader2,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react'
import { Role } from '@/types'
import { ROLE_PERMISSIONS } from '@/store'
import { createClient } from '@/lib/supabase/client'
import { useAuth } from '@/components/providers/AuthProvider'
import { useRouter } from 'next/navigation'
import { isAdminEmail } from '@/lib/admin'

interface UserProfile {
  id: string
  email: string
  name: string
  role: Role
  auth_provider: string
  sso_provider: string | null
  employee_number: string | null
  workday_job_title: string | null
  auto_detected_role: Role | null
  role_override: boolean
  role_override_by: string | null
  role_override_at: string | null
  branch_code: string | null
  region_code: string | null
  market_code: string | null
  last_synced_at: string | null
  created_at: string
  updated_at: string
}

const ROLES: Role[] = [
  'exec',
  'market_vp',
  'market_sales_director',
  'region_director',
  'region_sales_manager',
  'manager',
  'sales_manager',
  'ops_manager',
  'rep',
  'technician',
]

// Wrapper component to handle SSR - useAuth requires AuthProvider
function AdminUsersPageContent() {
  const [users, setUsers] = useState<UserProfile[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [search, setSearch] = useState('')
  const [roleFilter, setRoleFilter] = useState<string>('all')
  const [providerFilter, setProviderFilter] = useState<string>('all')
  const [editingUser, setEditingUser] = useState<UserProfile | null>(null)
  const [newRole, setNewRole] = useState<Role | null>(null)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [page, setPage] = useState(1)
  const [error, setError] = useState<string | null>(null)

  const pageSize = 25
  const { user: currentUser } = useAuth()
  const router = useRouter()
  const supabase = createClient()

  // Check admin access
  useEffect(() => {
    if (currentUser?.email && !isAdminEmail(currentUser.email)) {
      router.push('/')
    }
  }, [currentUser, router])

  const fetchUsers = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const { data, error: fetchError } = await supabase
        .from('user_profiles')
        .select('*')
        .order('name', { ascending: true })

      if (fetchError) {
        console.error('Failed to fetch users:', fetchError)
        setError('Failed to load users. Database table may not exist yet.')
        setUsers([])
      } else {
        setUsers((data || []) as UserProfile[])
      }
    } catch (e) {
      console.error('Failed to fetch users:', e)
      setError('An unexpected error occurred.')
      setUsers([])
    } finally {
      setLoading(false)
    }
  }, [supabase])

  useEffect(() => {
    fetchUsers()
  }, [fetchUsers])

  const handleRoleOverride = async (userId: string, role: Role) => {
    if (!currentUser?.email) return

    setSaving(true)
    try {
      const { error: updateError } = await supabase
        .from('user_profiles')
        .update({
          role: role,
          role_override: true,
          role_override_by: currentUser.email,
          role_override_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        })
        .eq('id', userId)

      if (updateError) {
        console.error('Failed to override role:', updateError)
        setError('Failed to update role.')
      } else {
        await fetchUsers()
        setDialogOpen(false)
        setEditingUser(null)
      }
    } catch (e) {
      console.error('Failed to override role:', e)
      setError('An unexpected error occurred.')
    } finally {
      setSaving(false)
    }
  }

  const handleResetToAutoDetected = async (userId: string) => {
    const user = users.find((u) => u.id === userId)
    if (!user?.auto_detected_role) return

    setSaving(true)
    try {
      const { error: updateError } = await supabase
        .from('user_profiles')
        .update({
          role: user.auto_detected_role,
          role_override: false,
          role_override_by: null,
          role_override_at: null,
          updated_at: new Date().toISOString(),
        })
        .eq('id', userId)

      if (updateError) {
        console.error('Failed to reset role:', updateError)
      } else {
        await fetchUsers()
        setDialogOpen(false)
        setEditingUser(null)
      }
    } catch (e) {
      console.error('Failed to reset role:', e)
    } finally {
      setSaving(false)
    }
  }

  // Filter users
  const filteredUsers = users.filter((user) => {
    const matchesSearch =
      !search ||
      user.name?.toLowerCase().includes(search.toLowerCase()) ||
      user.email?.toLowerCase().includes(search.toLowerCase()) ||
      user.employee_number?.includes(search) ||
      user.workday_job_title?.toLowerCase().includes(search.toLowerCase())

    const matchesRole = roleFilter === 'all' || user.role === roleFilter
    const matchesProvider =
      providerFilter === 'all' ||
      (providerFilter === 'sso' && user.auth_provider === 'sso') ||
      (providerFilter === 'email' && (user.auth_provider === 'email' || !user.auth_provider)) ||
      user.sso_provider === providerFilter

    return matchesSearch && matchesRole && matchesProvider
  })

  // Pagination
  const totalPages = Math.ceil(filteredUsers.length / pageSize)
  const paginatedUsers = filteredUsers.slice((page - 1) * pageSize, page * pageSize)

  // Stats
  const ssoUsers = users.filter((u) => u.auth_provider === 'sso').length
  const overriddenUsers = users.filter((u) => u.role_override).length

  const getRoleBadgeColor = (role: Role) => {
    const colors: Record<Role, string> = {
      exec: 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300',
      market_vp: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300',
      market_sales_director: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300',
      region_director: 'bg-indigo-100 text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-300',
      region_sales_manager: 'bg-indigo-100 text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-300',
      manager: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300',
      sales_manager: 'bg-cyan-100 text-cyan-700 dark:bg-cyan-900/30 dark:text-cyan-300',
      ops_manager: 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-300',
      rep: 'bg-teal-100 text-teal-700 dark:bg-teal-900/30 dark:text-teal-300',
      technician: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300',
    }
    return colors[role] || 'bg-gray-100 text-gray-700'
  }

  if (!currentUser?.email || !isAdminEmail(currentUser.email)) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="text-center">
          <Shield className="h-12 w-12 text-gray-400 mx-auto mb-4" />
          <h2 className="text-xl font-semibold text-gray-700 dark:text-gray-300">
            Access Denied
          </h2>
          <p className="text-gray-500 dark:text-gray-400 mt-2">
            You do not have permission to view this page.
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6 p-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">User Management</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400">
            View and manage user roles across the organization
          </p>
        </div>
        <Button onClick={fetchUsers} variant="outline" className="gap-2" disabled={loading}>
          <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
          Refresh
        </Button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-blue-100 dark:bg-blue-900/30 rounded-lg">
                <Users className="h-5 w-5 text-blue-600 dark:text-blue-400" />
              </div>
              <div>
                <p className="text-2xl font-bold">{users.length}</p>
                <p className="text-sm text-gray-500">Total Users</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-green-100 dark:bg-green-900/30 rounded-lg">
                <Shield className="h-5 w-5 text-green-600 dark:text-green-400" />
              </div>
              <div>
                <p className="text-2xl font-bold">{ssoUsers}</p>
                <p className="text-sm text-gray-500">SSO Users</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-orange-100 dark:bg-orange-900/30 rounded-lg">
                <Edit2 className="h-5 w-5 text-orange-600 dark:text-orange-400" />
              </div>
              <div>
                <p className="text-2xl font-bold">{overriddenUsers}</p>
                <p className="text-sm text-gray-500">Role Overrides</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-purple-100 dark:bg-purple-900/30 rounded-lg">
                <Building2 className="h-5 w-5 text-purple-600 dark:text-purple-400" />
              </div>
              <div>
                <p className="text-2xl font-bold">{ROLES.length}</p>
                <p className="text-sm text-gray-500">Role Types</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                <Input
                  placeholder="Search by name, email, employee #, or job title..."
                  value={search}
                  onChange={(e) => {
                    setSearch(e.target.value)
                    setPage(1)
                  }}
                  className="pl-10"
                />
              </div>
            </div>
            <Select
              value={roleFilter}
              onValueChange={(v) => {
                setRoleFilter(v)
                setPage(1)
              }}
            >
              <SelectTrigger className="w-full md:w-48">
                <SelectValue placeholder="Filter by role" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Roles</SelectItem>
                {ROLES.map((role) => (
                  <SelectItem key={role} value={role}>
                    {ROLE_PERMISSIONS[role]?.label || role}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select
              value={providerFilter}
              onValueChange={(v) => {
                setProviderFilter(v)
                setPage(1)
              }}
            >
              <SelectTrigger className="w-full md:w-48">
                <SelectValue placeholder="Filter by provider" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Providers</SelectItem>
                <SelectItem value="sso">SSO (All)</SelectItem>
                <SelectItem value="azure">Microsoft</SelectItem>
                <SelectItem value="okta">Okta</SelectItem>
                <SelectItem value="email">Email/Password</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Error Message */}
      {error && (
        <Card className="border-red-200 bg-red-50 dark:border-red-800 dark:bg-red-900/20">
          <CardContent className="pt-6">
            <div className="flex items-center gap-2 text-red-700 dark:text-red-400">
              <AlertCircle className="h-5 w-5" />
              <p>{error}</p>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Users Table */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <UserCheck className="h-5 w-5" />
            Users ({filteredUsers.length})
          </CardTitle>
          <CardDescription>
            Click on a user to view details or change their role
          </CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
            </div>
          ) : filteredUsers.length === 0 ? (
            <div className="text-center py-12 text-gray-500">
              No users found matching your filters.
            </div>
          ) : (
            <>
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>User</TableHead>
                      <TableHead>Workday Title</TableHead>
                      <TableHead>Dashboard Role</TableHead>
                      <TableHead>Auth Provider</TableHead>
                      <TableHead>Location</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {paginatedUsers.map((user) => (
                      <TableRow key={user.id} className="hover:bg-gray-50 dark:hover:bg-gray-800/50">
                        <TableCell>
                          <div>
                            <div className="font-medium text-gray-900 dark:text-white">
                              {user.name || 'Unknown'}
                            </div>
                            <div className="text-xs text-gray-500">{user.email}</div>
                            {user.employee_number && (
                              <div className="text-xs text-gray-400">#{user.employee_number}</div>
                            )}
                          </div>
                        </TableCell>
                        <TableCell>
                          <span className="text-sm text-gray-600 dark:text-gray-300">
                            {user.workday_job_title || '-'}
                          </span>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2 flex-wrap">
                            <Badge className={getRoleBadgeColor(user.role)}>
                              {ROLE_PERMISSIONS[user.role]?.label || user.role}
                            </Badge>
                            {user.role_override && (
                              <Badge variant="outline" className="text-xs border-orange-300 text-orange-600">
                                Override
                              </Badge>
                            )}
                            {user.auto_detected_role && user.auto_detected_role !== user.role && (
                              <span className="text-xs text-gray-400">
                                (auto: {ROLE_PERMISSIONS[user.auto_detected_role]?.label})
                              </span>
                            )}
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge
                            variant="outline"
                            className={
                              user.auth_provider === 'sso'
                                ? 'bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-900/20 dark:text-blue-300 dark:border-blue-800'
                                : 'bg-gray-50 text-gray-700 border-gray-200 dark:bg-gray-800 dark:text-gray-300 dark:border-gray-700'
                            }
                          >
                            {user.sso_provider === 'azure'
                              ? 'Microsoft'
                              : user.sso_provider === 'okta'
                              ? 'Okta'
                              : user.sso_provider || user.auth_provider || 'Email'}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <div className="text-xs text-gray-500">
                            {user.market_code && <div>Market: {user.market_code}</div>}
                            {user.region_code && <div>Region: {user.region_code}</div>}
                            {user.branch_code && <div>Branch: {user.branch_code}</div>}
                            {!user.market_code && !user.region_code && !user.branch_code && '-'}
                          </div>
                        </TableCell>
                        <TableCell className="text-right">
                          <Dialog open={dialogOpen && editingUser?.id === user.id} onOpenChange={(open) => {
                            setDialogOpen(open)
                            if (!open) {
                              setEditingUser(null)
                              setNewRole(null)
                            }
                          }}>
                            <DialogTrigger asChild>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => {
                                  setEditingUser(user)
                                  setNewRole(user.role)
                                  setDialogOpen(true)
                                }}
                              >
                                <Edit2 className="h-4 w-4" />
                              </Button>
                            </DialogTrigger>
                            <DialogContent>
                              <DialogHeader>
                                <DialogTitle>Edit Role for {user.name}</DialogTitle>
                                <DialogDescription>
                                  Override the auto-detected role for this user.
                                </DialogDescription>
                              </DialogHeader>
                              <div className="space-y-4 py-4">
                                <div className="grid grid-cols-2 gap-4">
                                  <div>
                                    <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
                                      Email
                                    </label>
                                    <p className="text-sm text-gray-500">{user.email}</p>
                                  </div>
                                  <div>
                                    <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
                                      Employee #
                                    </label>
                                    <p className="text-sm text-gray-500">
                                      {user.employee_number || 'N/A'}
                                    </p>
                                  </div>
                                </div>
                                <div>
                                  <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
                                    Workday Job Title
                                  </label>
                                  <p className="text-sm text-gray-500">
                                    {user.workday_job_title || 'Not available'}
                                  </p>
                                </div>
                                <div>
                                  <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
                                    Auto-Detected Role
                                  </label>
                                  <p className="text-sm text-gray-500">
                                    {user.auto_detected_role
                                      ? ROLE_PERMISSIONS[user.auto_detected_role]?.label
                                      : 'Not detected'}
                                  </p>
                                </div>
                                <div>
                                  <label className="text-sm font-medium text-gray-700 dark:text-gray-300 block mb-2">
                                    New Role
                                  </label>
                                  <Select
                                    value={newRole || user.role}
                                    onValueChange={(v) => setNewRole(v as Role)}
                                  >
                                    <SelectTrigger>
                                      <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                      {ROLES.map((role) => (
                                        <SelectItem key={role} value={role}>
                                          {ROLE_PERMISSIONS[role]?.label || role}
                                        </SelectItem>
                                      ))}
                                    </SelectContent>
                                  </Select>
                                </div>
                                {user.role_override && user.role_override_by && (
                                  <div className="p-3 bg-orange-50 dark:bg-orange-900/20 rounded-lg text-sm">
                                    <p className="text-orange-700 dark:text-orange-300">
                                      Previously overridden by {user.role_override_by}
                                      {user.role_override_at && (
                                        <span className="block text-xs text-orange-500 mt-1">
                                          {new Date(user.role_override_at).toLocaleDateString()}
                                        </span>
                                      )}
                                    </p>
                                  </div>
                                )}
                              </div>
                              <DialogFooter className="flex gap-2">
                                {user.role_override && user.auto_detected_role && (
                                  <Button
                                    variant="outline"
                                    onClick={() => handleResetToAutoDetected(user.id)}
                                    disabled={saving}
                                  >
                                    Reset to Auto-Detected
                                  </Button>
                                )}
                                <Button
                                  onClick={() => newRole && handleRoleOverride(user.id, newRole)}
                                  disabled={saving || !newRole || newRole === user.role}
                                >
                                  {saving ? (
                                    <>
                                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                                      Saving...
                                    </>
                                  ) : (
                                    'Save Override'
                                  )}
                                </Button>
                              </DialogFooter>
                            </DialogContent>
                          </Dialog>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>

              {/* Pagination */}
              {totalPages > 1 && (
                <div className="flex items-center justify-between mt-4 pt-4 border-t">
                  <p className="text-sm text-gray-500">
                    Showing {(page - 1) * pageSize + 1} to{' '}
                    {Math.min(page * pageSize, filteredUsers.length)} of {filteredUsers.length} users
                  </p>
                  <div className="flex items-center gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setPage((p) => Math.max(1, p - 1))}
                      disabled={page === 1}
                    >
                      <ChevronLeft className="h-4 w-4" />
                    </Button>
                    <span className="text-sm text-gray-500">
                      Page {page} of {totalPages}
                    </span>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                      disabled={page === totalPages}
                    >
                      <ChevronRight className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              )}
            </>
          )}
        </CardContent>
      </Card>
    </div>
  )
}

// Main export with hydration guard to prevent SSR issues with useAuth
export default function AdminUsersPage() {
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
  }, [])

  if (!mounted) {
    return (
      <div className="flex items-center justify-center h-96">
        <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
      </div>
    )
  }

  return <AdminUsersPageContent />
}
