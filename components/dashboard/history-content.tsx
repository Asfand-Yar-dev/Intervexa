"use client"

import { useState, useEffect, useCallback } from "react"
import { motion } from "framer-motion"
import { Calendar, CheckCircle, Search, Filter, Loader2, AlertCircle, RefreshCw, Clock, XCircle } from "lucide-react"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import Link from "next/link"
import { interviewApi, type InterviewSession } from "@/lib/api"

interface DisplaySession {
  id: string
  sessionType: string
  status: string
  score?: number
  date: string
}

function mapSessionToDisplay(session: InterviewSession): DisplaySession {
  return {
    id: session._id,
    sessionType: session.session_type || "Interview Session",
    status: session.status,
    score: session.overall_score,
    date: session.createdAt,
  }
}

function getStatusIcon(status: string) {
  switch (status) {
    case "completed":
      return <CheckCircle className="h-5 w-5 text-green-500" />
    case "ongoing":
      return <Clock className="h-5 w-5 text-yellow-500" />
    case "cancelled":
      return <XCircle className="h-5 w-5 text-red-500" />
    default:
      return <Clock className="h-5 w-5 text-muted-foreground" />
  }
}

function getStatusLabel(status: string) {
  switch (status) {
    case "completed":
      return "Completed"
    case "ongoing":
      return "In Progress"
    case "cancelled":
      return "Cancelled"
    case "pending":
      return "Pending"
    default:
      return status
  }
}

export function HistoryContent() {
  const [searchQuery, setSearchQuery] = useState("")
  const [sessions, setSessions] = useState<DisplaySession[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const loadHistory = useCallback(async () => {
    setIsLoading(true)
    setError(null)
    
    try {
      const response = await interviewApi.getMySessions({ limit: 50 })
      
      if (response.success && response.data) {
        const displaySessions = response.data.sessions.map(mapSessionToDisplay)
        setSessions(displaySessions)
      }
    } catch (err) {
      console.error("Failed to load history:", err)
      setError(err instanceof Error ? err.message : "Failed to load interview history")
    } finally {
      setIsLoading(false)
    }
  }, [])

  useEffect(() => {
    loadHistory()
  }, [loadHistory])

  const filteredHistory = sessions.filter(
    (session) =>
      session.sessionType.toLowerCase().includes(searchQuery.toLowerCase()) ||
      session.status.toLowerCase().includes(searchQuery.toLowerCase()),
  )

  if (isLoading) {
    return (
      <div className="flex h-[60vh] items-center justify-center">
        <div className="text-center space-y-4">
          <Loader2 className="h-8 w-8 animate-spin text-accent mx-auto" />
          <p className="text-muted-foreground">Loading your interview history...</p>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="flex h-[60vh] items-center justify-center">
        <div className="text-center space-y-4 max-w-md">
          <AlertCircle className="h-12 w-12 text-destructive mx-auto" />
          <h2 className="text-xl font-semibold">Failed to Load History</h2>
          <p className="text-muted-foreground">{error}</p>
          <Button onClick={loadHistory} variant="outline">
            <RefreshCw className="mr-2 h-4 w-4" />
            Try Again
          </Button>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-8">
      {/* Header */}
      <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4 }}>
        <h1 className="text-3xl font-bold text-foreground">Interview History</h1>
        <p className="text-muted-foreground mt-1">Review your past practice sessions and track your progress</p>
      </motion.div>

      {/* Search and Filter */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, delay: 0.1 }}
        className="flex flex-col sm:flex-row gap-4"
      >
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search by session type or status..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10 h-11 bg-secondary/50 border-border/50"
          />
        </div>
        <Button variant="outline" className="bg-transparent border-border/50" onClick={loadHistory}>
          <RefreshCw className="mr-2 h-4 w-4" />
          Refresh
        </Button>
      </motion.div>

      {/* History List */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, delay: 0.2 }}
        className="rounded-2xl border border-border/50 bg-card overflow-hidden"
      >
        <div className="divide-y divide-border/50">
          {filteredHistory.map((session, index) => (
            <motion.div
              key={session.id}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.3, delay: 0.3 + index * 0.05 }}
              className="flex items-center justify-between p-6 transition-colors hover:bg-secondary/30"
            >
              <div className="flex items-center gap-4">
                <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-accent/10">
                  {getStatusIcon(session.status)}
                </div>
                <div>
                  <p className="font-medium text-card-foreground capitalize">
                    {session.sessionType.replace(/_/g, " ")} Interview
                  </p>
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Calendar className="h-3 w-3" />
                    <span>{new Date(session.date).toLocaleDateString()}</span>
                    <span>•</span>
                    <span className="capitalize">{getStatusLabel(session.status)}</span>
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-6">
                {session.score !== undefined && session.score > 0 && (
                  <div className="text-right">
                    <p className="text-2xl font-bold text-card-foreground">{session.score}%</p>
                    <p className="text-xs text-muted-foreground">Score</p>
                  </div>
                )}
                {session.status === "completed" ? (
                  <Link href={`/interview/results/${session.id}`}>
                    <Button variant="outline" size="sm" className="bg-transparent border-border/50">
                      View Details
                    </Button>
                  </Link>
                ) : session.status === "ongoing" ? (
                  <Link href={`/interview/session/${session.id}`}>
                    <Button variant="default" size="sm" className="bg-accent text-accent-foreground">
                      Continue
                    </Button>
                  </Link>
                ) : null}
              </div>
            </motion.div>
          ))}

          {filteredHistory.length === 0 && (
            <div className="p-12 text-center">
              <p className="text-muted-foreground">
                {sessions.length === 0 
                  ? "No interview sessions yet. Start your first practice session!" 
                  : "No sessions found matching your search."}
              </p>
              {sessions.length === 0 && (
                <Link href="/interview/setup">
                  <Button className="mt-4 bg-accent text-accent-foreground">
                    Start First Interview
                  </Button>
                </Link>
              )}
            </div>
          )}
        </div>
      </motion.div>
    </div>
  )
}
