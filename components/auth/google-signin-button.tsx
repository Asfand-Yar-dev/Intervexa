"use client";

import { useState, useEffect } from "react";
import { useGoogleLogin } from "@react-oauth/google";
import { Loader2 } from "lucide-react";
import { motion } from "framer-motion";
import { toast } from "sonner";

interface GoogleSignInButtonProps {
  mode: "login" | "signup";
  onSuccess: (accessToken: string) => Promise<void>;
  disabled?: boolean;
}

/**
 * Custom styled Google Sign-In button using useGoogleLogin hook.
 * This component must be used within a GoogleOAuthProvider context.
 */
export function GoogleSignInButton({ mode, onSuccess, disabled }: GoogleSignInButtonProps) {
  const [isLoading, setIsLoading] = useState(false);

  // Debug: Log when component mounts
  useEffect(() => {
    console.log("[GoogleSignInButton] Component mounted");
    console.log("[GoogleSignInButton] Client ID:", process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID ? "Set ✓" : "NOT SET ✗");
  }, []);

  const googleLogin = useGoogleLogin({
    onSuccess: async (codeResponse) => {
      console.log("[GoogleSignInButton] Success! Got code response:", codeResponse);
      setIsLoading(true);
      try {
        // auth-code flow returns authorization code
        // We send this to our backend which exchanges it for tokens
        await onSuccess(codeResponse.code);
      } catch (error) {
        console.error("[GoogleSignInButton] sign-in error:", error);
      } finally {
        setIsLoading(false);
      }
    },
    onError: (error) => {
      console.error("[GoogleSignInButton] OAuth error:", error);
      toast.error("Google Sign-In Failed", {
        description: "Could not connect to Google. Please try again.",
      });
    },
    // Use authorization code flow with popup mode
    // This avoids FedCM issues
    flow: "auth-code",
    ux_mode: "popup",
  });

  const handleClick = () => {
    console.log("[GoogleSignInButton] Button clicked, triggering Google login...");
    try {
      googleLogin();
    } catch (error) {
      console.error("[GoogleSignInButton] Error triggering googleLogin:", error);
      toast.error("Error", {
        description: "Failed to open Google sign-in. Check console for details.",
      });
    }
  };

  return (
    <motion.button
      type="button"
      onClick={handleClick}
      disabled={disabled || isLoading}
      className="w-full h-12 flex items-center justify-center gap-3 rounded-lg border border-border/50 bg-secondary/30 text-foreground font-medium transition-all duration-200 hover:bg-secondary hover:border-accent/50 hover:shadow-lg hover:shadow-accent/10 focus:outline-none focus:ring-2 focus:ring-accent/50 focus:ring-offset-2 focus:ring-offset-background disabled:opacity-50 disabled:cursor-not-allowed"
      whileHover={{ scale: 1.01, y: -1 }}
      whileTap={{ scale: 0.99 }}
    >
      {isLoading ? (
        <>
          <Loader2 className="h-5 w-5 animate-spin text-accent" />
          <span>Signing in with Google...</span>
        </>
      ) : (
        <>
          {/* Colorful Google Icon */}
          <svg className="h-5 w-5" viewBox="0 0 24 24">
            <path
              fill="#4285F4"
              d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
            />
            <path
              fill="#34A853"
              d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
            />
            <path
              fill="#FBBC05"
              d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
            />
            <path
              fill="#EA4335"
              d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
            />
          </svg>
          <span>{mode === "login" ? "Continue with Google" : "Sign up with Google"}</span>
        </>
      )}
    </motion.button>
  );
}

