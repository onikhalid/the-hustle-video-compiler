/* eslint-disable @typescript-eslint/no-explicit-any */
"use client"

import { useState, useEffect, useRef } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { VideoProcessor, type ProcessingOptions, type VideoSegment, type TimestampEvent } from "@/lib/video-processor"
import { getOverlayConfig, validateOverlayFiles } from "@/lib/overlay-config"
import { Settings, Play, LucideRatio as AspectRatio } from "lucide-react"

interface VideoProcessingEngineProps {
  videos: Array<{ id: string; file: File; name: string }>
  onProcessingComplete: (result: {
    outputUrl: string
    timestamps: TimestampEvent[]
    segments: VideoSegment[]
    totalDuration: number
  }) => void
  onProgressUpdate: (progress: number) => void
}

export function VideoProcessingEngine({ videos, onProcessingComplete, onProgressUpdate }: VideoProcessingEngineProps) {
  const [processor] = useState(() => new VideoProcessor())
  // const [overlayGenerator] = useState(() => new TextOverlayGenerator())
  const [isProcessing, setIsProcessing] = useState(false)
  const [currentStep, setCurrentStep] = useState("")

  const [videoDurations, setVideoDurations] = useState<Record<string, number>>({})
  const callbackSetRef = useRef(false)

  const getVideoDuration = (file: File): Promise<number> => {
    return new Promise((resolve) => {
      const video = document.createElement("video")
      video.preload = "metadata"

      video.onloadedmetadata = () => {
        window.URL.revokeObjectURL(video.src)
        resolve(video.duration)
      }

      video.onerror = () => {
        window.URL.revokeObjectURL(video.src)
        resolve(9) // fallback to 9 seconds if can't read duration
      }

      video.src = URL.createObjectURL(file)
    })
  }

  useEffect(() => {
    const loadVideoDurations = async () => {
      const durations: Record<string, number> = {}

      for (const video of videos) {
        if (!videoDurations[video.id]) {
          durations[video.id] = await getVideoDuration(video.file)
        } else {
          durations[video.id] = videoDurations[video.id]
        }
      }

      setVideoDurations(durations)
    }

    if (videos.length > 0) {
      loadVideoDurations()
    }
  }, [videos])

  const [processingOptions, setProcessingOptions] = useState<
    ProcessingOptions & {
      aspectRatio?: "original" | "16:9" | "9:16" | "4:5" | "5:4" | "1:1" | "custom"
      customWidth?: number
      customHeight?: number
      scaleMode?: "fit" | "fill" | "stretch"
      quality?: "low" | "medium" | "high" | "ultra"
      resolution?: "720p" | "1080p" | "4k"
    }
  >({
    gameReadyDuration: 3,
    questionReadyDuration: 2,
    timeStartsDuration: 2,
    countdownDuration: 10,
    timeUpFetchingDuration: 3,
    leaderboardDuration: 5,
    aspectRatio: "original",
    scaleMode: "fit",
    quality: "medium",
    resolution: "1080p",
  })

  useEffect(() => {
    if (!callbackSetRef.current) {
      processor.setProgressCallback((progress) => {
        onProgressUpdate(progress)

        const steps = processor.getProcessingSteps()
        const activeStep = steps.find((step) => !step.completed)
        setCurrentStep(activeStep?.step || "Processing complete")
      })
      callbackSetRef.current = true
    }
  }, [processor, onProgressUpdate])



  const handleStartProcessing = async () => {
    if (videos.length < 2 || videos.length > 6) return

    setIsProcessing(true)

    try {
      const { segments, timestamps, totalDuration } = await processor.processVideos(
        videos.map((v) => v.file),
        processingOptions,
      )

      const outputUrl = await processor.compileVideo(segments)

      onProcessingComplete({
        outputUrl,
        timestamps,
        segments,
        totalDuration,
      })
    } catch (error) {
      console.error("Processing failed:", error)
    } finally {
      setIsProcessing(false)
    }
  }

  const processingSteps = processor.getProcessingSteps()

  return (
    <div className="space-y-6">
      {/* Processing Configuration */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Settings className="h-5 w-5" />
            Processing Configuration
          </CardTitle>
          <CardDescription>
            Configure timing and aspect ratio for your game show video with animated overlay videos (2-6 questions supported)
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Video Output Settings */}
          <div className="space-y-4">
            <h4 className="text-sm font-medium flex items-center gap-2">
              <AspectRatio className="h-4 w-4" />
              Video Output Settings
            </h4>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="space-y-2">
                <Label htmlFor="aspect-ratio">Aspect Ratio</Label>
                <Select
                  value={processingOptions.aspectRatio}
                  onValueChange={(value: any) => setProcessingOptions((prev) => ({ ...prev, aspectRatio: value }))}
                  disabled={isProcessing}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select aspect ratio" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="original">Original (from video)</SelectItem>
                    <SelectItem value="16:9">16:9 (Landscape)</SelectItem>
                    <SelectItem value="9:16">9:16 (Portrait)</SelectItem>
                    <SelectItem value="4:5">4:5 (Instagram)</SelectItem>
                    <SelectItem value="5:4">5:4 (Slightly wide)</SelectItem>
                    <SelectItem value="1:1">1:1 (Square)</SelectItem>
                    <SelectItem value="custom">Custom</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="scale-mode">Scale Mode</Label>
                <Select
                  value={processingOptions.scaleMode}
                  onValueChange={(value: any) => setProcessingOptions((prev) => ({ ...prev, scaleMode: value }))}
                  disabled={isProcessing}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select scale mode" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="fit">Fit (letterbox, no stretching)</SelectItem>
                    <SelectItem value="fill">Fill (crop to fit)</SelectItem>
                    <SelectItem value="stretch">Stretch (may distort)</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="quality">Quality</Label>
                <Select
                  value={processingOptions.quality}
                  onValueChange={(value: any) => setProcessingOptions((prev) => ({ ...prev, quality: value }))}
                  disabled={isProcessing}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select quality" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="low">Low (fast)</SelectItem>
                    <SelectItem value="medium">Medium</SelectItem>
                    <SelectItem value="high">High</SelectItem>
                    <SelectItem value="ultra">Ultra (slow)</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="resolution">Resolution</Label>
                <Select
                  value={processingOptions.resolution}
                  onValueChange={(value: any) => setProcessingOptions((prev) => ({ ...prev, resolution: value }))}
                  disabled={isProcessing}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select resolution" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="720p">720p</SelectItem>
                    <SelectItem value="1080p">1080p</SelectItem>
                    <SelectItem value="4k">4K</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Custom Dimensions Inputs */}
            {processingOptions.aspectRatio === "custom" && (
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="custom-width">Custom Width</Label>
                  <Input
                    id="custom-width"
                    type="number"
                    min="480"
                    max="3840"
                    value={processingOptions.customWidth || 1920}
                    onChange={(e) =>
                      setProcessingOptions((prev) => ({
                        ...prev,
                        customWidth: Number.parseInt(e.target.value) || 1920,
                      }))
                    }
                    disabled={isProcessing}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="custom-height">Custom Height</Label>
                  <Input
                    id="custom-height"
                    type="number"
                    min="480"
                    max="2160"
                    value={processingOptions.customHeight || 1080}
                    onChange={(e) =>
                      setProcessingOptions((prev) => ({
                        ...prev,
                        customHeight: Number.parseInt(e.target.value) || 1080,
                      }))
                    }
                    disabled={isProcessing}
                  />
                </div>
              </div>
            )}
          </div>

          {/* Separator Between Sections */}
          <div className="border-t pt-4">
            <h4 className="text-sm font-medium mb-4">Overlay Video Timing Settings</h4>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label htmlFor="game-ready-duration">Game Ready Duration (seconds)</Label>
                <Input
                  id="game-ready-duration"
                  type="number"
                  min="1"
                  max="10"
                  value={processingOptions.gameReadyDuration}
                  onChange={(e) =>
                    setProcessingOptions((prev) => ({
                      ...prev,
                      gameReadyDuration: Number.parseInt(e.target.value) || 3,
                    }))
                  }
                  disabled={isProcessing}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="question-ready-duration">Question Ready Duration (seconds)</Label>
                <Input
                  id="question-ready-duration"
                  type="number"
                  min="1"
                  max="5"
                  value={processingOptions.questionReadyDuration}
                  onChange={(e) =>
                    setProcessingOptions((prev) => ({
                      ...prev,
                      questionReadyDuration: Number.parseInt(e.target.value) || 2,
                    }))
                  }
                  disabled={isProcessing}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="time-starts-duration">Time Starts Duration (seconds)</Label>
                <Input
                  id="time-starts-duration"
                  type="number"
                  min="1"
                  max="5"
                  value={processingOptions.timeStartsDuration}
                  onChange={(e) =>
                    setProcessingOptions((prev) => ({
                      ...prev,
                      timeStartsDuration: Number.parseInt(e.target.value) || 2,
                    }))
                  }
                  disabled={isProcessing}
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-4">
              <div className="space-y-2">
                <Label htmlFor="countdown-duration">Countdown Duration (seconds)</Label>
                <Input
                  id="countdown-duration"
                  type="number"
                  min="5"
                  max="30"
                  value={processingOptions.countdownDuration}
                  onChange={(e) =>
                    setProcessingOptions((prev) => ({
                      ...prev,
                      countdownDuration: Number.parseInt(e.target.value) || 10,
                    }))
                  }
                  disabled={isProcessing}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="time-up-duration">Time Up Fetching Duration (seconds)</Label>
                <Input
                  id="time-up-duration"
                  type="number"
                  min="1"
                  max="10"
                  value={processingOptions.timeUpFetchingDuration}
                  onChange={(e) =>
                    setProcessingOptions((prev) => ({
                      ...prev,
                      timeUpFetchingDuration: Number.parseInt(e.target.value) || 3,
                    }))
                  }
                  disabled={isProcessing}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="leaderboard-duration">Leaderboard Duration (seconds)</Label>
                <Input
                  id="leaderboard-duration"
                  type="number"
                  min="1"
                  max="15"
                  value={processingOptions.leaderboardDuration}
                  onChange={(e) =>
                    setProcessingOptions((prev) => ({
                      ...prev,
                      leaderboardDuration: Number.parseInt(e.target.value) || 5,
                    }))
                  }
                  disabled={isProcessing}
                />
              </div>
            </div>
          </div>
        </CardContent>
      </Card>



      {/* Processing Controls */}
      <Card>
        <CardHeader>
          <CardTitle>Video Processing Engine</CardTitle>
          <CardDescription>
            Process {videos.length} videos with animated overlay videos using FFmpeg (supports 2-6 videos, preserves aspect ratios)
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Processing Steps */}
          <div className="space-y-3">
            <h4 className="text-sm font-medium">Processing Pipeline</h4>
            {processingSteps.map((step, index) => (
              <div key={index} className="flex items-center gap-3">
                <div
                  className={`h-2 w-2 rounded-full ${
                    step.completed
                      ? "bg-green-500"
                      : currentStep === step.step
                        ? "bg-blue-500 animate-pulse"
                        : "bg-gray-300"
                  }`}
                />
                <span
                  className={`text-sm ${
                    currentStep === step.step ? "text-foreground font-medium" : "text-muted-foreground"
                  }`}
                >
                  {step.step}
                </span>
                <Badge variant="outline" className="ml-auto text-xs">
                  {step.progress}%
                </Badge>
              </div>
            ))}
          </div>

          {/* Current Step */}
          {isProcessing && (
            <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg">
              <p className="text-sm text-blue-800 font-medium">Currently: {currentStep}</p>
            </div>
          )}

          {/* Processing Controls */}
          <div className="flex gap-3">
            <Button
              onClick={handleStartProcessing}
              disabled={videos.length < 2 || videos.length > 6 || isProcessing}
              className="flex-1"
            >
              {isProcessing ? (
                <>
                  <div className="h-4 w-4 border-2 border-white/25 border-t-white rounded-full animate-spin mr-2" />
                  Processing with FFmpeg...
                </>
              ) : (
                <>
                  <Play className="h-4 w-4 mr-2" />
                  Start Processing ({videos.length}/6 videos)
                </>
              )}
            </Button>
          </div>

          {/* Video Preview */}
          <div className="space-y-3">
            <h4 className="text-sm font-medium">Video Sequence Preview</h4>
            {/* Aspect Ratio Info */}
            <div className="p-2 bg-muted rounded text-xs text-muted-foreground">
              Output:{" "}
              {processingOptions.aspectRatio === "custom"
                ? `${processingOptions.customWidth}x${processingOptions.customHeight}`
                : processingOptions.aspectRatio}{" "}
              • {processingOptions.scaleMode} scaling • {processingOptions.quality} quality
            </div>
            <div className="grid grid-cols-1 gap-2 text-sm">
              {/* Initial Game Ready */}
              <div className="space-y-1">
                <div className="flex items-center gap-2 p-2 bg-muted rounded">
                  <Badge variant="outline">START</Badge>
                  <span className="truncate">Game Get Ready</span>
                </div>
                <div className="ml-6 space-y-1 text-xs text-muted-foreground">
                  <div>
                    → Game Ready Video ({processingOptions.gameReadyDuration}s)
                  </div>
                </div>
              </div>

              {videos.map((video, index) => (
                <div key={video.id} className="space-y-1">
                  <div className="flex items-center gap-2 p-2 bg-muted rounded">
                    <Badge variant="outline">Q{index + 1}</Badge>
                    <span className="truncate">{video.name}</span>
                  </div>
                  <div className="ml-6 space-y-1 text-xs text-muted-foreground">
                    <div>
                      → Question {index + 1} Ready Video ({processingOptions.questionReadyDuration}s)
                    </div>
                    <div>
                      → Video plays (
                      {videoDurations[video.id] ? `${videoDurations[video.id].toFixed(1)}s` : "loading..."}, aspect
                      ratio preserved)
                    </div>
                    <div>
                      → Time Starts Video ({processingOptions.timeStartsDuration}s)
                    </div>
                    <div>
                      → Countdown Video ({processingOptions.countdownDuration}s)
                    </div>
                    <div>
                      → Time Up Fetching Video ({processingOptions.timeUpFetchingDuration}s)
                    </div>
                    <div>
                      → Leaderboard Video ({processingOptions.leaderboardDuration}s)
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
