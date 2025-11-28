"use client"

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Play, Pause, SkipForward, SkipBack, Download } from "lucide-react"
import { useState, useRef, useEffect } from "react"

interface ProcessingJob {
  id: string
  status: "pending" | "processing" | "completed" | "error"
  progress: number
  videos: Array<{
    id: string
    name: string
  }>
  outputUrl?: string
  timestamps?: Array<{
    event: string
    time: number
    duration: number
  }>
}

interface VideoProcessorProps {
  job: ProcessingJob
}

export function VideoProcessor({ job }: VideoProcessorProps) {
  const [isPlaying, setIsPlaying] = useState(false)
  const [currentTime, setCurrentTime] = useState(0)
  const [duration, setDuration] = useState(0)
  const videoRef = useRef<HTMLVideoElement>(null)

  useEffect(() => {
    const video = videoRef.current
    if (!video) return

    const handleTimeUpdate = () => setCurrentTime(video.currentTime)
    const handleLoadedMetadata = () => setDuration(video.duration)
    const handlePlay = () => setIsPlaying(true)
    const handlePause = () => setIsPlaying(false)

    video.addEventListener("timeupdate", handleTimeUpdate)
    video.addEventListener("loadedmetadata", handleLoadedMetadata)
    video.addEventListener("play", handlePlay)
    video.addEventListener("pause", handlePause)

    return () => {
      video.removeEventListener("timeupdate", handleTimeUpdate)
      video.removeEventListener("loadedmetadata", handleLoadedMetadata)
      video.removeEventListener("play", handlePlay)
      video.removeEventListener("pause", handlePause)
    }
  }, [job.outputUrl])

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60)
    const secs = Math.floor(seconds % 60)
    return `${mins}:${secs.toString().padStart(2, "0")}`
  }

  const getEventTypeColor = (event: string) => {
    if (event.includes("Question")) return "bg-blue-100 text-blue-800"
    if (event.includes("Answer")) return "bg-orange-100 text-orange-800"
    if (event.includes("Result")) return "bg-green-100 text-green-800"
    return "bg-gray-100 text-gray-800"
  }

  const handlePlayPause = () => {
    const video = videoRef.current
    if (!video) return

    if (isPlaying) {
      video.pause()
    } else {
      video.play()
    }
  }

  const handleSkipBack = () => {
    const video = videoRef.current
    if (!video) return
    video.currentTime = Math.max(0, video.currentTime - 10)
  }

  const handleSkipForward = () => {
    const video = videoRef.current
    if (!video) return
    video.currentTime = Math.min(video.duration, video.currentTime + 10)
  }

  const handleDownload = () => {
    if (!job.outputUrl) return

    const link = document.createElement("a")
    link.href = job.outputUrl
    link.download = `game-show-video-${job.id}.webm`
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Video Processing Timeline</CardTitle>
        <CardDescription>Preview and timeline for video</CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Video Preview */}
        <div className="aspect-video bg-black rounded-lg flex items-center justify-center relative overflow-hidden">
          {job.status === "completed" && job.outputUrl ? (
            <video
              ref={videoRef}
              src={job.outputUrl}
              className="w-full h-full object-contain"
              controls={false}
              playsInline
            />
          ) : job.status === "completed" ? (
            <div className="text-white text-center">
              <Play className="h-16 w-16 mx-auto mb-4 opacity-75" />
              <p className="text-lg font-medium">Video Processing Complete</p>
              <p className="text-sm opacity-75">No video output available</p>
            </div>
          ) : (
            <div className="text-white/75 text-center">
              <div className="h-16 w-16 border-4 border-white/25 border-t-white rounded-full animate-spin mx-auto mb-4" />
              <p className="text-lg font-medium">Processing Video...</p>
              <p className="text-sm">{Math.round(job.progress)}% complete</p>
            </div>
          )}
        </div>

        {/* Video Controls */}
        {job.status === "completed" && job.outputUrl && (
          <div className="space-y-4">
            <div className="flex items-center justify-center gap-2">
              <Button variant="outline" size="sm" onClick={handleSkipBack}>
                <SkipBack className="h-4 w-4" />
              </Button>
              <Button size="sm" onClick={handlePlayPause} className="px-6">
                {isPlaying ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
              </Button>
              <Button variant="outline" size="sm" onClick={handleSkipForward}>
                <SkipForward className="h-4 w-4" />
              </Button>
            </div>

            <div className="flex items-center justify-between text-sm text-muted-foreground">
              <span>
                {formatTime(currentTime)} / {formatTime(duration)}
              </span>
              <Button variant="outline" size="sm" onClick={handleDownload}>
                <Download className="h-4 w-4 mr-2" />
                Download Video
              </Button>
            </div>

            <div className="w-full bg-muted rounded-full h-2">
              <div
                className="bg-primary h-2 rounded-full transition-all duration-200"
                style={{ width: duration > 0 ? `${(currentTime / duration) * 100}%` : "0%" }}
              />
            </div>
          </div>
        )}

        {/* Timeline */}
        {job.timestamps && (
          <div className="space-y-4">
            <h4 className="text-sm font-medium">Event Timeline</h4>
            <div className="space-y-2">
              {job.timestamps.map((timestamp, index) => (
                <div
                  key={index}
                  className="flex items-center gap-3 p-3 bg-muted rounded-lg hover:bg-muted/80 transition-colors cursor-pointer"
                >
                  <div className="text-sm font-mono text-muted-foreground min-w-0">{formatTime(timestamp.time)}</div>
                  <Badge variant="secondary" className={getEventTypeColor(timestamp.event)}>
                    {timestamp.event}
                  </Badge>
                  <div className="text-sm text-muted-foreground">({timestamp.duration}s)</div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Processing Steps */}
        <div className="space-y-3">
          <h4 className="text-sm font-medium">Processing Steps</h4>
          <div className="space-y-2 text-sm">
            <div className="flex items-center gap-2">
              <div className="h-2 w-2 rounded-full bg-green-500" />
              <span>Video upload completed</span>
            </div>
            <div className="flex items-center gap-2">
              <div className={`h-2 w-2 rounded-full ${job.progress > 20 ? "bg-green-500" : "bg-gray-300"}`} />
              <span>Adding answer question overlays (10s each)</span>
            </div>
            <div className="flex items-center gap-2">
              <div className={`h-2 w-2 rounded-full ${job.progress > 60 ? "bg-green-500" : "bg-gray-300"}`} />
              <span>Adding result reveal overlays (5s each)</span>
            </div>
            <div className="flex items-center gap-2">
              <div className={`h-2 w-2 rounded-full ${job.status === "completed" ? "bg-green-500" : "bg-gray-300"}`} />
              <span>Compiling final video with timestamps</span>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
