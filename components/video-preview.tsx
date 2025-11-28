/* eslint-disable @typescript-eslint/no-explicit-any */
"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Separator } from "@/components/ui/separator"
import { Eye, Clock, Volume2, Video, FileText, Play } from "lucide-react"

import type { VideoFile } from "./video-workflow"
import { getVideoSequence } from "@/lib/overlay-config"

interface VideoPreviewProps {
  videos: VideoFile[]
  configuration: any
  onStartProcessing?: () => void
}

export function VideoPreview({ videos, configuration, onStartProcessing }: VideoPreviewProps) {
  const [totalDuration, setTotalDuration] = useState(0)
  const [sequence, setSequence] = useState<any[]>([])

  useEffect(() => {
    if (!configuration || videos.length === 0) return

    // Calculate total duration
    let duration = 0
    duration += configuration.gameReadyDuration || 3

    videos.forEach((video, index) => {
      duration += configuration.questionReadyDuration || 2
      duration += video.duration || 30 // Estimated if not available
      duration += configuration.timeStartsDuration || 2
      duration += configuration.countdownDuration || 10
      duration += configuration.timeUpFetchingDuration || 3
      duration += configuration.leaderboardDuration || 5
    })

    setTotalDuration(duration)

    // Generate sequence
    const videoSequence = getVideoSequence(videos.length)
    setSequence(videoSequence)
  }, [videos, configuration])

  const formatDuration = (seconds: number) => {
    const mins = Math.floor(seconds / 60)
    const secs = seconds % 60
    return `${mins}:${secs.toString().padStart(2, '0')}`
  }

  const getSegmentDuration = (segmentType: string, questionIndex?: number) => {
    switch (segmentType) {
      case 'Game Get Ready':
        return configuration.gameReadyDuration || 3
      case 'Question Ready':
        return configuration.questionReadyDuration || 2
      case 'Time Starts':
        return configuration.timeStartsDuration || 2
      case 'Countdown':
        return configuration.countdownDuration || 10
      case 'Time Up - Fetching Results':
        return configuration.timeUpFetchingDuration || 3
      case 'Leaderboard/Results':
        return configuration.leaderboardDuration || 5
      default:
        if (questionIndex !== undefined) {
          return videos[questionIndex - 1]?.duration || 30
        }
        return 0
    }
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Eye className="h-5 w-5" />
            Video Sequence Preview
          </CardTitle>
          <CardDescription>
            Review the complete video sequence before processing
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Summary Stats */}
            <div className="space-y-4">
              <div className="space-y-2">
                <h3 className="font-semibold flex items-center gap-2">
                  <FileText className="h-4 w-4" />
                  Summary
                </h3>
                <div className="space-y-1 text-sm">
                  <div className="flex justify-between">
                    <span>Total Questions:</span>
                    <Badge variant="outline">{videos.length}</Badge>
                  </div>
                  <div className="flex justify-between">
                    <span>Total Duration:</span>
                    <Badge variant="outline">{formatDuration(totalDuration)}</Badge>
                  </div>
                  <div className="flex justify-between">
                    <span>Total Segments:</span>
                    <Badge variant="outline">{sequence.length}</Badge>
                  </div>
                </div>
              </div>

              <Separator />

              <div className="space-y-2">
                <h3 className="font-semibold flex items-center gap-2">
                  <Volume2 className="h-4 w-4" />
                  Audio Settings
                </h3>
                <div className="space-y-1 text-sm">
                  <div className="flex justify-between">
                    <span>Original Audio:</span>
                    <Badge variant={configuration.preserveOriginalAudio ? "default" : "secondary"}>
                      {configuration.preserveOriginalAudio ? "Enabled" : "Disabled"}
                    </Badge>
                  </div>
                  {configuration.preserveOriginalAudio && (
                    <div className="flex justify-between">
                      <span>Volume:</span>
                      <span className="text-muted-foreground">{Math.round(configuration.originalAudioVolume * 100)}%</span>
                    </div>
                  )}
                  <div className="flex justify-between">
                    <span>Background Audio:</span>
                    <Badge variant={configuration.backgroundAudioFile ? "default" : "secondary"}>
                      {configuration.backgroundAudioFile ? "Yes" : "No"}
                    </Badge>
                  </div>
                  {configuration.backgroundAudioFile && (
                    <div className="flex justify-between">
                      <span>BG Volume:</span>
                      <span className="text-muted-foreground">{Math.round(configuration.backgroundAudioVolume * 100)}%</span>
                    </div>
                  )}
                </div>
              </div>

              <Separator />

              <div className="space-y-2">
                <h3 className="font-semibold flex items-center gap-2">
                  <Video className="h-4 w-4" />
                  Video Settings
                </h3>
                <div className="space-y-1 text-sm">
                  <div className="flex justify-between">
                    <span>Aspect Ratio:</span>
                    <span className="text-muted-foreground">{configuration.aspectRatio}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Resolution:</span>
                    <span className="text-muted-foreground">{configuration.resolution}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Quality:</span>
                    <span className="text-muted-foreground capitalize">{configuration.quality}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Custom Overlays:</span>
                    <Badge variant={configuration.useCustomOverlays ? "default" : "secondary"}>
                      {configuration.useCustomOverlays ? "Yes" : "No"}
                    </Badge>
                  </div>
                </div>
              </div>
            </div>

            {/* Video Sequence */}
            <div className="lg:col-span-2 space-y-4">
              <h3 className="font-semibold flex items-center gap-2">
                <Clock className="h-4 w-4" />
                Complete Sequence
              </h3>
              
              <div className="space-y-2 max-h-96 overflow-y-auto">
                {sequence.map((segment, index) => {
                  const duration = getSegmentDuration(segment.description, segment.questionIndex)
                  const isQuestionVideo = segment.type === 'uploaded-video'
                  
                  return (
                    <div key={index} className="flex items-center gap-3 p-3 bg-muted rounded-lg">
                      <div className="flex-shrink-0">
                        <Badge variant={isQuestionVideo ? "default" : "outline"}>
                          {index + 1}
                        </Badge>
                      </div>
                      
                      <div className="flex-1 min-w-0">
                        <div className="font-medium truncate">
                          {segment.description}
                        </div>
                        {isQuestionVideo && (
                          <div className="text-sm text-muted-foreground truncate">
                            {videos[segment.questionIndex - 1]?.name}
                          </div>
                        )}
                      </div>
                      
                      <div className="flex-shrink-0 text-sm text-muted-foreground">
                        {formatDuration(duration)}
                      </div>
                      
                      <div className="flex-shrink-0">
                        <Badge variant={isQuestionVideo ? "default" : "secondary"} className="text-xs">
                          {isQuestionVideo ? "Video" : "Overlay"}
                        </Badge>
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Timing Breakdown */}
      <Card>
        <CardHeader>
          <CardTitle>Timing Breakdown</CardTitle>
          <CardDescription>
            Detailed timing for each question cycle
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {/* Initial Game Ready */}
            <div className="p-4 bg-blue-50 rounded-lg">
              <div className="flex justify-between items-center">
                <span className="font-medium">Game Get Ready</span>
                <Badge variant="outline">{formatDuration(configuration.gameReadyDuration || 3)}</Badge>
              </div>
            </div>

            {/* Question Cycles */}
            {videos.map((video, index) => {
              const questionDuration = (configuration.questionReadyDuration || 2) +
                                     (video.duration || 30) +
                                     (configuration.timeStartsDuration || 2) +
                                     (configuration.countdownDuration || 10) +
                                     (configuration.timeUpFetchingDuration || 3) +
                                     (configuration.leaderboardDuration || 5)

              return (
                <div key={video.id} className="p-4 bg-green-50 rounded-lg space-y-2">
                  <div className="flex justify-between items-center">
                    <span className="font-medium">Question {index + 1} Cycle</span>
                    <Badge variant="outline">{formatDuration(questionDuration)}</Badge>
                  </div>
                  
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-2 text-sm">
                    <div className="flex justify-between">
                      <span>Ready:</span>
                      <span>{formatDuration(configuration.questionReadyDuration || 2)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Video:</span>
                      <span>{formatDuration(video.duration || 30)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Time Starts:</span>
                      <span>{formatDuration(configuration.timeStartsDuration || 2)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Countdown:</span>
                      <span>{formatDuration(configuration.countdownDuration || 10)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Time Up:</span>
                      <span>{formatDuration(configuration.timeUpFetchingDuration || 3)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Results:</span>
                      <span>{formatDuration(configuration.leaderboardDuration || 5)}</span>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        </CardContent>
      </Card>

      {/* Start Processing Button */}
      <Card className="border-green-200 bg-green-50">
        <CardHeader>
          <CardTitle className="text-green-800">Ready to Process</CardTitle>
          <CardDescription className="text-green-600">
            Video sequence is configured and ready for processing.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between">
            <div className="space-y-1">
              <p className="text-sm font-medium">Total Duration: {formatDuration(totalDuration)}</p>
              <p className="text-sm text-muted-foreground">{videos.length} questions • {sequence.length} segments</p>
            </div>
            <Button onClick={onStartProcessing} size="lg" className="bg-green-600 hover:bg-green-700">
              <Play className="h-4 w-4 mr-2" />
              Start Processing
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
