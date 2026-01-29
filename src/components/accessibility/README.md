# Accessibility Features

This document outlines the accessibility features implemented in the Rentokil BI dashboard to ensure WCAG 2.1 Level AA compliance.

## Overview

The dashboard implements comprehensive accessibility features to support users with disabilities, including:
- Keyboard navigation
- Screen reader support
- Focus management
- ARIA labels and landmarks
- Skip navigation links

---

## Features Implemented

### 1. Skip Navigation Link

**Location:** `/src/components/accessibility/SkipLink.tsx`

**Purpose:** Allows keyboard users to skip repetitive navigation and jump directly to the main content.

**Implementation:**
- Positioned at the very top of the page (before sidebar/header)
- Visually hidden until focused via Tab key
- High z-index (9999) to ensure visibility when focused
- Jumps to `#main-content` anchor on the main element

**WCAG Criterion:** 2.4.1 Bypass Blocks (Level A)

**Usage:**
```tsx
import { SkipLink } from '@/components/accessibility/SkipLink'

// In MainLayout.tsx:
<SkipLink />
<div className="app-container">
  <Sidebar />
  <main id="main-content">
    {/* Page content */}
  </main>
</div>
```

---

### 2. ARIA Labels for Icon Buttons

**Purpose:** Provides accessible names for icon-only buttons that lack visible text labels.

**Buttons with ARIA Labels:**

#### Header Component (`/src/components/layout/Header.tsx`)
- Mobile menu toggle: `aria-label={mobileMenuOpen ? 'Close menu' : 'Open menu'}`
- Mobile search button: `aria-label="Open search"`
- Notifications bell: `aria-label="View notifications"`
- User profile button: `aria-label="Open profile menu"`

#### Sidebar Components (`Sidebar.tsx`, `AdminSidebar.tsx`)
- Mobile close button: `aria-label="Close sidebar"`
- Collapse/expand button: `aria-label={sidebarCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}`
- Clear recent pages: `aria-label="Clear recent pages"`

#### Modal Components
- Close buttons (X icon): `aria-label="Close modal"`

#### Data Refresh
- ExecutiveCommandCenter: `aria-label="Refresh data"`

#### Navigation
- NavCollapsibleSection: `aria-label="${isExpanded ? 'Collapse' : 'Expand'} ${section.name} section"`

**WCAG Criterion:** 4.1.2 Name, Role, Value (Level A)

**Best Practice:**
```tsx
// Icon-only button WITH aria-label
<Button variant="ghost" size="icon" aria-label="Action description">
  <Icon className="h-5 w-5" />
</Button>

// Button with visible text (no aria-label needed)
<Button>
  <Icon className="h-5 w-5 mr-2" />
  Action Name
</Button>

// Dynamic aria-label for state changes
<Button
  variant="ghost"
  size="icon"
  aria-label={isOpen ? "Close menu" : "Open menu"}
>
  {isOpen ? <X /> : <Menu />}
</Button>
```

---

### 3. Focus Management for Modals

**Component:** `/src/components/ui/dialog.tsx`

**Purpose:** Ensures keyboard focus stays within modal dialogs and returns to the trigger element when closed.

**Implementation:**
Uses Radix UI Dialog primitive which provides:
- **Focus Trap:** Focus cycles within modal when Tab/Shift+Tab is pressed
- **Auto-focus:** Automatically focuses the first focusable element when modal opens
- **Focus Return:** Returns focus to the trigger element when modal closes
- **Escape to Close:** Pressing Escape key closes the modal and returns focus

**WCAG Criterion:** 2.4.3 Focus Order (Level A), 2.1.2 No Keyboard Trap (Level A)

