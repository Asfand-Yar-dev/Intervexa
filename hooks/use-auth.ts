'use client'

/**
 * Re-export auth hooks from the auth context for backward compatibility.
 * 
 * This file provides backward compatibility with the old hook-based auth system.
 * New code should import directly from '@/contexts/auth-context'.
 */

export { useAuth, useCurrentUser, useRequireAuth } from '@/contexts/auth-context';
