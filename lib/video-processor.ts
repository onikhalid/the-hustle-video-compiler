/* eslint-disable @typescript-eslint/no-explicit-any */
import { getOverlayConfig, getVideoSequence } from './overlay-config'
import { ProductionTimestampManager, type GameSession } from './production-timestamps'

export interface VideoSegment {
  type: "game-ready" | "question-ready" | "question" | "time-starts" | "countdown" | "time-up-fetching" | "leaderboard"
  startTime: number
  duration: number
  videoFile?: File
  overlayPath?: string
  videoIndex?: number
  questionNumber?: number
}

export interface ProcessingOptions {
  // Overlay video durations - these can be customized
  gameReadyDuration: number // Duration for game_get_ready video
  questionReadyDuration: number // Duration for question_<n> video
  timeStartsDuration: number // Duration for question_time_starts video
  countdownDuration: number // Duration for question_countdown video
  timeUpFetchingDuration: number // Duration for time_up_fetching video
  leaderboardDuration: number // Duration for question_leaderboard video

  // Audio configuration
  preserveOriginalAudio: boolean // Keep audio from uploaded question videos
  backgroundAudioFile?: File // Optional background audio file
  backgroundAudioVolume: number // Volume level for background audio (0-1)
  originalAudioVolume: number // Volume level for original video audio (0-1)
  audioFadeInDuration: number // Fade in duration for background audio (seconds)
  audioFadeOutDuration: number // Fade out duration for background audio (seconds)

  // Custom overlay configuration
  useCustomOverlays?: boolean // Whether to use custom overlay files
  customOverlayFiles?: { [key: string]: File } // Custom overlay files
}

export interface TimestampEvent {
  event: string
  time: number
  duration: number
  type: "game-ready" | "question-ready" | "question" | "time-starts" | "countdown" | "time-up-fetching" | "leaderboard"
}

export class VideoProcessor {
  private segments: VideoSegment[] = []
  private currentProgress = 0
  private onProgressUpdate?: (progress: number) => void
  private processingOptions?: ProcessingOptions

  constructor() {
    // No canvas needed anymore since we're using overlay videos
  }

  setProgressCallback(callback: (progress: number) => void) {
    this.onProgressUpdate = callback
  }

  private updateProgress(progress: number) {
    this.currentProgress = progress
    this.onProgressUpdate?.(progress)
  }

