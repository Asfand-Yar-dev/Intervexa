"use client"

import Link from "next/link"
import { Sparkles } from "lucide-react"
import { toast } from "sonner"

export function Footer() {
  const showComingSoon = (feature: string) => {
    toast.info("Coming Soon", {
      description: `${feature} will be available in a future update.`,
    })
  }

  return (
    <footer className="border-t border-border/50 bg-secondary/20 py-12">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="grid gap-8 md:grid-cols-4">
          {/* Brand */}
          <div className="space-y-4">
            <Link href="/" className="flex items-center gap-2">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-accent">
                <Sparkles className="h-4 w-4 text-accent-foreground" />
              </div>
              <span className="text-lg font-semibold text-foreground">AI Interview Master</span>
            </Link>
            <p className="text-sm text-muted-foreground">
              Master your interviews with AI-powered practice sessions and personalized feedback.
            </p>
          </div>

          {/* Product */}
          <div>
            <h3 className="mb-4 text-sm font-semibold text-foreground">Product</h3>
            <ul className="space-y-3 text-sm">
              <li>
                <Link href="#features" className="text-muted-foreground hover:text-foreground transition-colors">
                  Features
                </Link>
              </li>
              <li>
                <button
                  onClick={() => showComingSoon("Pricing")}
                  className="text-muted-foreground hover:text-foreground transition-colors"
                >
                  Pricing
                </button>
              </li>
              <li>
                <button
                  onClick={() => showComingSoon("Demo")}
                  className="text-muted-foreground hover:text-foreground transition-colors"
                >
                  Demo
                </button>
              </li>
            </ul>
          </div>

          {/* Company */}
          <div>
            <h3 className="mb-4 text-sm font-semibold text-foreground">Company</h3>
            <ul className="space-y-3 text-sm">
              <li>
                <button
                  onClick={() => showComingSoon("About page")}
                  className="text-muted-foreground hover:text-foreground transition-colors"
                >
                  About
                </button>
              </li>
              <li>
                <button
                  onClick={() => showComingSoon("Blog")}
                  className="text-muted-foreground hover:text-foreground transition-colors"
                >
                  Blog
                </button>
              </li>
              <li>
                <button
                  onClick={() => showComingSoon("Careers page")}
                  className="text-muted-foreground hover:text-foreground transition-colors"
                >
                  Careers
                </button>
              </li>
            </ul>
          </div>

          {/* Legal */}
          <div>
            <h3 className="mb-4 text-sm font-semibold text-foreground">Legal</h3>
            <ul className="space-y-3 text-sm">
              <li>
                <button
                  onClick={() => showComingSoon("Privacy policy")}
                  className="text-muted-foreground hover:text-foreground transition-colors"
                >
                  Privacy
                </button>
              </li>
              <li>
                <button
                  onClick={() => showComingSoon("Terms of service")}
                  className="text-muted-foreground hover:text-foreground transition-colors"
                >
                  Terms
                </button>
              </li>
              <li>
                <button
                  onClick={() => showComingSoon("Contact page")}
                  className="text-muted-foreground hover:text-foreground transition-colors"
                >
                  Contact
                </button>
              </li>
            </ul>
          </div>
        </div>

        <div className="mt-12 border-t border-border/50 pt-8 text-center text-sm text-muted-foreground">
          <p>© {new Date().getFullYear()} AI Interview Master. All rights reserved.</p>
        </div>
      </div>
    </footer>
  )
}