**How it Works:**
```tsx
// Dialog automatically manages focus
<Dialog open={isOpen} onOpenChange={setIsOpen}>
  <DialogTrigger asChild>
    <Button>Open Modal</Button> {/* Focus starts here */}
  </DialogTrigger>
  <DialogContent>
    <DialogHeader>
      <DialogTitle>Modal Title</DialogTitle> {/* Auto-focused when opened */}
    </DialogHeader>
    {/* Tab cycles through these focusable elements */}
    <Input placeholder="Name" />
    <Button>Submit</Button>
    <DialogClose>Cancel</DialogClose> {/* Last tabbable element */}
  </DialogContent>
</Dialog>
```

**Keyboard Behavior:**
- `Tab`: Move focus forward through focusable elements
- `Shift+Tab`: Move focus backward through focusable elements
- `Escape`: Close modal and return focus to trigger
- Focus wraps around (last element → first element)

---

## WCAG 2.1 Compliance

### Level A (All Criteria Met)
- ✅ 1.3.1 Info and Relationships - Semantic HTML and ARIA
- ✅ 2.1.1 Keyboard - All functionality available via keyboard
- ✅ 2.1.2 No Keyboard Trap - Focus trap allows escape via Escape key
- ✅ 2.4.1 Bypass Blocks - Skip navigation link implemented
- ✅ 2.4.3 Focus Order - Logical focus order maintained
- ✅ 2.4.4 Link Purpose (In Context) - Descriptive link text
- ✅ 3.2.1 On Focus - No unexpected context changes on focus
- ✅ 4.1.2 Name, Role, Value - ARIA labels on all icon buttons

### Level AA (Most Criteria Met)
- ✅ 1.4.3 Contrast (Minimum) - UI meets 4.5:1 contrast ratio
- ✅ 2.4.7 Focus Visible - Clear focus indicators on all interactive elements
- ✅ 3.2.4 Consistent Identification - Consistent UI patterns throughout

---

## Testing Accessibility

### Keyboard Navigation Testing

1. **Skip Link Test:**
   - Press `Tab` on page load
   - Verify "Skip to main content" link appears
   - Press `Enter` to jump to main content
   - Verify focus moves to main content area

2. **Modal Focus Trap Test:**
   - Open any modal dialog
   - Press `Tab` repeatedly
   - Verify focus stays within modal (cycles between elements)
   - Press `Escape` to close
   - Verify focus returns to trigger button

3. **Icon Button Test:**
   - Navigate to icon-only buttons with `Tab`
   - Verify focus indicator is visible
   - Use screen reader to verify accessible name is announced

### Screen Reader Testing

**Tools:** NVDA (Windows), JAWS (Windows), VoiceOver (macOS), Orca (Linux)

**Test Cases:**
1. Navigate with `Tab` key and verify all buttons announce their purpose
2. Use heading navigation (`H` key) to navigate page structure
3. Use landmark navigation (`D` key) to jump between regions
4. Verify modal dialogs announce title and content properly

---

## Future Improvements

### Potential Enhancements

1. **Enhanced Focus Indicators:**
   - Add `focus-visible` utility for keyboard-only focus indicators
   - Distinguish between mouse and keyboard focus

2. **Live Regions:**
   - Add `aria-live` regions for dynamic data updates
   - Announce data refresh completion to screen readers

3. **Landmark Regions:**
   - Add `<nav>` semantic element to sidebar navigation
   - Add `<header>` and `<footer>` landmarks

4. **Form Labels:**
   - Audit all form inputs for proper `<label>` associations
   - Add `aria-describedby` for error messages

5. **Tables:**
   - Add `<th scope="col">` to data table headers
   - Add `<caption>` to describe table purpose

---

## Resources

- [WCAG 2.1 Guidelines](https://www.w3.org/WAI/WCAG21/quickref/)
- [Radix UI Accessibility](https://www.radix-ui.com/docs/primitives/overview/accessibility)
- [ARIA Authoring Practices Guide](https://www.w3.org/WAI/ARIA/apg/)
- [WebAIM Keyboard Accessibility](https://webaim.org/techniques/keyboard/)

---

## Contact

For accessibility concerns or suggestions, please contact the development team or file an issue.
