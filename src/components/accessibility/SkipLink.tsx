"use client"

/**
 * Skip Navigation Link
 *
 * Provides keyboard users with a way to skip repetitive navigation
 * and jump directly to the main content area.
 *
 * - Visually hidden until focused via keyboard (Tab key)
 * - Positioned at the very top of the page
 * - High z-index to ensure visibility when focused
 * - Meets WCAG 2.1 Level A success criterion 2.4.1
 */
export function SkipLink() {
  return (
    <a
      href="#main-content"
      className="sr-only focus:not-sr-only focus:absolute focus:top-4 focus:left-4 focus:z-[9999] focus:px-4 focus:py-2 focus:bg-primary focus:text-white focus:rounded focus:shadow-lg focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2"
    >
      Skip to main content
    </a>
  )
}
