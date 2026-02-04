'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'

/**
 * Simple auth check hook for protected routes.
 * Checks if user has logged in by verifying localStorage values.
 * Redirects to login if not authenticated.
 * 
 * TODO: Replace with proper JWT/session authentication when backend is ready
 */
export function useAuth() {
  const router = useRouter()
  const [isAuthenticated, setIsAuthenticated] = useState<boolean | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    // Check for auth indicators in localStorage
    const userEmail = localStorage.getItem('aiInterviewUserEmail')
    
    if (userEmail) {
      setIsAuthenticated(true)
    } else {
      setIsAuthenticated(false)
      // Redirect to login after a brief delay to allow state update
      router.push('/login')
    }
    
    setIsLoading(false)
  }, [router])

  return { isAuthenticated, isLoading }
}

/**
 * Get current user info from localStorage
 */
export function useCurrentUser() {
  const [user, setUser] = useState<{ name: string; email: string } | null>(null)

  useEffect(() => {
    const name = localStorage.getItem('aiInterviewUserName') || ''
    const email = localStorage.getItem('aiInterviewUserEmail') || ''
    
    if (email) {
      setUser({ name, email })
    }
  }, [])

  return user
}
