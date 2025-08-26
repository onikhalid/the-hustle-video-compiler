/* eslint-disable @typescript-eslint/no-explicit-any */
"use client"

import { useState, useCallback } from "react"
import { VideoUploader } from "@/components/video-uploader"
import { VideoProcessingEngine } from "@/components/video-processing-engine"
import { VideoProcessor } from "@/components/video-processor"
import { ProcessingStatus } from "@/components/processing-status"
import { TimestampTracker } from "@/components/timestamp-tracker"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Play, Upload, Settings } from "lucide-react"
import type { TimestampEvent, VideoSegment } from "@/lib/video-processor"

interface VideoFile {
  id: string
  file: File
  name: string
  duration?: number
  url?: string
}

interface ProcessingJob {
  id: string
  status: "pending" | "processing" | "completed" | "error"
  progress: number
  videos: VideoFile[]
  outputUrl?: string
  timestamps?: TimestampEvent[]
  segments?: VideoSegment[]
  totalDuration?: number
}

export default function VideoProcessingApp() {
  const [videos, setVideos] = useState<VideoFile[]>([])
  const [processingJob, setProcessingJob] = useState<ProcessingJob | null>(null)
  const [showProcessingEngine, setShowProcessingEngine] = useState(false)
  const [showTimestampTracker, setShowTimestampTracker] = useState(false)

  const handleVideoUpload = (files: File[]) => {
    const newVideos = files.map((file, index) => ({
      id: `video-${Date.now()}-${index}`,
      file,
      name: file.name,
      url: URL.createObjectURL(file),
    }))
    setVideos((prev) => [...prev, ...newVideos])
  }

  const handleStartProcessing = () => {
    if (videos.length < 2 || videos.length > 6) {
      alert("Please upload 2-6 question videos to start processing.")
      return
    }

    setShowProcessingEngine(true)

    const job: ProcessingJob = {
      id: `job-${Date.now()}`,
      status: "pending",
      progress: 0,
      videos: videos,
    }

    setProcessingJob(job)
  }

  const handleProgressUpdate = useCallback((progress: number) => {
    setProcessingJob((prev) =>
      prev
        ? {
            ...prev,
            status: progress < 100 ? "processing" : "completed",
            progress,
          }
        : null,
    )
  }, [])

  const handleProcessingComplete = useCallback(
    (result: {
      outputUrl: string
      timestamps: TimestampEvent[]
      segments: VideoSegment[]
      totalDuration: number
    }) => {
      setProcessingJob((prev) =>
        prev
          ? {
              ...prev,
              status: "completed",
              progress: 100,
              outputUrl: result.outputUrl,
              timestamps: result.timestamps,
              segments: result.segments,
              totalDuration: result.totalDuration,
            }
          : null,
      )
    },
    [],
  )

  const handleReset = () => {
    setVideos([])
    setProcessingJob(null)
    setShowProcessingEngine(false)
    setShowTimestampTracker(false)
  }

  const handleShowTimestamps = () => {
    setShowTimestampTracker(true)
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b border-border bg-card">
        <div className="container mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary">
                <Play className="h-5 w-5 text-primary-foreground" />
              </div>
              <div>
                <h1 className="text-xl font-semibold text-foreground">Live TV Game Show Studio</h1>
                <p className="text-sm text-muted-foreground">Professional Video Processing with Animated Overlay Videos</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Button variant="outline" size="sm">
                <Settings className="h-4 w-4 mr-2" />
                Settings
              </Button>
            </div>
          </div>
        </div>
      </header>

      <div className="container mx-auto px-6 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Video Upload Section */}
          <div className="lg:col-span-2">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Upload className="h-5 w-5" />
                  Question Videos Upload
                </CardTitle>
                <CardDescription>Upload 2-6 question videos for your game show segment</CardDescription>
              </CardHeader>
              <CardContent>
                <VideoUploader
                  onUpload={handleVideoUpload}
                  maxFiles={6}
                  acceptedTypes={["video/mp4", "video/mov", "video/avi"]}
                />

                {videos.length > 0 && (
                  <div className="mt-6">
                    <h3 className="text-sm font-medium text-foreground mb-3">Uploaded Videos ({videos.length}/6)</h3>
                    <div className="space-y-3">
                      {videos.map((video, index) => (
                        <div key={video.id} className="flex items-center gap-3 p-3 bg-muted rounded-lg">
                          <div className="flex h-10 w-10 items-center justify-center rounded bg-primary/10">
                            <span className="text-sm font-medium text-primary">{index + 1}</span>
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium text-foreground truncate">{video.name}</p>
                            <p className="text-xs text-muted-foreground">Question Video {index + 1}</p>
                          </div>
                          {video.url && <video src={video.url} className="h-16 w-24 rounded object-cover" muted />}
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                <div className="mt-6 flex gap-3">
                  <Button
                    onClick={handleStartProcessing}
                    disabled={videos.length < 2 || videos.length > 6 || processingJob?.status === "processing"}
                    className="flex-1"
                  >
                    <Play className="h-4 w-4 mr-2" />
                    Start Processing ({videos.length} videos)
                  </Button>
                  <Button variant="outline" onClick={handleReset}>
                    Reset
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Processing Status Section */}
          <div>
            <ProcessingStatus job={processingJob} onShowTimestamps={handleShowTimestamps} />
          </div>
        </div>

        {/* Video Processing Engine */}
        {showProcessingEngine && videos.length >= 2 && videos.length <= 6 && (
          <div className="mt-8">
            <VideoProcessingEngine
              videos={videos}
              onProcessingComplete={handleProcessingComplete}
              onProgressUpdate={handleProgressUpdate}
            />
          </div>
        )}

        {/* Video Processor Section */}
        {processingJob && (
          <div className="mt-8">
            <VideoProcessor job={processingJob} />
          </div>
        )}

        {/* Timestamp Tracker */}
        {showTimestampTracker && processingJob?.timestamps && processingJob.totalDuration && (
          <div className="mt-8">
            <TimestampTracker
              totalDuration={processingJob.totalDuration}
              frameRate={30}
              initialEvents={
                processingJob.timestamps
                  ?.map((event, idx) => ({
                    // Ensure 'id' exists for each event
                    id: (event as any).id ?? `${event.type}-${idx}`,
                    event: (event as any).event ?? "",
                    time: event.time,
                    duration: (event as any).duration ?? 0,
                    type: event.type,
                    description: (event as any).description,
                    metadata: (event as any).metadata,
                  })) as import("@/lib/timestamp-manager").TimestampEvent[]
              }
              onEventSelect={(event) => console.log("Selected event:", event)}
              onTimeSeek={(time) => console.log("Seek to time:", time)}
            />
          </div>
        )}
      </div>
    </div>
  )
}
