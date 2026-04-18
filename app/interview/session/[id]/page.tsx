"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { useRouter, useParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { motion, AnimatePresence } from "framer-motion";
import {
  Mic,
  MicOff,
  Video,
  VideoOff,
  Volume2,
  ArrowRight,
  Loader2,
  Clock,
  AlertCircle,
  CheckCircle,
  Sparkles,
} from "lucide-react";
import {
  answersApi,
  interviewApi,
  type Question,
} from "@/lib/api";
import { useAuth } from "@/hooks/use-auth";
import { toast } from "sonner";

// Map backend Question to frontend InterviewQuestion format
interface InterviewQuestion {
  id: string;
  question: string;
  category: string;
  difficulty: "easy" | "medium" | "hard";
}

function mapBackendQuestion(q: any): InterviewQuestion {
  const difficulty = (String(q.difficulty || "medium").toLowerCase() === "easy"
    ? "easy"
    : String(q.difficulty || "medium").toLowerCase() === "hard"
      ? "hard"
      : "medium") as "easy" | "medium" | "hard";

  return {
    id: String(q.id || q._id),
    question: String(q.questionText || q.question || ""),
    category: String(q.category || ""),
    difficulty,
  };
}

export default function InterviewSessionPage() {
  const router = useRouter();
  const params = useParams();
  const sessionId = params.id as string;
  const { isAuthenticated, isLoading: authLoading } = useAuth();

  const [questions, setQuestions] = useState<InterviewQuestion[]>([]);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [hasStarted, setHasStarted] = useState(false);
  const [instructionsAccepted, setInstructionsAccepted] = useState(false);
  const [globalTimeRemaining, setGlobalTimeRemaining] = useState(600); // 10 minutes limit
  const [isLoading, setIsLoading] = useState(true);
  const [isRecording, setIsRecording] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isCameraOn, setIsCameraOn] = useState(true);
  const [isMicOn, setIsMicOn] = useState(true);
  const [timeElapsed, setTimeElapsed] = useState(0);
  const [showTip, setShowTip] = useState(true);
  const [permissionError, setPermissionError] = useState(false);
  const [speakQuestionsAloud, setSpeakQuestionsAloud] = useState(false);

  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const videoRecorderRef = useRef<MediaRecorder | null>(null);
  const videoChunksRef = useRef<Blob[]>([]);
  const isFinishingRef = useRef(false);

  // Live-value refs so the global timer callback never reads stale closures
  const isRecordingRef = useRef(isRecording);
  const currentQuestionIndexRef = useRef(currentQuestionIndex);
  const questionsRef = useRef(questions);
  useEffect(() => { isRecordingRef.current = isRecording; }, [isRecording]);
  useEffect(() => { currentQuestionIndexRef.current = currentQuestionIndex; }, [currentQuestionIndex]);
  useEffect(() => { questionsRef.current = questions; }, [questions]);

  const currentQuestion = questions[currentQuestionIndex];
  const progress =
    questions.length > 0
      ? ((currentQuestionIndex + 1) / questions.length) * 100
      : 0;

  // Initialize camera and questions
  useEffect(() => {
    if (!hasStarted) return;

    async function init() {
      // 1) Load Gemini-assigned questions for THIS interview session
      try {
        const qRes = await interviewApi.getSessionQuestions(sessionId);
        if (!qRes.success || !qRes.data?.questions?.length) {
          throw new Error("No questions were assigned to this interview.");
        }

        const mappedQuestions = [...qRes.data.questions]
          .sort((a, b) => (a.order ?? 0) - (b.order ?? 0))
          .map(mapBackendQuestion);

        setQuestions(mappedQuestions);
      } catch (error) {
        console.error("Failed to load interview questions:", error);
        toast.error(
          error instanceof Error ? error.message : "Failed to load interview questions"
        );
        setIsLoading(false);
        router.push("/interview/setup");
        return;
      }

      // 2) Initialize camera + microphone (separate from question loading)
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: true,
          audio: true,
        });
        streamRef.current = stream;
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
        }
      } catch (error) {
        console.error("Failed to initialize camera/mic:", error);
        setPermissionError(true);
      } finally {
        setIsLoading(false);
      }
    }
    init();

    return () => {
      // Cleanup
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((track) => track.stop());
      }
      if (
        mediaRecorderRef.current &&
        mediaRecorderRef.current.state !== "inactive"
      ) {
        mediaRecorderRef.current.stop();
      }
      if (
        videoRecorderRef.current &&
        videoRecorderRef.current.state !== "inactive"
      ) {
        videoRecorderRef.current.stop();
      }
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
    };
  }, [sessionId, hasStarted]);

  // Auto-start recording when everything is ready
  useEffect(() => {
    if (hasStarted && !isLoading && !permissionError && !isRecording && currentQuestionIndex === 0) {
      const timer = setTimeout(() => {
        startRecording();
      }, 500); // short delay to ensure stream is stable
      return () => clearTimeout(timer);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hasStarted, isLoading, permissionError]);

  // Make sure to attach the camera stream once the loading screen disappears and video mounts
  useEffect(() => {
    if (!isLoading && !permissionError && videoRef.current && streamRef.current) {
      if (videoRef.current.srcObject !== streamRef.current) {
        videoRef.current.srcObject = streamRef.current;
      }
    }
  }, [isLoading, permissionError, isCameraOn]);

  useEffect(() => {
    try {
      const raw = sessionStorage.getItem("interviewSetup");
      if (raw) {
        const o = JSON.parse(raw) as { speakQuestions?: boolean };
        setSpeakQuestionsAloud(Boolean(o.speakQuestions));
      }
    } catch {
      /* ignore */
    }
  }, []);

  const speakQuestion = useCallback((text: string) => {
    if (typeof window === "undefined" || !("speechSynthesis" in window) || !text.trim()) {
      return;
    }

    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.rate = 1;
    utterance.pitch = 1;
    utterance.volume = 1;
    window.speechSynthesis.speak(utterance);
  }, []);

  useEffect(() => {
    if (!speakQuestionsAloud || !currentQuestion?.question) return;
    speakQuestion(currentQuestion.question);
  }, [currentQuestionIndex, currentQuestion?.question, speakQuestionsAloud, speakQuestion]);

  const setSpeakPreference = useCallback((on: boolean) => {
    setSpeakQuestionsAloud(on);
    try {
      const raw = sessionStorage.getItem("interviewSetup");
      const o = raw ? (JSON.parse(raw) as Record<string, unknown>) : {};
      sessionStorage.setItem(
        "interviewSetup",
        JSON.stringify({ ...o, speakQuestions: on })
      );
    } catch {
      /* ignore */
    }
  }, []);

  // Toggle camera
  const toggleCamera = useCallback(() => {
    if (streamRef.current) {
      const videoTrack = streamRef.current.getVideoTracks()[0];
      if (videoTrack) {
        videoTrack.enabled = !videoTrack.enabled;
        setIsCameraOn(videoTrack.enabled);
      }
    }
  }, []);

  // Toggle mic
  const toggleMic = useCallback(() => {
    if (streamRef.current) {
      const audioTrack = streamRef.current.getAudioTracks()[0];
      if (audioTrack) {
        audioTrack.enabled = !audioTrack.enabled;
        setIsMicOn(audioTrack.enabled);
      }
    }
  }, []);

  // Start recording
  const startRecording = () => {
    // Clear previous audio chunks
    audioChunksRef.current = [];
    videoChunksRef.current = [];

    // Create MediaRecorders from stream (audio-only + video-only)
    if (streamRef.current) {
      const audioTracks = streamRef.current.getAudioTracks();
      const videoTracks = streamRef.current.getVideoTracks();

      if (audioTracks.length === 0) {
        console.error("No audio track available");
        toast.error("Microphone not available for recording.");
        return;
      }

      const audioStream = new MediaStream(audioTracks);

      // Audio MIME selection
      const audioMimeTypes = [
        "audio/webm;codecs=opus",
        "audio/webm",
        "audio/ogg;codecs=opus",
        "audio/mp4",
        "audio/mpeg",
      ];
      let selectedAudioMimeType: string | undefined;
      for (const mimeType of audioMimeTypes) {
        if (MediaRecorder.isTypeSupported(mimeType)) {
          selectedAudioMimeType = mimeType;
          break;
        }
      }

      const audioOptions = selectedAudioMimeType
        ? { mimeType: selectedAudioMimeType }
        : {};
      const audioRecorder = new MediaRecorder(audioStream, audioOptions);
      audioRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) audioChunksRef.current.push(event.data);
      };

      // Video is optional. If camera is off/disabled, still record audio answer.
      let videoRecorder: MediaRecorder | null = null;
      const activeVideoTrack = videoTracks.find((t) => t.enabled);
      if (activeVideoTrack && isCameraOn) {
        try {
          const videoStream = new MediaStream([activeVideoTrack]);
          const videoMimeTypes = [
            "video/webm;codecs=vp9",
            "video/webm;codecs=vp8",
            "video/webm",
          ];
          let selectedVideoMimeType: string | undefined;
          for (const mimeType of videoMimeTypes) {
            if (MediaRecorder.isTypeSupported(mimeType)) {
              selectedVideoMimeType = mimeType;
              break;
            }
          }

          const videoOptions = selectedVideoMimeType
            ? { mimeType: selectedVideoMimeType }
            : {};
          videoRecorder = new MediaRecorder(videoStream, videoOptions);
          videoRecorder.ondataavailable = (event) => {
            if (event.data.size > 0) videoChunksRef.current.push(event.data);
          };
        } catch (error) {
          console.warn("Video recorder could not start; continuing with audio-only.", error);
        }
      }

      mediaRecorderRef.current = audioRecorder;
      videoRecorderRef.current = videoRecorder;

      // Start both recorders in parallel
      audioRecorder.start(1000); // Collect data every second
      if (videoRecorder) {
        videoRecorder.start(1000);
      }
    }

    setIsRecording(true);
    setShowTip(false);
    setTimeElapsed(0);
    timerRef.current = setInterval(() => {
      setTimeElapsed((prev) => prev + 1);
    }, 1000);
  };

  const stopMediaRecorders = async () => {
    setIsRecording(false);
    if (timerRef.current) clearInterval(timerRef.current);

    const audioRecorder = mediaRecorderRef.current;
    const videoRecorder = videoRecorderRef.current;

    const stopAndWait = (rec: MediaRecorder | null) =>
      new Promise<void>((resolve) => {
        if (!rec || rec.state === "inactive") return resolve();
        rec.onstop = () => resolve();
        rec.stop();
      });

    await Promise.all([stopAndWait(audioRecorder), stopAndWait(videoRecorder)]);

    let audioBlob: Blob | undefined;
    let videoBlob: Blob | undefined;

    if (audioChunksRef.current.length > 0) {
      audioBlob = new Blob(audioChunksRef.current, { type: audioRecorder?.mimeType || "audio/webm" });
    }
    if (videoChunksRef.current.length > 0) {
      videoBlob = new Blob(videoChunksRef.current, { type: videoRecorder?.mimeType || "video/webm" });
    }

    if (!videoBlob || videoBlob.size < 2048) {
      videoBlob = undefined;
    }

    return { audioBlob, videoBlob, duration: timeElapsed };
  };

  const submitBackgroundAnswer = async (qId: string, audioBlob?: Blob, videoBlob?: Blob, duration?: number) => {
    if (!audioBlob || audioBlob.size < 1024) return; // Skip if too short
    try {
      await answersApi.submit({
        question_id: qId,
        session_id: sessionId,
        audio_blob: audioBlob,
        video_blob: videoBlob,
        audio_duration: duration || 0,
        answer_text: "", // Background AI will generate transcription
      });
    } catch (error) {
      console.error("Background chunk upload failed:", error);
    }
  };

  const handleNextQuestion = async () => {
    setIsProcessing(true);
    const qId = currentQuestion.id;
    const { audioBlob, videoBlob, duration } = await stopMediaRecorders();
    
    // Await submission to ensure backend finishes processing before proceeding or redirecting
    await submitBackgroundAnswer(qId, audioBlob, videoBlob, duration);

    if (currentQuestionIndex < questions.length - 1) {
      setCurrentQuestionIndex((prev) => prev + 1);
      setShowTip(true);
      startRecording(); // Restart immediately for the next question
      setIsProcessing(false);
    } else {
      finishInterview();
    }
  };

  // Finish interview
  const finishInterview = async () => {
    // Guard against double invocations (e.g. timer + button click race)
    if (isFinishingRef.current) return;
    isFinishingRef.current = true;

    setIsLoading(true);

    // Stop recording if active
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== "inactive") {
      mediaRecorderRef.current.stop();
    }
    if (videoRecorderRef.current && videoRecorderRef.current.state !== "inactive") {
      videoRecorderRef.current.stop();
    }

    // Stop camera and microphone streams
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
    }

    // Clear timer
    if (timerRef.current) {
      clearInterval(timerRef.current);
    }

    try {
      // End the interview session in the backend
      await interviewApi.endSession(sessionId);
      toast.success("Interview completed!");
      router.push(`/interview/results/${sessionId}`);
    } catch (error) {
      console.error("Failed to complete interview:", error);
      // If session was already completed (e.g. from a race with the global timer),
      // still redirect to results instead of leaving the user stranded.
      const msg = error instanceof Error ? error.message : "";
      if (msg.toLowerCase().includes("already completed")) {
        router.push(`/interview/results/${sessionId}`);
      } else {
        toast.error("Failed to complete interview");
        isFinishingRef.current = false;
        setIsLoading(false);
      }
    }
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, "0")}`;
  };

  // Global Session Timer
  useEffect(() => {
    if (!hasStarted || isLoading || authLoading || questions.length === 0) return;
    
    const interval = setInterval(() => {
      setGlobalTimeRemaining((prev) => {
        if (prev <= 1) {
          clearInterval(interval);
          
          // Read LIVE values via refs to avoid stale-closure bugs.
          const liveQuestions = questionsRef.current;
          const liveIndex = currentQuestionIndexRef.current;
          const liveRecording = isRecordingRef.current;
          const qId = liveQuestions[liveIndex]?.id;

          if (qId && liveRecording) {
            stopMediaRecorders().then(({ audioBlob, videoBlob, duration }) => {
              submitBackgroundAnswer(qId, audioBlob, videoBlob, duration).then(() => {
                finishInterview();
              });
            }).catch(() => finishInterview());
          } else {
             finishInterview();
          }
          
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(interval);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isLoading, authLoading, questions.length]);

  // Don't render if not authenticated
  if (!isAuthenticated) {
    return null;
  }

  // Instructions Overlay
  if (!hasStarted) {
    return (
      <div className="min-h-screen bg-background flex flex-col items-center justify-center p-6">
        <div className="max-w-2xl w-full bg-card border border-border/50 rounded-2xl p-8 space-y-6 shadow-sm">
          <h1 className="text-3xl font-bold text-foreground">Interview Instructions</h1>
          <div className="space-y-4 text-muted-foreground text-sm leading-relaxed">
            <p><strong>1. Time Limit:</strong> The total session time is strictly 10 minutes. The session will end automatically.</p>
            <p><strong>2. Continuous Flow:</strong> Your video and audio will be continuously recorded from the moment you start. The AI evaluates you throughout the session.</p>
            <p><strong>3. Environment:</strong> Do not refresh or leave this page. Stay in a quiet environment.</p>
            <p><strong>4. Navigation:</strong> Answer each question clearly, then simply click "Next" to automatically process and move to the next question. There is no pause.</p>
          </div>
          <div className="flex items-center gap-3 pt-4 border-t border-border/50">
            <input 
              type="checkbox" 
              id="accepted" 
              className="w-5 h-5 rounded border-accent text-accent focus:ring-accent accent-accent cursor-pointer"
              checked={instructionsAccepted}
              onChange={(e) => setInstructionsAccepted(e.target.checked)}
            />
            <label htmlFor="accepted" className="text-foreground font-medium cursor-pointer">
              I have read and confirm the instructions above.
            </label>
          </div>
          <Button 
            className="w-full h-12 text-lg font-semibold bg-accent text-accent-foreground hover:bg-accent/90 disabled:opacity-50"
            disabled={!instructionsAccepted}
            onClick={() => {
              setHasStarted(true); // Triggers loading state & camera request
            }}
          >
            Start Interview
          </Button>
        </div>
      </div>
    );
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
    );
  }

  if (permissionError) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center space-y-6 max-w-md px-4">
          <div className="mx-auto h-20 w-20 rounded-2xl bg-destructive/10 flex items-center justify-center">
            <VideoOff className="h-10 w-10 text-destructive" />
          </div>
          <div className="space-y-2">
            <h2 className="text-2xl font-bold text-foreground">
              Camera Access Required
            </h2>
            <p className="text-muted-foreground">
              We need access to your camera and microphone for the interview
              session. Please allow access in your browser settings and try
              again.
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
    );
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
            <span className="font-semibold text-foreground">
              Interview Session
            </span>
          </div>

          <div className="flex items-center gap-4">
            <div className={`flex items-center gap-2 px-3 py-1 rounded bg-secondary/50 text-sm font-bold ${globalTimeRemaining < 60 ? 'text-destructive animate-pulse' : 'text-foreground'}`}>
              <Clock className="h-4 w-4" />
              <span>
                {formatTime(globalTimeRemaining)} Time Left
              </span>
            </div>
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
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
                    className="absolute top-4 left-4 flex items-center justify-center h-4 w-4 rounded-full bg-destructive/90"
                  >
                    <span className="h-2 w-2 rounded-full bg-white animate-pulse" />
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
                {isCameraOn ? (
                  <Video className="h-5 w-5" />
                ) : (
                  <VideoOff className="h-5 w-5" />
                )}
              </Button>
              <Button
                variant="outline"
                size="lg"
                onClick={toggleMic}
                className={`bg-transparent border-border/50 ${!isMicOn && "text-destructive"}`}
              >
                {isMicOn ? (
                  <Mic className="h-5 w-5" />
                ) : (
                  <MicOff className="h-5 w-5" />
                )}
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
              <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div className="flex items-center gap-3 rounded-xl border border-border/50 bg-secondary/30 px-3 py-2">
                  <Switch
                    id="speak-questions"
                    checked={speakQuestionsAloud}
                    onCheckedChange={setSpeakPreference}
                  />
                  <Label htmlFor="speak-questions" className="text-sm cursor-pointer">
                    Read questions aloud automatically
                  </Label>
                </div>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => currentQuestion?.question && speakQuestion(currentQuestion.question)}
                  className="bg-transparent border-border/50 shrink-0"
                >
                  <Volume2 className="mr-2 h-4 w-4" />
                  Speak now
                </Button>
              </div>
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
                      <p className="text-sm font-medium text-foreground mb-1">
                        Tip
                      </p>
                      <p className="text-sm text-muted-foreground">
                        Take a moment to gather your thoughts before answering.
                        Structure your response with a clear beginning, middle,
                        and end.
                      </p>
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Action Bar */}
            <div className="space-y-4 pt-4 border-t border-border/50">
              <Button
                onClick={handleNextQuestion}
                disabled={isProcessing}
                className="w-full h-14 bg-accent text-accent-foreground hover:bg-accent/90 text-lg font-semibold disabled:opacity-80 disabled:cursor-not-allowed"
              >
                {isProcessing ? (
                  <><Loader2 className="mr-2 h-5 w-5 animate-spin" /> Processing...</>
                ) : currentQuestionIndex < questions.length - 1 ? (
                  <>Next <ArrowRight className="ml-2 h-5 w-5" /></>
                ) : (
                  <>Finish Interview <CheckCircle className="ml-2 h-5 w-5" /></>
                )}
              </Button>
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
  );
}