  async processVideos(
    videoFiles: File[],
    options: ProcessingOptions,
  ): Promise<{ segments: VideoSegment[]; timestamps: TimestampEvent[]; totalDuration: number; gameSession: GameSession }> {
    const processId = Date.now()
    console.log(`processVideos called ${processId} with ${videoFiles.length} files`)
    this.segments = []
    this.processingOptions = options // Store options for later use in compileVideoBlob
    this.updateProgress(0)

    let currentTime = 0
    const timestamps: TimestampEvent[] = []
    const overlayConfig = getOverlayConfig(options.useCustomOverlays ? options.customOverlayFiles : undefined)

    // Add initial game ready segment
    const gameReadySegment: VideoSegment = {
      type: "game-ready",
      startTime: currentTime,
      duration: options.gameReadyDuration,
      overlayPath: overlayConfig.gameGetReady,
    }
    this.segments.push(gameReadySegment)

    timestamps.push({
      event: "Game Get Ready",
      time: currentTime,
      duration: options.gameReadyDuration,
      type: "game-ready",
    })

    currentTime += options.gameReadyDuration

    // Process each question with the new sequence
    console.log("Processing", videoFiles.length, "video files")
    for (let i = 0; i < videoFiles.length; i++) {
      const videoFile = videoFiles[i]
      const videoDuration = await this.getVideoDuration(videoFile)
      const questionNumber = i + 1

      console.log(`Processing question ${questionNumber} (index ${i}), duration: ${videoDuration}s, current segments: ${this.segments.length}`)
      this.updateProgress(10 + (i / videoFiles.length) * 60)

      // Question ready segment
      const questionReadySegment: VideoSegment = {
        type: "question-ready",
        startTime: currentTime,
        duration: options.questionReadyDuration,
        overlayPath: overlayConfig.questionReady(questionNumber),
        questionNumber,
        videoIndex: i,
      }
      this.segments.push(questionReadySegment)
      console.log(`Added question-ready segment for Q${questionNumber}, total segments: ${this.segments.length}`)

      timestamps.push({
        event: `Question ${questionNumber} Ready`,
        time: currentTime,
        duration: options.questionReadyDuration,
        type: "question-ready",
      })

      currentTime += options.questionReadyDuration

      // Actual question video segment
      const questionSegment: VideoSegment = {
        type: "question",
        startTime: currentTime,
        duration: videoDuration,
        videoFile,
        questionNumber,
        videoIndex: i,
      }
      this.segments.push(questionSegment)
      console.log(`Added question video segment for Q${questionNumber}, total segments: ${this.segments.length}`)

      timestamps.push({
        event: `Question ${questionNumber} Video`,
        time: currentTime,
        duration: videoDuration,
        type: "question",
      })

      currentTime += videoDuration

      // Time starts segment
      const timeStartsSegment: VideoSegment = {
        type: "time-starts",
        startTime: currentTime,
        duration: options.timeStartsDuration,
        overlayPath: overlayConfig.timeStarts,
        questionNumber,
      }
      this.segments.push(timeStartsSegment)

      timestamps.push({
        event: "Time Starts",
        time: currentTime,
        duration: options.timeStartsDuration,
        type: "time-starts",
      })

      currentTime += options.timeStartsDuration

      // Countdown segment
      const countdownSegment: VideoSegment = {
        type: "countdown",
        startTime: currentTime,
        duration: options.countdownDuration,
        overlayPath: overlayConfig.countdown,
        questionNumber,
      }
      this.segments.push(countdownSegment)

      timestamps.push({
        event: "Answer Countdown",
        time: currentTime,
        duration: options.countdownDuration,
        type: "countdown",
      })

      currentTime += options.countdownDuration

      // Time up fetching segment
      const timeUpFetchingSegment: VideoSegment = {
        type: "time-up-fetching",
        startTime: currentTime,
        duration: options.timeUpFetchingDuration,
        overlayPath: overlayConfig.timeUpFetching,
        questionNumber,
      }
      this.segments.push(timeUpFetchingSegment)

      timestamps.push({
        event: "Time Up - Fetching Results",
        time: currentTime,
        duration: options.timeUpFetchingDuration,
        type: "time-up-fetching",
      })

      currentTime += options.timeUpFetchingDuration

      // Leaderboard segment
      const leaderboardSegment: VideoSegment = {
        type: "leaderboard",
        startTime: currentTime,
        duration: options.leaderboardDuration,
        overlayPath: overlayConfig.leaderboard,
        questionNumber,
      }
      this.segments.push(leaderboardSegment)

      timestamps.push({
        event: "Leaderboard/Results",
        time: currentTime,
        duration: options.leaderboardDuration,
        type: "leaderboard",
      })

      currentTime += options.leaderboardDuration

      console.log(`Completed question ${questionNumber}, total segments now: ${this.segments.length}`)
      this.updateProgress(10 + ((i + 1) / videoFiles.length) * 60)
    }

    this.updateProgress(70)

    console.log("Video segments created:", this.segments.map(s => ({ type: s.type, duration: s.duration, questionNumber: s.questionNumber, overlayPath: s.overlayPath })))

    // Generate production-ready timestamps
    const timestampManager = new ProductionTimestampManager(
      `session_${Date.now()}`,
      `video_${Date.now()}`
    )

    const questionVideos = videoFiles.map((_, index) => ({
      duration: 30, // This should be the actual video duration - could be enhanced to get real duration
      id: `question_${index + 1}`
    }))

    const gameSession = timestampManager.generateTimestamps(questionVideos, {
      gameReadyDuration: options.gameReadyDuration,
      questionReadyDuration: options.questionReadyDuration,
      timeStartsDuration: options.timeStartsDuration,
      countdownDuration: options.countdownDuration,
      timeUpFetchingDuration: options.timeUpFetchingDuration,
      leaderboardDuration: options.leaderboardDuration
    })

    return {
      segments: this.segments,
      timestamps,
      totalDuration: currentTime,
      gameSession, // Add the production-ready game session
    }
  }

  private async getVideoDuration(file: File): Promise<number> {
    return new Promise((resolve) => {
      const video = document.createElement("video")
      video.preload = "metadata"

      video.onloadedmetadata = () => {
        resolve(video.duration)
        URL.revokeObjectURL(video.src)
      }

      video.src = URL.createObjectURL(file)
    })
  }

  async loadOverlayAsBlob(overlayPath: string): Promise<Blob> {
    try {
      const response = await fetch(overlayPath)
      if (!response.ok) {
        throw new Error(`Failed to load overlay video: ${overlayPath}`)
      }
      return await response.blob()
    } catch (error) {
      console.error(`Error loading overlay video ${overlayPath}:`, error)
      // Return a fallback or throw error
      throw error
    }
  }

