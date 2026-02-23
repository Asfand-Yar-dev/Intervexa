import { clsx, type ClassValue } from 'clsx'
import { twMerge } from 'tailwind-merge'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

/**
 * Sanitizes user input by escaping HTML characters to prevent XSS attacks
 * This is a basic client-side protection layer
 * Safe for both client and server-side rendering
 */
export function sanitizeInput(input: string): string {
  // SSR-safe: check if we're in browser environment
  if (typeof window !== 'undefined' && typeof document !== 'undefined') {
    const div = document.createElement('div')
    div.textContent = input
    return div.innerHTML
  }
  // Fallback for SSR: basic string escaping
  return input
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;')
}

/**
 * Validates email format
 */
export function isValidEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
  return emailRegex.test(email)
}
