"use client"

import { Suspense } from "react"
import { HistoryContent } from "@/components/dashboard/history-content"
import { DashboardLayout } from "@/components/dashboard/dashboard-layout"
import { Loader2 } from "lucide-react"
import { useAuth } from "@/hooks/use-auth"

export default function HistoryPage() {
  const { isAuthenticated, isLoading: authLoading } = useAuth();

  // Show loading while checking auth
  if (authLoading) {
    return (
      <DashboardLayout>
        <div className="flex h-[60vh] items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-accent" />
        </div>
      </DashboardLayout>
    );
  }

  // Don't render if not authenticated
  if (!isAuthenticated) {
    return null;
  }

  return (
    <DashboardLayout>
      <Suspense
        fallback={
          <div className="flex h-[60vh] items-center justify-center">
            <Loader2 className="h-8 w-8 animate-spin text-accent" />
          </div>
        }
      >
        <HistoryContent />
      </Suspense>
    </DashboardLayout>
  )
}