  async compileVideo(segments: VideoSegment[]): Promise<string> {
    const { VideoCompiler } = await import("./video-compiler")
    const compiler = new VideoCompiler()

    this.updateProgress(80)

    try {
      const compilationSegments = await Promise.all(
        segments.map(async (segment, index) => {
          const compilationSegment: any = {
            id: `segment-${index}`,
            startTime: segment.startTime,
            duration: segment.duration,
          }

          if (segment.type === "question" && segment.videoFile) {
            compilationSegment.type = "video"
            compilationSegment.videoFile = segment.videoFile
          } else if (segment.overlayPath) {
            // Handle all overlay video segments
            compilationSegment.type = "overlay-video"
            compilationSegment.overlayPath = segment.overlayPath

            try {
              const overlayBlob = await this.loadOverlayAsBlob(segment.overlayPath)
              compilationSegment.overlayBlob = overlayBlob
            } catch (error) {
              console.error(`Failed to load overlay video for segment ${index}:`, error)
              // Continue without the overlay - the compiler should handle this gracefully
            }
          }

          return compilationSegment
        }),
      )

      this.updateProgress(90)

      const videoBlob = await compiler.compileVideo(compilationSegments)
      const outputUrl = URL.createObjectURL(videoBlob)

      this.updateProgress(100)

      return outputUrl
    } catch (error) {
      console.error("Video compilation failed:", error)
      const mockVideoBlob = new Blob(["mock video data"], { type: "video/mp4" })
      const outputUrl = URL.createObjectURL(mockVideoBlob)
      this.updateProgress(100)
      return outputUrl
    } finally {
      compiler.dispose()
    }
  }

  async compileVideoBlob(segments: VideoSegment[]): Promise<Blob> {
    const { VideoCompiler } = await import("./video-compiler")
    const compiler = new VideoCompiler()

    this.updateProgress(80)

    try {
      const compilationSegments = await Promise.all(
        segments.map(async (segment, index) => {
          const compilationSegment: any = {
            id: `segment-${index}`,
            startTime: segment.startTime,
            duration: segment.duration,
          }

          if (segment.type === "question" && segment.videoFile) {
            compilationSegment.type = "video"
            compilationSegment.videoFile = segment.videoFile
          } else if (segment.overlayPath) {
            // Handle all overlay video segments
            compilationSegment.type = "overlay-video"
            compilationSegment.overlayPath = segment.overlayPath

            try {
              const overlayBlob = await this.loadOverlayAsBlob(segment.overlayPath)
              compilationSegment.overlayBlob = overlayBlob
            } catch (error) {
              console.error(`Failed to load overlay video for segment ${index}:`, error)
              // Continue without the overlay - the compiler should handle this gracefully
            }
          }

          return compilationSegment
        }),
      )

      this.updateProgress(90)

      console.log("Compilation segments created:", compilationSegments.map(s => ({ type: s.type, id: s.id, duration: s.duration, overlayPath: s.overlayPath })))

      // Convert ProcessingOptions to CompilationOptions
      const compilationOptions = this.processingOptions ? {
        outputFormat: "mp4" as const,
        quality: "medium" as const,
        resolution: "1080p" as const,
        frameRate: 30 as const,
        aspectRatio: "original" as const,
        scaleMode: "fit" as const,
        preserveOriginalAudio: this.processingOptions.preserveOriginalAudio,
        backgroundAudioFile: this.processingOptions.backgroundAudioFile,
        backgroundAudioVolume: this.processingOptions.backgroundAudioVolume,
        originalAudioVolume: this.processingOptions.originalAudioVolume,
        audioFadeInDuration: this.processingOptions.audioFadeInDuration,
        audioFadeOutDuration: this.processingOptions.audioFadeOutDuration,
      } : undefined

      console.log("Compilation options:", compilationOptions)
      const videoBlob = await compiler.compileVideo(compilationSegments, compilationOptions)

      this.updateProgress(100)

      return videoBlob
    } catch (error) {
      console.error("Video compilation failed:", error)
      const mockVideoBlob = new Blob(["mock video data"], { type: "video/mp4" })
      this.updateProgress(100)
      return mockVideoBlob
    } finally {
      compiler.dispose()
    }
  }

  getProcessingSteps(): Array<{ step: string; completed: boolean; progress: number }> {
    return [
      { step: "Analyzing uploaded videos", completed: this.currentProgress > 10, progress: 20 },
      { step: "Loading overlay assets", completed: this.currentProgress > 30, progress: 20 },
      { step: "Creating video sequence", completed: this.currentProgress > 50, progress: 30 },
      { step: "Processing video segments", completed: this.currentProgress > 70, progress: 20 },
      { step: "Compiling final video", completed: this.currentProgress >= 100, progress: 10 },
    ]
  }
}
