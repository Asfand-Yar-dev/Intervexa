"use client";

import { useEffect, useState } from "react";
import { DashboardLayout } from "@/components/dashboard/dashboard-layout";
import { StatsCards } from "@/components/dashboard/stats-cards";
import { RecentSessions } from "@/components/dashboard/recent-sessions";
import { QuickActions } from "@/components/dashboard/quick-actions";
import { mockApi, type InterviewSession } from "@/lib/mock-api";
import { motion } from "framer-motion";
import { Loader2 } from "lucide-react";
import { useAuth } from "@/hooks/use-auth";

export default function DashboardPage() {
  const { isAuthenticated, isLoading: authLoading } = useAuth();
  const [isLoading, setIsLoading] = useState(true);
  const [userName, setUserName] = useState("");
  const [stats, setStats] = useState({
    totalInterviews: 0,
    averageScore: 0,
    confidenceImprovement: 0,
    recentSessions: [] as InterviewSession[],
  });

  useEffect(() => {
    async function loadDashboard() {
      // Wait for auth check to complete
      if (authLoading) return;
      
      // Only load data if authenticated
      if (!isAuthenticated) {
        setIsLoading(false);
        return;
      }
      
      try {
        // TODO: Replace with actual API call
        const data = await mockApi.getDashboardStats();
        setStats(data);
      } catch (error) {
        console.error("Failed to load dashboard:", error);
      } finally {
        setIsLoading(false);
      }
    }
    loadDashboard();
  }, [authLoading, isAuthenticated]);

  useEffect(() => {
    const storedName =
      typeof window !== "undefined"
        ? localStorage.getItem("aiInterviewUserName")
        : null;
    if (storedName) {
      setUserName(storedName);
    }
  }, []);

  // Show loading while checking auth or loading data
  if (authLoading || isLoading) {
    return (
      <DashboardLayout>
        <div className="flex h-[60vh] items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-accent" />
        </div>
      </DashboardLayout>
    );
  }

  // Don't render if not authenticated (redirect is happening)
  if (!isAuthenticated) {
    return null;
  }

  return (
    <DashboardLayout>
      <div className="space-y-8">
        {/* Welcome Header */}
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
        >
          <h1 className="text-3xl font-bold text-foreground">
            {userName ? `Welcome back, ${userName}` : "Welcome back"}
          </h1>
          <p className="text-muted-foreground mt-1">
            Ready to practice? Your interview skills are improving every day.
          </p>
        </motion.div>

        {/* Stats Cards */}
        <StatsCards
          totalInterviews={stats.totalInterviews}
          averageScore={stats.averageScore}
          confidenceImprovement={stats.confidenceImprovement}
        />

        {/* Main Content Grid */}
        <div className="grid gap-6 lg:grid-cols-3">
          <div className="lg:col-span-2">
            <RecentSessions sessions={stats.recentSessions} />
          </div>
          <div>
            <QuickActions />
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}
