"use client"

import { useState, useEffect } from "react"
import Link from "next/link"
import { useParams } from "next/navigation"
import { DashboardLayout } from "@/components/dashboard/dashboard-layout"
import { ScoreCard } from "@/components/results/score-card"
import { FeedbackSection } from "@/components/results/feedback-section"
import { Button } from "@/components/ui/button"
import { motion } from "framer-motion"
import { ArrowLeft, Download, Share2, RotateCcw, Loader2, Trophy } from "lucide-react"
import { interviewApi } from "@/lib/api"
import { useAuth } from "@/hooks/use-auth"

// Type for the feedback displayed on this page
interface InterviewFeedback {
  overallScore: number;
  confidenceScore: number;
  clarityScore: number;
  technicalScore: number;
  bodyLanguageScore: number;
  voiceToneScore: number;
  facePresence: number;
  strengths: string[];
  improvements: string[];
  detailedFeedback: string;
  questionsAnswered: number;
  hasEvaluatedAnswers: boolean;
  isProcessing: boolean;
}

export default function ResultsPage() {
  const params = useParams()
  const sessionId = params.id as string
  const { isAuthenticated, isLoading: authLoading } = useAuth();

  const [isLoading, setIsLoading] = useState(true)
  const [feedback, setFeedback] = useState<InterviewFeedback | null>(null)

  useEffect(() => {
    let timeoutId: NodeJS.Timeout;

    async function loadResults() {
      try {
        // Fetch results from backend
        const response = await interviewApi.getResults(sessionId)
        if (response.success && response.data) {
          const newFeedback = {
            overallScore: response.data.overallScore,
            confidenceScore: response.data.scores.confidence,
            clarityScore: response.data.scores.clarity,
            technicalScore: response.data.scores.technical,
            bodyLanguageScore: response.data.scores.bodyLanguage,
            voiceToneScore: response.data.scores.voiceTone,
            facePresence: response.data.scores.facePresence ?? 100,
            strengths: response.data.strengths,
            improvements: response.data.improvements,
            detailedFeedback: response.data.summary,
            questionsAnswered: response.data.questionsAnswered ?? 0,
            hasEvaluatedAnswers: response.data.hasEvaluatedAnswers ?? true,
            isProcessing: response.data.isProcessing ?? false,
          };
          setFeedback(newFeedback)

          // Auto-poll if results are still being compiled by the AI backend
          if (newFeedback.isProcessing) {
            timeoutId = setTimeout(loadResults, 3000);
          }
        }
      } catch (error) {
        console.error("Failed to load results:", error)
      } finally {
        setIsLoading(false)
      }
    }
    
    loadResults()

    return () => {
      if (timeoutId) clearTimeout(timeoutId);
    }
  }, [sessionId])

  // Show loading while checking auth or loading data
  if (authLoading || isLoading) {
    return (
      <DashboardLayout>
        <div className="flex h-[60vh] items-center justify-center">
          <div className="text-center space-y-4">
            <Loader2 className="h-12 w-12 animate-spin text-accent mx-auto" />
            <p className="text-muted-foreground">Analyzing your interview...</p>
          </div>
        </div>
      </DashboardLayout>
    )
  }

  // Don't render if not authenticated
  if (!isAuthenticated) {
    return null;
  }

  if (!feedback) {
    return (
      <DashboardLayout>
        <div className="flex h-[60vh] items-center justify-center">
          <div className="text-center space-y-4">
            <p className="text-muted-foreground">Failed to load results</p>
            <Link href="/dashboard">
              <Button>Return to Dashboard</Button>
            </Link>
          </div>
        </div>
      </DashboardLayout>
    )
  }

  const scoreColors = {
    overall: "oklch(0.65 0.25 280)",
    confidence: "oklch(0.7 0.18 145)",
    clarity: "oklch(0.7 0.15 180)",
    technical: "oklch(0.75 0.18 80)",
    bodyLanguage: "oklch(0.6 0.2 320)",
    voiceTone: "oklch(0.65 0.22 40)",
  }

  const showMeaningfulScores =
    feedback.questionsAnswered > 0 && feedback.hasEvaluatedAnswers

  return (
    <DashboardLayout>
      <div className="max-w-5xl mx-auto space-y-8">
        {/* Back Link */}
        <motion.div initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} transition={{ duration: 0.3 }}>
          <Link
            href="/dashboard"
            className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to Dashboard
          </Link>
        </motion.div>

        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
          className="text-center"
        >
          <div className="inline-flex items-center justify-center h-20 w-20 rounded-2xl bg-accent/10 mb-4">
            <Trophy className="h-10 w-10 text-accent" />
          </div>
          <h1 className="text-3xl font-bold text-foreground mb-2">Interview Complete!</h1>
          
          <div className="text-muted-foreground flex justify-center mt-4">
            {feedback.isProcessing ? (
              <div className="flex flex-col items-center gap-3">
                <p>Please wait, AI is analyzing your results...</p>
              </div>
            ) : showMeaningfulScores ? (
              <p className="max-w-md">Here's your performance breakdown for this session.</p>
            ) : (
              <p className="max-w-md">No valid spoken answers were detected, so there is no score.</p>
            )}
          </div>
        </motion.div>

        {/* Overall Score */}
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.4, delay: 0.1 }}
          className="rounded-2xl border border-accent/30 bg-gradient-to-br from-accent/10 to-accent/5 p-8 text-center"
        >
          <p className="text-sm text-muted-foreground mb-2">Overall Score</p>
          <div className="flex items-center justify-center gap-4">
            <motion.span
              className="text-6xl font-bold text-foreground"
              initial={{ opacity: 0, scale: 0.5 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.5, delay: 0.3 }}
            >
              {!feedback.isProcessing ? (
                feedback.overallScore
              ) : (
                <div className="loader-wrapper mt-4">
                  <div className="loader-circle"></div>
                  <div className="loader-circle"></div>
                  <div className="loader-circle"></div>
                  <div className="loader-shadow"></div>
                  <div className="loader-shadow"></div>
                  <div className="loader-shadow"></div>
                </div>
              )}
            </motion.span>
            {!feedback.isProcessing ? (
              <span className="text-2xl text-muted-foreground">/100</span>
            ) : null}
          </div>
        </motion.div>

        {/* Score Cards Grid */}
        {showMeaningfulScores ? (
          <div className="grid gap-4 grid-cols-2 lg:grid-cols-3">
            <ScoreCard 
              label="Confidence" 
              score={feedback.confidenceScore} 
              color={scoreColors.confidence} 
              delay={0.2} 
              zeroReason="Minimal vocal variation or long pauses detected."
            />
            <ScoreCard 
              label="Clarity" 
              score={feedback.clarityScore} 
              color={scoreColors.clarity} 
              delay={0.25} 
              zeroReason="Audio clarity or speech rate was outside normal range."
            />
            <ScoreCard 
              label="Technical" 
              score={feedback.technicalScore} 
              color={scoreColors.technical} 
              delay={0.3} 
              zeroReason="Response lacked the required technical depth or key terminology."
            />
            <ScoreCard
              label={feedback.facePresence < 20 ? "Body Language (Camera Off)" : "Body Language"}
              score={feedback.facePresence < 20 ? 0 : feedback.bodyLanguageScore}
              color={scoreColors.bodyLanguage}
              delay={0.35}
              zeroReason={feedback.facePresence < 20 ? "Camera was off — body language could not be scored. Turn camera on for this metric." : "Insufficient visual data or neutral expression detected."}
            />
            <ScoreCard 
              label="Voice & Tone" 
              score={feedback.voiceToneScore} 
              color={scoreColors.voiceTone} 
              delay={0.4} 
              zeroReason="Voice modulation and sentiment were not clearly identified."
            />
          </div>
        ) : (
          <div className="rounded-2xl border border-border/50 bg-card/80 p-8 text-center text-muted-foreground text-sm max-w-xl mx-auto">
            Dimension scores (confidence, clarity, technical, voice, body language) appear after at least one answer is
            transcribed and scored. Finish a session with spoken responses to see the full breakdown.
          </div>
        )}

        {/* Feedback Sections */}
        <FeedbackSection
          strengths={feedback.strengths}
          improvements={feedback.improvements}
          detailedFeedback={feedback.detailedFeedback}
        />

        {/* Action Buttons */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 1.1 }}
          className="flex flex-col sm:flex-row gap-4 justify-center pt-4"
        >
          <Link href="/interview/setup">
            <Button className="w-full sm:w-auto bg-accent text-accent-foreground hover:bg-accent/90">
              <RotateCcw className="mr-2 h-4 w-4" />
              Practice Again
            </Button>
          </Link>
          <Button variant="outline" className="bg-transparent border-border/50">
            <Download className="mr-2 h-4 w-4" />
            Download Report
          </Button>
          <Button variant="outline" className="bg-transparent border-border/50">
            <Share2 className="mr-2 h-4 w-4" />
            Share Results
          </Button>
        </motion.div>

        {/* Tips for Next Time */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.4, delay: 1.2 }}
          className="rounded-xl bg-secondary/30 p-6 border border-border/30 text-center"
        >
          <h3 className="text-lg font-semibold text-foreground mb-2">Keep Improving!</h3>
          <p className="text-sm text-muted-foreground max-w-xl mx-auto">
            Practice makes perfect. Schedule regular interview sessions to maintain and improve your skills. Focus on
            the areas for improvement highlighted above in your next session.
          </p>
        </motion.div>
      </div>
    </DashboardLayout>
  )
}
