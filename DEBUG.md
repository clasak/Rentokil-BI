# Debugging: "Objects are not valid as a React child" Error

## What This Error Means
React is trying to render an object (like `{ value: something }`) directly in JSX, but React can only render:
- Strings
- Numbers
- JSX elements
- Arrays of the above

## How to Find the Problem

### Step 1: Check the Browser Console
The error in your browser console will show a component stack trace like:
```
at div
at PageHeader (PageHeader.tsx:33)
at MyPage (page.tsx:120)
```

This tells you exactly which component and line is causing the issue.

### Step 2: Common Causes

1. **Rendering an object directly**:
   ```tsx
   // ❌ WRONG
   <div>{someObject}</div>

   // ✅ CORRECT
   <div>{someObject.value}</div>
   ```

2. **Map/forEach returning objects instead of JSX**:
   ```tsx
   // ❌ WRONG
   {items.map(item => item)}  // if item is an object

   // ✅ CORRECT
   {items.map(item => <div key={item.id}>{item.name}</div>)}
   ```

3. **Select/Option values that are objects**:
   ```tsx
   // ❌ WRONG
   <SelectValue>{selectedValue}</SelectValue>  // if selectedValue is an object

   // ✅ CORRECT
   <SelectValue placeholder="Select..."/>  // Let the Select component handle rendering
   ```

4. **Accidentally rendering state objects**:
   ```tsx
   // ❌ WRONG
   <div>{formData}</div>  // formData is an object

   // ✅ CORRECT
   <div>{formData.fieldName}</div>
   ```

## Quick Solution

**Based on the error mentioning `{value}`, check for**:

1. **SelectValue components** - Make sure you're using them correctly with placeholder text, not passing objects as children

2. **Chart tooltip content** - Recharts tooltips should access `payload[0].value`, not render the payload object directly

3. **Form values** - If using react-hook-form or similar, make sure you're extracting the actual value, not the field object

## To Find It Now:

1. Look at the browser console for the full error stack
2. The last component in the stack (before React internals) is your culprit
3. Check that line for any `{variable}` that might be an object

## Common Fix Patterns:

```tsx
// Pattern 1: Select components
<SelectValue placeholder="Select an option" />  // Not <SelectValue>{value}</SelectValue>

// Pattern 2: Rendering data
<div>{data?.name || 'N/A'}</div>  // Not <div>{data}</div>

// Pattern 3: Arrays/objects
{items.map(item => <div key={item.id}>{item.name}</div>)}  // Not {items}
```
