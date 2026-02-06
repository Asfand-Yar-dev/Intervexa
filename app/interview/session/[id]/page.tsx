"use client"

import { useState, useEffect, useRef, useCallback } from "react"
import { useRouter, useParams } from "next/navigation"
import { Button } from "@/components/ui/button"
import { motion, AnimatePresence } from "framer-motion"
import {
  Mic,
  MicOff,
  Video,
  VideoOff,
  ArrowRight,
  Loader2,
  Clock,
  AlertCircle,
  CheckCircle,
  Sparkles,
} from "lucide-react"
import { questionsApi, answersApi, interviewApi, type Question } from "@/lib/api"
import { useAuth } from "@/hooks/use-auth"
import { toast } from "sonner"

// Map backend Question to frontend InterviewQuestion format
interface InterviewQuestion {
  id: string;
  question: string;
  category: string;
  difficulty: "easy" | "medium" | "hard";
  timeLimit: number;
}

function mapBackendQuestion(q: Question): InterviewQuestion {
  return {
    id: q._id,
    question: q.questionText,
    category: q.category,
    difficulty: q.difficulty.toLowerCase() as "easy" | "medium" | "hard",
    timeLimit: 120, // Default 2 minutes
  };
}

export default function InterviewSessionPage() {
  const router = useRouter()
  const params = useParams()
  const sessionId = params.id as string
  const { isAuthenticated, isLoading: authLoading } = useAuth();

  const [questions, setQuestions] = useState<InterviewQuestion[]>([])
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0)
  const [isLoading, setIsLoading] = useState(true)
  const [isRecording, setIsRecording] = useState(false)
  const [isProcessing, setIsProcessing] = useState(false)
  const [isCameraOn, setIsCameraOn] = useState(true)
  const [isMicOn, setIsMicOn] = useState(true)
  const [timeElapsed, setTimeElapsed] = useState(0)
  const [showTip, setShowTip] = useState(true)
  const [permissionError, setPermissionError] = useState(false)

  const videoRef = useRef<HTMLVideoElement>(null)
  const streamRef = useRef<MediaStream | null>(null)
  const timerRef = useRef<NodeJS.Timeout | null>(null)
  const mediaRecorderRef = useRef<MediaRecorder | null>(null)
  const audioChunksRef = useRef<Blob[]>([])

  const currentQuestion = questions[currentQuestionIndex]
  const progress = questions.length > 0 ? ((currentQuestionIndex + 1) / questions.length) * 100 : 0

  // Initialize camera and questions
  useEffect(() => {
    async function init() {
      try {
        // Load questions from backend
        const response = await questionsApi.getRandom(5)
        if (response.success && response.data && response.data.length > 0) {
          const mappedQuestions = response.data.map(mapBackendQuestion)
          setQuestions(mappedQuestions)
        } else {
          throw new Error("Failed to load questions or no questions available")
        }

        // Initialize camera
        const stream = await navigator.mediaDevices.getUserMedia({
          video: true,
          audio: true,
        })
        streamRef.current = stream
        if (videoRef.current) {
          videoRef.current.srcObject = stream
        }
      } catch (error) {
        console.error("Failed to initialize:", error)
        setPermissionError(true)
      } finally {
        setIsLoading(false)
      }
    }
    init()

    return () => {
      // Cleanup
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((track) => track.stop())
      }
      if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
        mediaRecorderRef.current.stop()
      }
      if (timerRef.current) {
        clearInterval(timerRef.current)
      }
    }
  }, [sessionId])

  // Toggle camera
  const toggleCamera = useCallback(() => {
    if (streamRef.current) {
      const videoTrack = streamRef.current.getVideoTracks()[0]
      if (videoTrack) {
        videoTrack.enabled = !videoTrack.enabled
        setIsCameraOn(videoTrack.enabled)
      }
    }
  }, [])

  // Toggle mic
  const toggleMic = useCallback(() => {
    if (streamRef.current) {
      const audioTrack = streamRef.current.getAudioTracks()[0]
      if (audioTrack) {
        audioTrack.enabled = !audioTrack.enabled
        setIsMicOn(audioTrack.enabled)
      }
    }
  }, [])

  // Start recording
  const startRecording = () => {
    // Clear previous audio chunks
    audioChunksRef.current = []
    
    // Create MediaRecorder from stream
    if (streamRef.current) {
      // Extract only audio track from the stream (stream has both video + audio)
      const audioTracks = streamRef.current.getAudioTracks()
      if (audioTracks.length === 0) {
        console.error('No audio track available')
        return
      }
      
      // Create a new stream with only audio track
      const audioStream = new MediaStream(audioTracks)
      
      // Try to find a supported MIME type
      const mimeTypes = [
        'audio/webm;codecs=opus',
        'audio/webm',
        'audio/ogg;codecs=opus',
        'audio/mp4',
        'audio/mpeg',
      ]
      
      let selectedMimeType: string | undefined
      for (const mimeType of mimeTypes) {
        if (MediaRecorder.isTypeSupported(mimeType)) {
          selectedMimeType = mimeType
          break
        }
      }
      
      // Create MediaRecorder with audio-only stream and supported MIME type
      const options = selectedMimeType ? { mimeType: selectedMimeType } : {}
      const mediaRecorder = new MediaRecorder(audioStream, options)
      
      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data)
        }
      }
      
      mediaRecorderRef.current = mediaRecorder
      mediaRecorder.start(1000) // Collect data every second
    }
    
    setIsRecording(true)
    setShowTip(false)
    setTimeElapsed(0)
    timerRef.current = setInterval(() => {
      setTimeElapsed((prev) => prev + 1)
    }, 1000)
  }

  // Stop recording and submit
  const stopRecording = async () => {
    setIsRecording(false)
    if (timerRef.current) {
      clearInterval(timerRef.current)
    }

    // Stop MediaRecorder and create audio blob
    let audioBlob: Blob | undefined
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      mediaRecorderRef.current.stop()
      // Wait a moment for final data
      await new Promise(resolve => setTimeout(resolve, 100))
      if (audioChunksRef.current.length > 0) {
        audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' })
      }
    }

    setIsProcessing(true)
    try {
      // Submit answer to backend
      // Note: Audio blob is created but file upload endpoint needed for actual audio storage
      // For now, we record that an answer was submitted with placeholder text
      await answersApi.submit({
        question_id: currentQuestion.id,
        session_id: sessionId,
        answer_text: audioBlob ? `[Audio recording - ${Math.round(audioBlob.size / 1024)}KB]` : "[No recording]",
        // audio_url would be set after file upload implementation
      })
      toast.success("Answer submitted!")
    } catch (error) {
      console.error("Failed to submit answer:", error)
      toast.error("Failed to submit answer")
    }
    setIsProcessing(false)
  }

  // Move to next question
  const nextQuestion = () => {
    if (currentQuestionIndex < questions.length - 1) {
      setCurrentQuestionIndex((prev) => prev + 1)
      setShowTip(true)
    } else {
      // Interview complete
      finishInterview()
    }
  }

  // Finish interview
  const finishInterview = async () => {
    setIsLoading(true)
    
    // Stop recording if active
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      mediaRecorderRef.current.stop()
    }
    
    // Stop camera and microphone streams
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop())
    }
    
    // Clear timer
    if (timerRef.current) {
      clearInterval(timerRef.current)
    }
    
    try {
      // End the interview session in the backend
      await interviewApi.endSession(sessionId)
      toast.success("Interview completed!")
      router.push(`/interview/results/${sessionId}`)
    } catch (error) {
      console.error("Failed to complete interview:", error)
      toast.error("Failed to complete interview")
      setIsLoading(false)
    }
  }

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60)
    const secs = seconds % 60
    return `${mins}:${secs.toString().padStart(2, "0")}`
  }

  // Show loading while checking auth or initializing
  if (authLoading || isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center space-y-4">
          <Loader2 className="h-12 w-12 animate-spin text-accent mx-auto" />
          <p className="text-muted-foreground">Preparing your interview...</p>
        </div>
      </div>
    )
  }

  // Don't render if not authenticated
  if (!isAuthenticated) {
    return null;
  }

  if (permissionError) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center space-y-6 max-w-md px-4">
          <div className="mx-auto h-20 w-20 rounded-2xl bg-destructive/10 flex items-center justify-center">
            <VideoOff className="h-10 w-10 text-destructive" />
          </div>
          <div className="space-y-2">
            <h2 className="text-2xl font-bold text-foreground">Camera Access Required</h2>
            <p className="text-muted-foreground">
              We need access to your camera and microphone for the interview session. 
              Please allow access in your browser settings and try again.
            </p>
          </div>
          <div className="flex flex-col gap-3">
            <Button
              onClick={() => window.location.reload()}
              className="bg-accent text-accent-foreground hover:bg-accent/90"
            >
              Try Again
            </Button>
            <Button
              variant="outline"
              onClick={() => router.push("/dashboard")}
              className="bg-transparent"
            >
              Return to Dashboard
            </Button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Top Bar */}
      <header className="sticky top-0 z-40 border-b border-border/50 bg-background/80 backdrop-blur-xl">
        <div className="flex h-16 items-center justify-between px-6">
          <div className="flex items-center gap-3">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-accent">
              <Sparkles className="h-4 w-4 text-accent-foreground" />
            </div>
            <span className="font-semibold text-foreground">Interview Session</span>
          </div>

          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Clock className="h-4 w-4" />
              <span>
                Question {currentQuestionIndex + 1} of {questions.length}
              </span>
            </div>
            <div className="h-2 w-32 rounded-full bg-secondary overflow-hidden">
              <motion.div
                className="h-full bg-accent"
                initial={{ width: 0 }}
                animate={{ width: `${progress}%` }}
                transition={{ duration: 0.3 }}
              />
            </div>
          </div>
        </div>
      </header>

      <div className="max-w-6xl mx-auto p-6 lg:p-8">
        <div className="grid gap-8 lg:grid-cols-2">
          {/* Video Preview */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.4 }}
            className="space-y-4"
          >
            <div className="relative aspect-video rounded-2xl overflow-hidden bg-secondary border border-border/50">
              <video
                ref={videoRef}
                autoPlay
                muted
                playsInline
                className={`w-full h-full object-cover ${!isCameraOn && "hidden"}`}
              />
              {!isCameraOn && (
                <div className="absolute inset-0 flex items-center justify-center">
                  <div className="text-center space-y-2">
                    <VideoOff className="h-12 w-12 text-muted-foreground mx-auto" />
                    <p className="text-sm text-muted-foreground">Camera Off</p>
                  </div>
                </div>
              )}

              {/* Recording Indicator */}
              <AnimatePresence>
                {isRecording && (
                  <motion.div
                    initial={{ opacity: 0, scale: 0.8 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.8 }}
                    className="absolute top-4 left-4 flex items-center gap-2 px-3 py-1.5 rounded-full bg-destructive/90 text-destructive-foreground text-sm font-medium"
                  >
                    <span className="h-2 w-2 rounded-full bg-white animate-pulse" />
                    Recording {formatTime(timeElapsed)}
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            {/* Camera Controls */}
            <div className="flex justify-center gap-4">
              <Button
                variant="outline"
                size="lg"
                onClick={toggleCamera}
                className={`bg-transparent border-border/50 ${!isCameraOn && "text-destructive"}`}
              >
                {isCameraOn ? <Video className="h-5 w-5" /> : <VideoOff className="h-5 w-5" />}
              </Button>
              <Button
                variant="outline"
                size="lg"
                onClick={toggleMic}
                className={`bg-transparent border-border/50 ${!isMicOn && "text-destructive"}`}
              >
                {isMicOn ? <Mic className="h-5 w-5" /> : <MicOff className="h-5 w-5" />}
              </Button>
            </div>
          </motion.div>

          {/* Question Panel */}
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.4, delay: 0.1 }}
            className="space-y-6"
          >
            {/* Question Card */}
            <div className="rounded-2xl border border-border/50 bg-card p-6">
              <div className="flex items-center gap-2 mb-4">
                <span
                  className={`px-2 py-0.5 rounded text-xs font-medium ${
                    currentQuestion?.category === "behavioral"
                      ? "bg-chart-1/20 text-chart-1"
                      : currentQuestion?.category === "technical"
                        ? "bg-chart-2/20 text-chart-2"
                        : "bg-chart-3/20 text-chart-3"
                  }`}
                >
                  {currentQuestion?.category}
                </span>
                <span
                  className={`px-2 py-0.5 rounded text-xs font-medium ${
                    currentQuestion?.difficulty === "easy"
                      ? "bg-success/20 text-success"
                      : currentQuestion?.difficulty === "medium"
                        ? "bg-warning/20 text-warning"
                        : "bg-destructive/20 text-destructive"
                  }`}
                >
                  {currentQuestion?.difficulty}
                </span>
              </div>

              <h2 className="text-xl font-semibold text-card-foreground leading-relaxed">
                {currentQuestion?.question}
              </h2>
            </div>

            {/* Tip */}
            <AnimatePresence>
              {showTip && !isRecording && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: "auto" }}
                  exit={{ opacity: 0, height: 0 }}
                  className="rounded-xl bg-accent/10 p-4 border border-accent/20"
                >
                  <div className="flex gap-3">
                    <AlertCircle className="h-5 w-5 text-accent shrink-0 mt-0.5" />
                    <div>
                      <p className="text-sm font-medium text-foreground mb-1">Tip</p>
                      <p className="text-sm text-muted-foreground">
                        Take a moment to gather your thoughts before answering. Structure your response with a clear
                        beginning, middle, and end.
                      </p>
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Recording Controls */}
            <div className="space-y-4">
              {!isRecording && !isProcessing && (
                <Button
                  onClick={startRecording}
                  className="w-full h-14 bg-accent text-accent-foreground hover:bg-accent/90 text-lg font-semibold"
                >
                  <Mic className="mr-2 h-5 w-5" />
                  Start Recording Answer
                </Button>
              )}

              {isRecording && (
                <Button onClick={stopRecording} variant="destructive" className="w-full h-14 text-lg font-semibold">
                  <CheckCircle className="mr-2 h-5 w-5" />
                  Stop & Submit Answer
                </Button>
              )}

              {isProcessing && (
                <Button disabled className="w-full h-14 text-lg font-semibold">
                  <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                  Processing Your Answer...
                </Button>
              )}

              {!isRecording && !isProcessing && (
                <Button
                  onClick={nextQuestion}
                  variant="outline"
                  className="w-full h-12 bg-transparent border-border/50"
                >
                  {currentQuestionIndex < questions.length - 1 ? (
                    <>
                      Next Question
                      <ArrowRight className="ml-2 h-4 w-4" />
                    </>
                  ) : (
                    <>
                      Finish Interview
                      <CheckCircle className="ml-2 h-4 w-4" />
                    </>
                  )}
                </Button>
              )}
            </div>

            {/* Progress Steps */}
            <div className="flex justify-center gap-2">
              {questions.map((_, index) => (
                <div
                  key={index}
                  className={`h-2 w-8 rounded-full transition-colors ${
                    index < currentQuestionIndex
                      ? "bg-success"
                      : index === currentQuestionIndex
                        ? "bg-accent"
                        : "bg-secondary"
                  }`}
                />
              ))}
            </div>
          </motion.div>
        </div>
      </div>
    </div>
  )
}
