#!/bin/bash
#
# Clear Dev Mode Cache - Fixes "wrong people showing up" issue
#
# This script:
# 1. Stops the dev server
# 2. Clears Next.js cache
# 3. Displays instructions to clear browser localStorage
# 4. Restarts dev server
#

echo "==================================================================="
echo "  Clear Dev Mode Cache"
echo "==================================================================="
echo ""

# Stop any running dev servers
echo "1. Stopping any running Next.js dev servers..."
pkill -f "next dev" 2>/dev/null || echo "   No dev servers running"
sleep 2

# Clear Next.js cache
echo ""
echo "2. Clearing Next.js cache..."
rm -rf .next
echo "   ✓ Cleared .next directory"

# Instructions for browser cache
echo ""
echo "3. IMPORTANT: Clear browser localStorage to remove old preview state"
echo ""
echo "   Open your browser console (F12 or Cmd+Option+I) and run:"
echo ""
echo "   localStorage.removeItem('rentokil-bi-store')"
echo "   location.reload()"
echo ""
echo "   This removes persisted admin preview state that was showing"
echo "   wrong people (Nancy More, Andrew Taylor, Andrew Davis)"
echo ""

# Check env file
echo "4. Verifying .env.local settings..."
if grep -q "^NEXT_PUBLIC_DEV_USER_EMAIL=" .env.local 2>/dev/null; then
    DEV_EMAIL=$(grep "^NEXT_PUBLIC_DEV_USER_EMAIL=" .env.local | cut -d'=' -f2)
    echo "   ✓ DEV_USER_EMAIL is set to: $DEV_EMAIL"
else
    echo "   ⚠️  NEXT_PUBLIC_DEV_USER_EMAIL not found in .env.local"
    echo "   Set it to one of the 10 hardwired users to test roles"
fi

echo ""
echo "==================================================================="
echo "  Next Steps:"
echo "==================================================================="
echo ""
echo "1. Clear browser localStorage (see instructions above)"
echo "2. Run: npm run dev"
echo "3. Refresh browser"
echo "4. Verify correct user is shown in dashboard header"
echo ""
echo "To switch users, change NEXT_PUBLIC_DEV_USER_EMAIL in .env.local"
echo "and restart the dev server."
echo ""
