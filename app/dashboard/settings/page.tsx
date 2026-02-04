"use client";

import { useEffect, useState } from "react";
import { DashboardLayout } from "@/components/dashboard/dashboard-layout";
import { motion } from "framer-motion";
import { User, Bell, Shield, Palette, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { useAuth } from "@/hooks/use-auth";

export default function SettingsPage() {
  const { isAuthenticated, isLoading: authLoading } = useAuth();
  const [notifications, setNotifications] = useState({
    email: true,
    practice: false,
    tips: true,
  });

  const [profile, setProfile] = useState({
    name: "",
    email: "",
  });

  useEffect(() => {
    const storedName =
      typeof window !== "undefined"
        ? localStorage.getItem("aiInterviewUserName")
        : null;
    const storedEmail =
      typeof window !== "undefined"
        ? localStorage.getItem("aiInterviewUserEmail")
        : null;
    setProfile({
      name: storedName || "",
      email: storedEmail || "",
    });

    // Load notification settings from localStorage
    if (typeof window !== "undefined") {
      const storedNotifications = localStorage.getItem("aiInterviewNotificationSettings");
      if (storedNotifications) {
        try {
          setNotifications(JSON.parse(storedNotifications));
        } catch (e) {
          console.error("Failed to parse notification settings", e);
        }
      }
    }
  }, []);

  const handleProfileChange = (key: "name" | "email", value: string) => {
    setProfile((prev) => ({ ...prev, [key]: value }));
  };

  const handleSaveProfile = () => {
    if (typeof window === "undefined") return;
    const trimmedName = profile.name.trim();
    const trimmedEmail = profile.email.trim();
    if (trimmedName) localStorage.setItem("aiInterviewUserName", trimmedName);
    if (trimmedEmail)
      localStorage.setItem("aiInterviewUserEmail", trimmedEmail);
  };

  const handleNotificationChange = (key: keyof typeof notifications) => {
    const newNotifications = { ...notifications, [key]: !notifications[key] };
    setNotifications(newNotifications);
    // Save to localStorage
    if (typeof window !== "undefined") {
      localStorage.setItem("aiInterviewNotificationSettings", JSON.stringify(newNotifications));
    }
  };

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
      <div className="max-w-3xl space-y-8">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
        >
          <h1 className="text-3xl font-bold text-foreground">Settings</h1>
          <p className="text-muted-foreground mt-1">
            Manage your account preferences and settings
          </p>
        </motion.div>

        {/* Profile Section */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.1 }}
          className="rounded-2xl border border-border/50 bg-card p-6"
        >
          <div className="flex items-center gap-3 mb-6">
            <div className="rounded-xl bg-accent/10 p-2">
              <User className="h-5 w-5 text-accent" />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-card-foreground">
                Profile
              </h2>
              <p className="text-sm text-muted-foreground">
                Your personal information
              </p>
            </div>
          </div>

          <div className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="name">Full Name</Label>
                <Input
                  id="name"
                  value={profile.name}
                  onChange={(e) => handleProfileChange("name", e.target.value)}
                  className="bg-secondary/50 border-border/50"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  value={profile.email}
                  onChange={(e) => handleProfileChange("email", e.target.value)}
                  className="bg-secondary/50 border-border/50"
                />
              </div>
            </div>
            <Button
              onClick={handleSaveProfile}
              className="bg-accent text-accent-foreground hover:bg-accent/90"
            >
              Save Changes
            </Button>
          </div>
        </motion.div>

        {/* Notifications Section */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.2 }}
          className="rounded-2xl border border-border/50 bg-card p-6"
        >
          <div className="flex items-center gap-3 mb-6">
            <div className="rounded-xl bg-accent/10 p-2">
              <Bell className="h-5 w-5 text-accent" />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-card-foreground">
                Notifications
              </h2>
              <p className="text-sm text-muted-foreground">
                Manage your notification preferences
              </p>
            </div>
          </div>

          <div className="space-y-4">
            <div className="flex items-center justify-between py-3 border-b border-border/50">
              <div>
                <p className="font-medium text-card-foreground">
                  Email Notifications
                </p>
                <p className="text-sm text-muted-foreground">
                  Receive updates via email
                </p>
              </div>
              <Switch
                checked={notifications.email}
                onCheckedChange={() => handleNotificationChange("email")}
              />
            </div>
            <div className="flex items-center justify-between py-3 border-b border-border/50">
              <div>
                <p className="font-medium text-card-foreground">
                  Practice Reminders
                </p>
                <p className="text-sm text-muted-foreground">
                  Daily reminders to practice
                </p>
              </div>
              <Switch
                checked={notifications.practice}
                onCheckedChange={() => handleNotificationChange("practice")}
              />
            </div>
            <div className="flex items-center justify-between py-3">
              <div>
                <p className="font-medium text-card-foreground">Weekly Tips</p>
                <p className="text-sm text-muted-foreground">
                  Receive interview tips weekly
                </p>
              </div>
              <Switch
                checked={notifications.tips}
                onCheckedChange={() => handleNotificationChange("tips")}
              />
            </div>
          </div>
        </motion.div>

        {/* Security Section */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.3 }}
          className="rounded-2xl border border-border/50 bg-card p-6"
        >
          <div className="flex items-center gap-3 mb-6">
            <div className="rounded-xl bg-accent/10 p-2">
              <Shield className="h-5 w-5 text-accent" />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-card-foreground">
                Security
              </h2>
              <p className="text-sm text-muted-foreground">
                Manage your account security
              </p>
            </div>
          </div>

          <div className="space-y-4">
            <Button
              variant="outline"
              className="bg-transparent border-border/50"
            >
              Change Password
            </Button>
            <Button
              variant="outline"
              className="bg-transparent border-border/50 text-destructive hover:text-destructive"
            >
              Delete Account
            </Button>
          </div>
        </motion.div>

        {/* Appearance Section */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.4 }}
          className="rounded-2xl border border-border/50 bg-card p-6"
        >
          <div className="flex items-center gap-3 mb-6">
            <div className="rounded-xl bg-accent/10 p-2">
              <Palette className="h-5 w-5 text-accent" />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-card-foreground">
                Appearance
              </h2>
              <p className="text-sm text-muted-foreground">
                Customize your experience
              </p>
            </div>
          </div>

          <div className="flex gap-3">
            <Button
              variant="outline"
              className="bg-transparent border-border/50"
            >
              Dark Mode
            </Button>
            <Button
              variant="outline"
              className="bg-transparent border-border/50 opacity-50"
              disabled
            >
              Light Mode (Coming Soon)
            </Button>
          </div>
        </motion.div>
      </div>
    </DashboardLayout>
  );
}
