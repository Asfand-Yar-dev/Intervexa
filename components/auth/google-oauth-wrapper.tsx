"use client";

import { GoogleOAuthProvider } from "@react-oauth/google";

interface GoogleOAuthWrapperProps {
  children: React.ReactNode;
}

/**
 * Wrapper component for Google OAuth Provider
 * Only renders the provider if GOOGLE_CLIENT_ID is configured
 */
export function GoogleOAuthWrapper({ children }: GoogleOAuthWrapperProps) {
  const clientId = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID;

  // If no client ID is configured, just render children without the provider
  if (!clientId) {
    return <>{children}</>;
  }

  return (
    <GoogleOAuthProvider clientId={clientId}>
      {children}
    </GoogleOAuthProvider>
  );
}
