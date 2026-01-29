#!/usr/bin/env tsx

/**
 * Quick script to lookup employee supervisor information
 * Usage: npx tsx scripts/lookup-employee.ts "JESUS" "CORRAL"
 */

import { getEmployeeByName } from '../src/lib/bigquery/queries/employee'

async function main() {
  const firstName = process.argv[2] || 'JESUS'
  const lastName = process.argv[3] || 'CORRAL'

  console.log(`Looking up employee: ${firstName} ${lastName}...\n`)

  try {
    const employee = await getEmployeeByName(firstName, lastName)

    if (!employee) {
      console.log('❌ Employee not found')
      return
    }

    console.log('✅ Employee Found:')
    console.log('─────────────────────────────────────')
    console.log(`Name:             ${employee.full_name}`)
    console.log(`Employee Number:  ${employee.employee_number}`)
    console.log(`Job Title:        ${employee.job_title}`)
    console.log(`Branch:           ${employee.branch_name} (${employee.branch_code})`)
    console.log(`Region:           ${employee.region}`)
    console.log(`Market:           ${employee.market}`)
    console.log(`Email:            ${employee.email}`)
    console.log(`\n👤 SUPERVISOR/MANAGER:`)
    console.log(`─────────────────────────────────────`)
    console.log(`Name:             ${employee.supervisor_name || 'Not assigned'}`)
    console.log(`Supervisor ID:    ${employee.supervisor_id || 'N/A'}`)

    // If supervisor info exists, look up the supervisor's details
    if (employee.supervisor_name) {
      const supervisorNames = employee.supervisor_name.split(',').map(s => s.trim())
      if (supervisorNames.length === 2) {
        const [supervisorLast, supervisorFirst] = supervisorNames
        console.log(`\nLooking up supervisor details...`)

        const supervisor = await getEmployeeByName(supervisorFirst, supervisorLast)
        if (supervisor) {
          console.log(`\n📋 SUPERVISOR DETAILS:`)
          console.log(`─────────────────────────────────────`)
          console.log(`Name:             ${supervisor.full_name}`)
          console.log(`Job Title:        ${supervisor.job_title}`)
          console.log(`Branch:           ${supervisor.branch_name}`)
          console.log(`Email:            ${supervisor.email}`)
        }
      }
    }

  } catch (error) {
    console.error('❌ Error looking up employee:', error)
    process.exit(1)
  }
}

main()
