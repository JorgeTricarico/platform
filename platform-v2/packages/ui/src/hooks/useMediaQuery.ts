import { useState, useEffect } from 'react'

/**
 * Tracks whether a CSS media query matches the current viewport.
 * Returns `false` during SSR (no window available).
 *
 * @param query - A valid CSS media query string
 * @returns `true` if the query matches, `false` otherwise
 *
 * @example
 * const isMobile = useMediaQuery('(max-width: 767px)')
 * const prefersReducedMotion = useMediaQuery('(prefers-reduced-motion: reduce)')
 * const isDark = useMediaQuery('(prefers-color-scheme: dark)')
 */
export function useMediaQuery(query: string): boolean {
  const [matches, setMatches] = useState<boolean>(() => {
    // Safe SSR: window is unavailable during server-side rendering
    if (typeof window === 'undefined') return false
    return window.matchMedia(query).matches
  })

  useEffect(() => {
    if (typeof window === 'undefined') return

    const mediaQueryList = window.matchMedia(query)

    // Set initial value (handles hydration mismatch)
    setMatches(mediaQueryList.matches)

    const handleChange = (event: MediaQueryListEvent) => {
      setMatches(event.matches)
    }

    // Use addEventListener with fallback for older Safari
    if (mediaQueryList.addEventListener) {
      mediaQueryList.addEventListener('change', handleChange)
      return () => mediaQueryList.removeEventListener('change', handleChange)
    } else {
      // Deprecated but needed for Safari < 14
      mediaQueryList.addListener(handleChange)
      return () => mediaQueryList.removeListener(handleChange)
    }
  }, [query])

  return matches
}

// ---------------------------------------------------------------------------
// Preset breakpoints (Tailwind-compatible)
// ---------------------------------------------------------------------------

/** Returns true when viewport width < 640px (Tailwind's `sm` breakpoint) */
export const useIsXs = () => useMediaQuery('(max-width: 639px)')

/** Returns true when viewport width < 768px (Tailwind's `md` breakpoint) */
export const useIsMobile = () => useMediaQuery('(max-width: 767px)')

/** Returns true when viewport width >= 768px */
export const useIsTabletOrDesktop = () => useMediaQuery('(min-width: 768px)')

/** Returns true when viewport width >= 1024px (Tailwind's `lg` breakpoint) */
export const useIsDesktop = () => useMediaQuery('(min-width: 1024px)')

/** Returns true when user prefers reduced motion */
export const usePrefersReducedMotion = () =>
  useMediaQuery('(prefers-reduced-motion: reduce)')

/** Returns true when user prefers dark color scheme */
export const usePrefersDarkMode = () =>
  useMediaQuery('(prefers-color-scheme: dark)')
