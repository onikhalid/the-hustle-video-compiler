/* eslint-disable @typescript-eslint/no-explicit-any */
"use client"

import { useState, useEffect, useRef, useCallback, useMemo } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
import { Play, FileText } from "lucide-react"

import { VideoProcessor } from "@/lib/video-processor"

interface VideoProcessingEngineProps {
  videos: Array<{ id: string; file: File; name: string; size: number; duration?: number }>
  configuration: any
  onComplete?: (result: Blob) => void
  onProcessingStateChange?: (isProcessing: boolean) => void
}

export function VideoProcessingEngine({ videos, configuration, onComplete, onProcessingStateChange }: VideoProcessingEngineProps) {
  const [processor] = useState(() => new VideoProcessor())
  const [isProcessing, setIsProcessing] = useState(false)
  const [processingProgress, setProcessingProgress] = useState(0)
  const [currentStep, setCurrentStep] = useState("")
  const [processingComplete, setProcessingComplete] = useState(false)
  const [gameSession, setGameSession] = useState<any>(null)
  const [videoUrl, setVideoUrl] = useState<string | null>(null)
  const callbackSetRef = useRef(false)
  const processingStartedRef = useRef(false)

  // Processing options from configuration
  const processingOptions = useMemo(() => ({
    gameReadyDuration: configuration?.gameReadyDuration || 3,
    questionReadyDuration: configuration?.questionReadyDuration || 2,
    timeStartsDuration: configuration?.timeStartsDuration || 2,
    countdownDuration: configuration?.countdownDuration || 10,
    timeUpFetchingDuration: configuration?.timeUpFetchingDuration || 3,
    leaderboardDuration: configuration?.leaderboardDuration || 5,

    // Audio settings
    preserveOriginalAudio: configuration?.preserveOriginalAudio ?? true,
    backgroundAudioFile: configuration?.backgroundAudioFile,
    backgroundAudioVolume: configuration?.backgroundAudioVolume || 0.1,
    originalAudioVolume: configuration?.originalAudioVolume || 1.0,
    audioFadeInDuration: configuration?.audioFadeInDuration || 2,
    audioFadeOutDuration: configuration?.audioFadeOutDuration || 2,

    // Video settings
    aspectRatio: configuration?.aspectRatio || "original",
    scaleMode: configuration?.scaleMode || "fit",
    quality: configuration?.quality || "medium",
    resolution: configuration?.resolution || "1080p",

    // Custom overlays
    useCustomOverlays: configuration?.useCustomOverlays || false,
    customOverlayFiles: configuration?.customOverlayFiles || {},
  }), [configuration])

  useEffect(() => {
    if (!callbackSetRef.current) {
      processor.setProgressCallback((progress) => {
        setProcessingProgress(progress)
        const steps = processor.getProcessingSteps()
        const activeStep = steps.find((step) => !step.completed)
        setCurrentStep(activeStep?.step || "Processing complete")
      })
      callbackSetRef.current = true
    }
  }, [processor])

  const handleStartProcessing = useCallback(async () => {
    if (videos.length < 2 || videos.length > 6) return
    if (isProcessing || processingComplete || processingStartedRef.current) {
      console.log("[v0] Processing already in progress or complete, skipping")
      return
    }

    console.log("[v0] Starting video processing...")
    processingStartedRef.current = true
    setIsProcessing(true)
    onProcessingStateChange?.(true)

    try {
      console.log("[v0] Processing options being passed:", processingOptions)
      const { segments, timestamps, totalDuration, gameSession } = await processor.processVideos(
        videos.map((v) => v.file),
        processingOptions,
      )

      const outputBlob = await processor.compileVideoBlob(segments)

      // Create video URL for preview
      const url = URL.createObjectURL(outputBlob)
      setVideoUrl(url)

      // Store the game session for timestamp download
      setGameSession(gameSession)
      setProcessingComplete(true)

      // Call the completion callback with the video blob
      onComplete?.(outputBlob)
    } catch (error) {
      console.error("Processing failed:", error)
    } finally {
      setIsProcessing(false)
      onProcessingStateChange?.(false)
    }
  }, [videos, processor, processingOptions, onComplete, onProcessingStateChange, isProcessing, processingComplete])

  // Auto-start processing when component mounts
  useEffect(() => {
    if (videos.length >= 2 && !isProcessing && !processingComplete && !processingStartedRef.current) {
      console.log("[v0] Auto-starting processing from useEffect")
      handleStartProcessing()
    } else {
      console.log("[v0] Skipping auto-start:", { videosLength: videos.length, isProcessing, processingComplete, alreadyStarted: processingStartedRef.current })
    }
  }, [videos.length, isProcessing, processingComplete, handleStartProcessing])

  // Cleanup video URL when component unmounts
  useEffect(() => {
    return () => {
      if (videoUrl) {
        URL.revokeObjectURL(videoUrl)
      }
    }
  }, [videoUrl])

  const processingSteps = processor.getProcessingSteps()

  const handleDownloadTimestamps = () => {
    if (!gameSession) return

    const timestampsJson = JSON.stringify(gameSession, null, 2)
    const blob = new Blob([timestampsJson], { type: "application/json" })
    const url = URL.createObjectURL(blob)
    const a = document.createElement("a")
    a.href = url
    a.download = `game-session-timestamps-${Date.now()}.json`
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
  }

  if (processingComplete) {
    return (
      <div className="space-y-6">
        {/* Processing Complete */}
        <Card className="border-green-200 bg-green-50">
          <CardHeader>
            <CardTitle className="text-green-800">🎉 Processing Complete!</CardTitle>
            <CardDescription className="text-green-600">
              Video has been successfully compiled with all overlays and audio.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium">Final video ready for download</p>
                  <p className="text-sm text-muted-foreground">{videos.length} questions processed</p>
                </div>
                <Badge variant="outline" className="bg-green-100 text-green-800">
                  100% Complete
                </Badge>
              </div>

              {/* Video Preview */}
              {videoUrl && (
                <div className="pt-4 border-t">
                  <div className="space-y-3">
                    <h4 className="font-medium">Video Preview</h4>
                    <div className="relative bg-black rounded-lg overflow-hidden">
                      <video
                        src={videoUrl}
                        controls
                        className="w-full max-h-96 object-contain"
                        preload="metadata"
                      >
                        Your browser does not support the video tag.
                      </video>
                    </div>
                    <p className="text-xs text-muted-foreground">
                      Preview your compiled video before downloading
                    </p>
                  </div>
                </div>
              )}

              {gameSession && (
                <div className="pt-4 border-t">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-medium">Production Timestamps</p>
                      <p className="text-sm text-muted-foreground">
                        Download timestamps for streaming integration
                      </p>
                    </div>
                    <Button onClick={handleDownloadTimestamps} variant="outline">
                      <FileText className="h-4 w-4 mr-2" />
                      Download Timestamps
                    </Button>
                  </div>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Processing Progress */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Play className="h-5 w-5" />
            Processing Video
          </CardTitle>
          <CardDescription>
            Compiling video with {videos.length} questions and overlay videos
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Progress Bar */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium">Overall Progress</span>
              <span className="text-sm text-muted-foreground">{Math.round(processingProgress)}%</span>
            </div>
            <Progress value={processingProgress} className="h-3" />
          </div>

          {/* Current Step */}
          <div className="space-y-2">
            <h4 className="text-sm font-medium">Current Step</h4>
            <p className="text-sm text-muted-foreground">
              {currentStep || "Initializing..."}
            </p>
          </div>

          {/* Processing Steps */}
          <div className="space-y-2">
            <h4 className="text-sm font-medium">Processing Steps</h4>
            <div className="space-y-2">
              {processingSteps.map((step, index) => (
                <div key={index} className="flex items-center gap-3 p-3 bg-muted rounded-lg">
                  <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-medium ${
                    step.completed
                      ? 'bg-green-500 text-white'
                      : step.step === currentStep
                      ? 'bg-blue-500 text-white'
                      : 'bg-gray-300 text-gray-600'
                  }`}>
                    {step.completed ? '✓' : index + 1}
                  </div>
                  <div className="flex-1">
                    <p className="text-sm font-medium">{step.step}</p>
                    <p className="text-xs text-muted-foreground">Step {index + 1} of {processingSteps.length}</p>
                  </div>
                  {step.step === currentStep && !step.completed && (
                    <div className="animate-spin w-4 h-4 border-2 border-blue-500 border-t-transparent rounded-full" />
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Video Information */}
          <div className="space-y-2">
            <h4 className="text-sm font-medium">Video Information</h4>
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <span className="text-muted-foreground">Questions:</span>
                <span className="ml-2 font-medium">{videos.length}</span>
              </div>
              <div>
                <span className="text-muted-foreground">Status:</span>
                <span className="ml-2 font-medium">
                  {isProcessing ? 'Processing...' : 'Ready'}
                </span>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}