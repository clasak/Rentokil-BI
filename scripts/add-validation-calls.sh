#!/bin/bash
# Add validateAEOptions calls to remaining AE functions

FILE="src/lib/bigquery/queries/ae.ts"

# Create a backup
cp "$FILE" "$FILE.bak"

# List of function names (excluding the two already done: getAEPipeline, getAETracker)
FUNCTIONS=(
  "getTechTickets"
  "getTechDispatch"
  "getAECategoryBreakdown"
  "getAEMonthlyProgression"
  "getAETrackerTotals"
  "getAECompensationSummary"
  "getAESalesDetails"
  "getAESalesPersonList"
  "getAEMonthlyCompensation"
  "getNewStartLogEntries"
  "getNewStartLogSummary"
  "getSalesforceOpportunities"
  "getSalesforceQuotes"
  "getAEIntegratedDashboard"
  "getMonthlyTotalsDetail"
  "getIRISNationalAccounts"
  "getIRISNationalAccountSummary"
)

for func in "${FUNCTIONS[@]}"; do
  echo "Adding validation to $func..."

  # Use perl for multi-line regex replacement
  perl -i -pe "
    if (/export async function $func/) {
      \$found = 1;
    }
    if (\$found && /^  const \\{/) {
      s/^  const/  validateAEOptions(options, '$func')\n  const/;
      \$found = 0;
    }
  " "$FILE"
done

echo "✅ All validation calls added!"
echo "Check $FILE.bak for backup"
