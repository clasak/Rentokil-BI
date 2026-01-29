'use client'

import { useState, useEffect } from 'react'
import { useAppStore } from '@/store'
import type { Role, User } from '@/types'
import type { EmployeeRecord } from '@/lib/bigquery/queries/employee'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Loader2, User as UserIcon, Building2, MapPin } from 'lucide-react'

interface RolePreviewSelectorProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  selectedRole: Role | null
}

// Role display names
const ROLE_LABELS: Record<Role, string> = {
  exec: 'Executive',
  market_vp: 'Market VP',
  market_sales_director: 'Market Sales Director',
  region_director: 'Region Director',
  region_sales_manager: 'Region Sales Manager',
  manager: 'Branch Manager',
  sales_manager: 'Sales Manager',
  ops_manager: 'Operations Manager',
  rep: 'Account Executive',
  technician: 'Technician',
}

/**
 * RolePreviewSelector - Admin component to select a specific employee when previewing a role
 *
 * When an admin wants to "preview as Region Director", this dialog:
 * 1. Fetches all employees with Region Director job titles from BigQuery
 * 2. Lets admin select a specific person (e.g., "John Smith - South Region")
 * 3. Sets that person's scope for all queries
 */
export function RolePreviewSelector({
  open,
  onOpenChange,
  selectedRole,
}: RolePreviewSelectorProps) {
  const { setPreviewedEmployee, setPreviewingRole } = useAppStore()
  const [employees, setEmployees] = useState<EmployeeRecord[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [selectedEmployeeId, setSelectedEmployeeId] = useState<string | null>(null)

  // Fetch employees when role changes
  useEffect(() => {
    if (!open || !selectedRole) {
      setEmployees([])
      setSelectedEmployeeId(null)
      return
    }

    async function fetchEmployees() {
      setIsLoading(true)
      setError(null)

      try {
        // DEV MODE: Use hardwired dev role mappings instead of BigQuery
        if (process.env.NODE_ENV !== 'production') {
          const { DEV_ROLE_MAPPINGS } = await import('@/lib/dev-role-mappings')

          // Filter dev mappings to only show users with the selected role
          const devEmployees: EmployeeRecord[] = Object.entries(DEV_ROLE_MAPPINGS)
            .filter(([_, mapping]) => mapping.role === selectedRole)
            .map(([email, mapping]) => ({
              employee_number: `dev-${email.replace(/[^a-zA-Z0-9]/g, '-')}`,
              full_name: mapping.name,
              first_name: mapping.name.split(' ')[0],
              last_name: mapping.name.split(' ').slice(1).join(' '),
              email: email,
              job_title: ROLE_LABELS[mapping.role],
              job_code: mapping.role,
              market: mapping.assignedMarkets[0] || '',
              market_code: mapping.assignedMarkets[0] || '',
              region: mapping.assignedRegions[0] || '',
              region_code: mapping.assignedRegions[0] || '',
              branch: mapping.assignedBranches[0] || '',
              branch_code: mapping.assignedBranches[0] || '',
              branch_name: mapping.assignedBranches[0] || '',
              division: mapping.assignedMarkets[0] || '',
              supervisor_name: 'Dev Mode',
              supervisor_id: 'dev-supervisor',
              status: 'Active',
              hire_date: new Date().toISOString(),
            }))

          console.log(`[RolePreviewSelector] DEV MODE: Found ${devEmployees.length} dev employees for role ${selectedRole}`, devEmployees)
          setEmployees(devEmployees)
          setIsLoading(false)
          return
        }

        // PRODUCTION: Query BigQuery for real employees
        const response = await fetch('/api/bigquery/query', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            query: 'employees-by-role',
            filters: { role: selectedRole },
          }),
        })

        const result = await response.json()

        if (result.success && result.data) {
          setEmployees(result.data)
        } else {
          setError(result.error || 'Failed to load employees')
          setEmployees([])
        }
      } catch (err) {
        setError('Network error - could not fetch employees')
        setEmployees([])
      } finally {
        setIsLoading(false)
      }
    }

    fetchEmployees()
  }, [open, selectedRole])

  const handleConfirm = () => {
    if (!selectedEmployeeId || !selectedRole) return

    const employee = employees.find((e) => e.employee_number === selectedEmployeeId)
    if (!employee) return

    // Convert EmployeeRecord to User type
    const previewUser: User = {
      id: employee.employee_number,
      name: employee.full_name,
      email: employee.email,
      role: selectedRole,
      title: employee.job_title,
      assignedMarkets: employee.market_code ? [employee.market_code] : [],
      assignedRegions: employee.region_code ? [employee.region_code] : [],
      assignedBranches: employee.branch_code ? [employee.branch_code] : [],
      assignedTeams: [],
    }

    setPreviewedEmployee(previewUser)
    onOpenChange(false)
  }

  const handleSkip = () => {
    // Just preview the role without selecting a specific employee
    if (selectedRole) {
      setPreviewingRole(selectedRole)
    }
    onOpenChange(false)
  }

  const selectedEmployee = employees.find((e) => e.employee_number === selectedEmployeeId)

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <UserIcon className="h-5 w-5" />
            Preview as {selectedRole ? ROLE_LABELS[selectedRole] : 'Role'}
          </DialogTitle>
          <DialogDescription>
            Select a specific employee to view the dashboard as they would see it,
            with their assigned scope (markets, regions, branches).
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {isLoading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
              <span className="ml-2 text-muted-foreground">Loading employees...</span>
            </div>
          ) : error ? (
            <div className="rounded-lg border border-destructive/50 bg-destructive/10 p-4 text-sm text-destructive">
              {error}
            </div>
          ) : employees.length === 0 ? (
            <div className="rounded-lg border border-muted bg-muted/50 p-4 text-center text-sm text-muted-foreground">
              No employees found with this role.
              <br />
              You can still preview the role with generic scope.
            </div>
          ) : (
            <>
              <div className="space-y-2">
                <label className="text-sm font-medium">Select Employee</label>
                <Select
                  value={selectedEmployeeId || ''}
                  onValueChange={setSelectedEmployeeId}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Choose an employee to preview as..." />
                  </SelectTrigger>
                  <SelectContent className="max-h-[300px]">
                    {employees
                      .filter((emp) => emp.employee_number && emp.employee_number.trim() !== '')
                      .map((emp) => (
                        <SelectItem key={emp.employee_number} value={emp.employee_number}>
                          <div className="flex items-center gap-2">
                            <span className="font-medium">{emp.full_name}</span>
                            <span className="text-muted-foreground">-</span>
                            <span className="text-sm text-muted-foreground">
                              {emp.region || emp.branch || emp.market || 'No location'}
                            </span>
                          </div>
                        </SelectItem>
                      ))}
                  </SelectContent>
                </Select>
              </div>

              {selectedEmployee && (
                <div className="rounded-lg border bg-muted/50 p-4 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="font-medium">{selectedEmployee.full_name}</span>
                    <Badge variant="secondary">{selectedEmployee.job_title}</Badge>
                  </div>
                  <div className="flex flex-wrap gap-2 text-sm">
                    {selectedEmployee.market && (
                      <div className="flex items-center gap-1 text-muted-foreground">
                        <MapPin className="h-3 w-3" />
                        {selectedEmployee.market}
                      </div>
                    )}
                    {selectedEmployee.region && (
                      <div className="flex items-center gap-1 text-muted-foreground">
                        <Building2 className="h-3 w-3" />
                        {selectedEmployee.region}
                      </div>
                    )}
                    {selectedEmployee.branch && (
                      <div className="flex items-center gap-1 text-muted-foreground">
                        <Building2 className="h-3 w-3" />
                        Branch: {selectedEmployee.branch}
                      </div>
                    )}
                  </div>
                  <p className="text-xs text-muted-foreground mt-2">
                    Data will be filtered to show only what this employee would see.
                  </p>
                </div>
              )}
            </>
          )}
        </div>

        <div className="flex justify-end gap-2">
          <Button variant="outline" onClick={handleSkip}>
            {employees.length === 0 ? 'Preview Role' : 'Skip (View All)'}
          </Button>
          <Button
            onClick={handleConfirm}
            disabled={!selectedEmployeeId || isLoading}
          >
            Preview as {selectedEmployee?.full_name?.split(' ')[0] || 'Employee'}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
