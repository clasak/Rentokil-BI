#!/bin/bash

# Simple script to wrap query functions with try-catch
# This is a manual guidance script - shows which files need updating

echo "Files WITHOUT try-catch blocks:"
echo "================================"

for file in /Users/codylytle/Rentokil-BI/Rentokil-BI/src/lib/bigquery/queries/*.ts; do
  basename=$(basename "$file")
  
  # Skip index and calculators
  if [[ "$basename" == "index.ts" ]] || [[ "$basename" == "field-calculators.ts" ]] || [[ "$basename" == "lead-service-transformers.ts" ]]; then
    continue
  fi
  
  # Check if file has try-catch
  if ! grep -q "} catch (error)" "$file"; then
    echo "  - $basename"
  fi
done

echo ""
echo "These files need try-catch blocks added to all async functions."
