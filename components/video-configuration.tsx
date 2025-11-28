"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Label } from "@/components/ui/label"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Switch } from "@/components/ui/switch"
import { Slider } from "@/components/ui/slider"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Upload, Volume2, Clock, Video, Settings } from "lucide-react"

import type { VideoFile } from "./video-workflow"
import type { ProcessingOptions } from "@/lib/video-processor"

interface VideoConfigurationProps {
  videos: VideoFile[]
  configuration: any
  onConfigurationChange: (config: any) => void
}

export function VideoConfiguration({ videos, configuration, onConfigurationChange }: VideoConfigurationProps) {
  const [config, setConfig] = useState<ProcessingOptions & {
    aspectRatio?: "original" | "16:9" | "9:16" | "4:5" | "5:4" | "1:1" | "custom"
    customWidth?: number
    customHeight?: number
    scaleMode?: "fit" | "fill" | "stretch"
    quality?: "low" | "medium" | "high" | "ultra"
    resolution?: "720p" | "1080p" | "4k"
    useCustomOverlays?: boolean
    customOverlayFiles?: { [key: string]: File }
  }>({
    // Timing settings
    gameReadyDuration: 3,
    questionReadyDuration: 2,
    timeStartsDuration: 2,
    countdownDuration: 10,
    timeUpFetchingDuration: 3,
    leaderboardDuration: 5,
    
    // Audio settings
    preserveOriginalAudio: true,
    backgroundAudioVolume: 0.1, // Very subtle background audio
    originalAudioVolume: 1.0,
    audioFadeInDuration: 2,
    audioFadeOutDuration: 2,
    
    // Video settings
    aspectRatio: "original",
    scaleMode: "fit",
    quality: "medium",
    resolution: "1080p",
    
    // Custom overlays
    useCustomOverlays: false,
    customOverlayFiles: {}
  })

  useEffect(() => {
    onConfigurationChange(config)
  }, [config, onConfigurationChange])

  const handleTimingChange = (key: string, value: number) => {
    setConfig(prev => ({ ...prev, [key]: value }))
  }

  const handleAudioChange = (key: string, value: number | boolean | File | undefined) => {
    setConfig(prev => ({ ...prev, [key]: value }))
  }

  const handleCustomOverlayUpload = (overlayType: string, file: File | null) => {
    setConfig(prev => ({
      ...prev,
      customOverlayFiles: {
        ...prev.customOverlayFiles,
        [overlayType]: file
      }
    }))
  }

  const overlayTypes = [
    { key: "gameReady", label: "Game Get Ready", description: "Shown at the start" },
    { key: "questionReady", label: "Question Ready", description: "Before each question" },
    { key: "timeStarts", label: "Time Starts", description: "After question video" },
    { key: "countdown", label: "Countdown", description: "Timer countdown" },
    { key: "timeUpFetching", label: "Time Up", description: "Fetching results" },
    { key: "leaderboard", label: "Leaderboard", description: "Results display" }
  ]

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Settings className="h-5 w-5" />
          Video Configuration
        </CardTitle>
        <CardDescription>
          Configure timing, audio, and overlay settings for your {videos.length} question videos
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Tabs defaultValue="timing" className="space-y-6">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="timing" className="flex items-center gap-2">
              <Clock className="h-4 w-4" />
              Timing
            </TabsTrigger>
            <TabsTrigger value="audio" className="flex items-center gap-2">
              <Volume2 className="h-4 w-4" />
              Audio
            </TabsTrigger>
            <TabsTrigger value="video" className="flex items-center gap-2">
              <Video className="h-4 w-4" />
              Video
            </TabsTrigger>
            <TabsTrigger value="overlays" className="flex items-center gap-2">
              <Upload className="h-4 w-4" />
              Overlays
            </TabsTrigger>
          </TabsList>

          <TabsContent value="timing" className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label htmlFor="game-ready">Game Ready Duration (seconds)</Label>
                <Input
                  id="game-ready"
                  type="number"
                  min="1"
                  max="10"
                  value={config.gameReadyDuration}
                  onChange={(e) => handleTimingChange("gameReadyDuration", Number(e.target.value))}
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="question-ready">Question Ready Duration (seconds)</Label>
                <Input
                  id="question-ready"
                  type="number"
                  min="1"
                  max="5"
                  value={config.questionReadyDuration}
                  onChange={(e) => handleTimingChange("questionReadyDuration", Number(e.target.value))}
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="time-starts">Time Starts Duration (seconds)</Label>
                <Input
                  id="time-starts"
                  type="number"
                  min="1"
                  max="5"
                  value={config.timeStartsDuration}
                  onChange={(e) => handleTimingChange("timeStartsDuration", Number(e.target.value))}
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="countdown">Countdown Duration (seconds)</Label>
                <Input
                  id="countdown"
                  type="number"
                  min="5"
                  max="30"
                  value={config.countdownDuration}
                  onChange={(e) => handleTimingChange("countdownDuration", Number(e.target.value))}
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="time-up">Time Up Duration (seconds)</Label>
                <Input
                  id="time-up"
                  type="number"
                  min="1"
                  max="10"
                  value={config.timeUpFetchingDuration}
                  onChange={(e) => handleTimingChange("timeUpFetchingDuration", Number(e.target.value))}
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="leaderboard">Leaderboard Duration (seconds)</Label>
                <Input
                  id="leaderboard"
                  type="number"
                  min="1"
                  max="15"
                  value={config.leaderboardDuration}
                  onChange={(e) => handleTimingChange("leaderboardDuration", Number(e.target.value))}
                />
              </div>
            </div>
          </TabsContent>

          <TabsContent value="audio" className="space-y-6">
            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <div className="space-y-1">
                  <Label htmlFor="preserve-audio">Preserve Original Audio</Label>
                  <p className="text-sm text-muted-foreground">Keep audio from uploaded question videos</p>
                </div>
                <Switch
                  id="preserve-audio"
                  checked={config.preserveOriginalAudio}
                  onCheckedChange={(checked) => handleAudioChange("preserveOriginalAudio", checked)}
                />
              </div>

              {config.preserveOriginalAudio && (
                <div className="space-y-2">
                  <Label>Original Audio Volume: {Math.round(config.originalAudioVolume * 100)}%</Label>
                  <Slider
                    value={[config.originalAudioVolume]}
                    onValueChange={([value]) => handleAudioChange("originalAudioVolume", value)}
                    max={1}
                    min={0}
                    step={0.1}
                    className="w-full"
                  />
                </div>
              )}

              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="background-audio">Background Audio (Optional)</Label>
                  <Input
                    id="background-audio"
                    type="file"
                    accept="audio/*"
                    onChange={(e) => handleAudioChange("backgroundAudioFile", e.target.files?.[0])}
                  />
                  <p className="text-sm text-muted-foreground">Upload an audio file to play in the background</p>
                </div>

                {config.backgroundAudioFile && (
                  <div className="space-y-4">
                    <div className="space-y-2">
                      <Label>Background Audio Volume: {Math.round(config.backgroundAudioVolume * 100)}%</Label>
                      <Slider
                        value={[config.backgroundAudioVolume]}
                        onValueChange={([value]) => handleAudioChange("backgroundAudioVolume", value)}
                        max={1}
                        min={0}
                        step={0.1}
                        className="w-full"
                      />
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="fade-in">Fade In Duration (seconds)</Label>
                        <Input
                          id="fade-in"
                          type="number"
                          min="0"
                          max="10"
                          value={config.audioFadeInDuration}
                          onChange={(e) => handleAudioChange("audioFadeInDuration", Number(e.target.value))}
                        />
                      </div>
                      
                      <div className="space-y-2">
                        <Label htmlFor="fade-out">Fade Out Duration (seconds)</Label>
                        <Input
                          id="fade-out"
                          type="number"
                          min="0"
                          max="10"
                          value={config.audioFadeOutDuration}
                          onChange={(e) => handleAudioChange("audioFadeOutDuration", Number(e.target.value))}
                        />
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </TabsContent>

          <TabsContent value="video" className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="aspect-ratio">Aspect Ratio</Label>
                  <Select value={config.aspectRatio} onValueChange={(value) => setConfig(prev => ({ ...prev, aspectRatio: value as any }))}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="original">Original</SelectItem>
                      <SelectItem value="16:9">16:9 (Widescreen)</SelectItem>
                      <SelectItem value="9:16">9:16 (Vertical)</SelectItem>
                      <SelectItem value="4:5">4:5 (Instagram)</SelectItem>
                      <SelectItem value="1:1">1:1 (Square)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="quality">Quality</Label>
                  <Select value={config.quality} onValueChange={(value) => setConfig(prev => ({ ...prev, quality: value as any }))}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="low">Low (Fast)</SelectItem>
                      <SelectItem value="medium">Medium</SelectItem>
                      <SelectItem value="high">High</SelectItem>
                      <SelectItem value="ultra">Ultra (Slow)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="resolution">Resolution</Label>
                  <Select value={config.resolution} onValueChange={(value) => setConfig(prev => ({ ...prev, resolution: value as any }))}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="720p">720p (HD)</SelectItem>
                      <SelectItem value="1080p">1080p (Full HD)</SelectItem>
                      <SelectItem value="4k">4K (Ultra HD)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="scale-mode">Scale Mode</Label>
                  <Select value={config.scaleMode} onValueChange={(value) => setConfig(prev => ({ ...prev, scaleMode: value as any }))}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="fit">Fit (Maintain aspect ratio)</SelectItem>
                      <SelectItem value="fill">Fill (Crop if needed)</SelectItem>
                      <SelectItem value="stretch">Stretch (May distort)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>
          </TabsContent>

          <TabsContent value="overlays" className="space-y-6">
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="space-y-1">
                  <Label htmlFor="use-custom">Use Custom Overlay Videos</Label>
                  <p className="text-sm text-muted-foreground">Upload your own overlay videos instead of using defaults</p>
                </div>
                <Switch
                  id="use-custom"
                  checked={config.useCustomOverlays}
                  onCheckedChange={(checked) => setConfig(prev => ({ ...prev, useCustomOverlays: checked }))}
                />
              </div>

              {config.useCustomOverlays && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {overlayTypes.map((overlay) => (
                    <div key={overlay.key} className="space-y-2">
                      <Label htmlFor={overlay.key}>{overlay.label}</Label>
                      <Input
                        id={overlay.key}
                        type="file"
                        accept="video/*"
                        onChange={(e) => handleCustomOverlayUpload(overlay.key, e.target.files?.[0] || null)}
                      />
                      <p className="text-xs text-muted-foreground">{overlay.description}</p>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  )
}
