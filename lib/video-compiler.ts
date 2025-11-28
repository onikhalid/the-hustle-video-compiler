import { FFmpeg } from "@ffmpeg/ffmpeg"
import { toBlobURL } from "@ffmpeg/util"



export interface CompilationSegment {
  id: string
  type: "video" | "overlay-video"
  startTime: number
  duration: number
  file?: File | Blob
  videoFile?: File
  overlayPath?: string
  overlayBlob?: Blob
  transition?: "none" | "fade" | "slide"
}

export interface CompilationOptions {
  outputFormat: "mp4" | "webm" | "mov"
  quality: "low" | "medium" | "high" | "ultra"
  resolution: "720p" | "1080p" | "4k"
  frameRate: 24 | 30 | 60
  aspectRatio?: "original" | "16:9" | "9:16" | "4:5" | "5:4" | "1:1" | "custom"
  customWidth?: number
  customHeight?: number
  scaleMode?: "fit" | "fill" | "stretch"

  // Enhanced audio options
  preserveOriginalAudio: boolean
  backgroundAudioFile?: File
  backgroundAudioVolume: number
  originalAudioVolume: number
  audioFadeInDuration: number
  audioFadeOutDuration: number
}

export interface CompilationProgress {
  stage: "initializing" | "loading" | "processing" | "encoding" | "finalizing" | "complete" | "error"
  progress: number
  currentSegment?: number
  totalSegments: number
  message: string
  timeRemaining?: number
  segmentProgress?: number // Progress within current segment (0-100)
  segmentName?: string // Name of current segment being processed
  timeElapsed?: number // Time elapsed in seconds
  estimatedTimeRemaining?: number // Estimated time remaining in seconds
}

export class VideoCompiler {
  private ffmpeg: FFmpeg
  private isInitialized = false
  private onProgressUpdate?: (progress: CompilationProgress) => void
  private startTime: number = 0
  private segmentStartTime: number = 0

  constructor() {
    this.ffmpeg = new FFmpeg()
    console.log("  FFmpeg-based video compiler initialized")
  }

  setProgressCallback(callback: (progress: CompilationProgress) => void) {
    this.onProgressUpdate = callback
  }

  private updateProgress(update: Partial<CompilationProgress>) {
    if (this.onProgressUpdate) {
      const progress: CompilationProgress = {
        stage: "initializing",
        progress: 0,
        totalSegments: 0,
        message: "Starting compilation...",
        ...update,
      }
      this.onProgressUpdate(progress)
    }
  }

  private getSegmentName(segment: CompilationSegment, index: number): string {
    if (segment.type === "video") {
      return `Question Video ${index + 1}`
    } else if (segment.type === "overlay-video") {
      // Try to determine overlay type from file path or use generic name
      if (segment.overlayPath) {
        if (segment.overlayPath.includes('game_get_ready')) return 'Game Get Ready'
        if (segment.overlayPath.includes('question_one') || segment.overlayPath.includes('question_two')) return 'Question Ready'
        if (segment.overlayPath.includes('time_starts')) return 'Time Starts'
        if (segment.overlayPath.includes('countdown')) return 'Countdown'
        if (segment.overlayPath.includes('time_up')) return 'Time Up'
        if (segment.overlayPath.includes('leaderboard')) return 'Leaderboard'
      }
      return `Overlay ${index + 1}`
    }
    return `Segment ${index + 1}`
  }

  private calculateEstimatedTime(currentIndex: number, totalSegments: number): number {
    if (currentIndex === 0) return 0

    const timeElapsed = (Date.now() - this.startTime) / 1000
    const averageTimePerSegment = timeElapsed / currentIndex
    const remainingSegments = totalSegments - currentIndex

    return Math.round(averageTimePerSegment * remainingSegments)
  }

  async initialize(): Promise<void> {
    if (this.isInitialized) return

    this.updateProgress({
      stage: "initializing",
      progress: 10,
      message: "Loading FFmpeg...",
      totalSegments: 0,
    })

    try {
      const baseURL = "https://cdn.jsdelivr.net/npm/@ffmpeg/core@0.12.10/dist/umd"

      console.log("  Loading FFmpeg from:", baseURL)

      const coreURL = await toBlobURL(`${baseURL}/ffmpeg-core.js`, "text/javascript")
      const wasmURL = await toBlobURL(`${baseURL}/ffmpeg-core.wasm`, "application/wasm")

      console.log("  Created blob URLs - Core:", coreURL.substring(0, 50), "... WASM:", wasmURL.substring(0, 50))

      await this.ffmpeg.load({
        coreURL,
        wasmURL,
      })

      // Set up global logging for all FFmpeg operations
      this.ffmpeg.on("log", ({ type, message }) => {
        if (type === "fferr" || message.includes("Error") || message.includes("error")) {
          console.error(`  FFmpeg Error: ${message}`)
        } else {
          console.log(`  FFmpeg: ${message}`)
        }
      })

      // Load a default font for text rendering
      await this.loadDefaultFont()

      this.isInitialized = true
      console.log("  FFmpeg loaded successfully")

      this.updateProgress({
        stage: "initializing",
        progress: 100,
        message: "FFmpeg ready",
        totalSegments: 0,
      })
    } catch (error) {
      console.error("  FFmpeg initialization failed:", error)
      this.updateProgress({
        stage: "error",
        progress: 0,
        message: `FFmpeg initialization failed: ${error instanceof Error ? error.message : "Unknown error"}`,
        totalSegments: 0,
      })
      throw error
    }
  }

  private async loadDefaultFont(): Promise<void> {
    try {
      // Load a simple web font as binary data for FFmpeg to use
      const fontUrl = "https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.0.0/webfonts/fa-solid-900.ttf"
      const response = await fetch(fontUrl)
      if (response.ok) {
        const fontData = await response.arrayBuffer()
        await this.ffmpeg.writeFile("default_font.ttf", new Uint8Array(fontData))
        console.log("  Default font loaded successfully")
      } else {
        console.warn("  Could not load default font, will use system default")
      }
    } catch (error) {
      console.warn("  Font loading failed, text rendering will use system default:", error)
    }
  }

  async compileVideo(
    segments: CompilationSegment[],
    options: CompilationOptions = {
      outputFormat: "mp4",
      quality: "medium",
      resolution: "1080p",
      frameRate: 30,

      aspectRatio: "original",
      scaleMode: "fit",
      preserveOriginalAudio: true,
      backgroundAudioVolume: 0.1, // Very subtle background audio
      originalAudioVolume: 1.0,
      audioFadeInDuration: 2,
      audioFadeOutDuration: 2,
    },
  ): Promise<Blob> {
    const compilationId = Date.now()
    console.log(`[v0] Starting FFmpeg video compilation ${compilationId} with`, segments.length, "segments")
    console.log("[v0] Audio options - preserveOriginal:", options.preserveOriginalAudio, "originalVolume:", options.originalAudioVolume)

    this.startTime = Date.now()

    if (!this.isInitialized) {
      await this.initialize()
    }

    this.updateProgress({
      stage: "loading",
      progress: 0,
      message: `Preparing ${segments.length} video segments...`,
      totalSegments: segments.length,
      timeElapsed: 0,
    })

    try {
      const outputDimensions = await this.calculateOutputDimensions(segments, options)
      console.log("  Output dimensions:", outputDimensions)

      // Process segments one by one to avoid filesystem issues
      const processedFiles: string[] = []

      for (let i = 0; i < segments.length; i++) {
        const segment = segments[i]
        const outputFilename = `processed_${i}.mp4`

        this.segmentStartTime = Date.now()
        const segmentName = this.getSegmentName(segment, i)

        this.updateProgress({
          stage: "processing",
          progress: 10 + (i / segments.length) * 60,
          message: `Processing ${segmentName}...`,
          totalSegments: segments.length,
          currentSegment: i + 1,
          segmentProgress: 0,
          segmentName,
          timeElapsed: (Date.now() - this.startTime) / 1000,
          estimatedTimeRemaining: this.calculateEstimatedTime(i, segments.length),
        })

        try {
          if (segment.type === "video" && segment.videoFile) {
            await this.processVideoSegment(segment, outputFilename, outputDimensions, options)
          } else if (segment.type === "overlay-video") {
            await this.processOverlaySegment(segment, outputFilename, outputDimensions, options)
          }

          // Verify the file was created and has content
          const fileData = await this.ffmpeg.readFile(outputFilename)
          if (fileData.length === 0) {
            throw new Error(`FFmpeg produced empty file for segment ${i + 1}`)
          }

          processedFiles.push(outputFilename)
          console.log(`  Successfully processed segment ${i + 1}, size: ${fileData.length} bytes`)

        } catch (segmentError) {
          console.error(`  Failed to process segment ${i + 1}:`, segmentError)

          // Try a super simple fallback for this segment
          try {
            console.log(`  Attempting simple fallback for segment ${i + 1}`)
            await this.createSimpleFallbackSegment(segment, outputFilename, outputDimensions, options)

            const fallbackData = await this.ffmpeg.readFile(outputFilename)
            if (fallbackData.length > 0) {
              processedFiles.push(outputFilename)
              console.log(`  Fallback successful for segment ${i + 1}`)
              continue // Move to next segment
            }
          } catch (fallbackError) {
            console.error(`  Fallback also failed for segment ${i + 1}:`, fallbackError)
          }

          // Clean up any partial files
          await this.cleanupFiles(processedFiles)
          throw new Error(`Failed to process segment ${i + 1}: ${segmentError instanceof Error ? segmentError.message : String(segmentError)}`)
        }
      }

      this.updateProgress({
        stage: "encoding",
        progress: 80,
        message: "Combining segments...",
        totalSegments: segments.length,
      })

      // Use file concatenation method which is more reliable
      await this.concatenateFiles(processedFiles, "final_output.mp4", options)

      this.updateProgress({
        stage: "finalizing",
        progress: 95,
        message: "Finalizing video...",
        totalSegments: segments.length,
      })

      // Read the final output
      const outputData = await this.ffmpeg.readFile("final_output.mp4")
      const outputBlob = new Blob([new Uint8Array(outputData as unknown as ArrayBuffer)], { type: "video/mp4" })

      // Clean up all temporary files
      await this.cleanupFiles([...processedFiles, "final_output.mp4", "file_list.txt"])

      this.updateProgress({
        stage: "complete",
        progress: 100,
        message: `Video compilation complete! Size: ${Math.round(outputBlob.size / 1024 / 1024)}MB`,
        totalSegments: segments.length,
      })

      console.log(`[v0] Video compilation ${compilationId} completed successfully - Final blob size:`, outputBlob.size)
      return outputBlob

    } catch (error) {
      console.error("  Compilation failed:", error)

      // Try to clean up any remaining files
      try {
        const files = await this.ffmpeg.listDir("/")
        console.log("  Files in virtual filesystem during error:", files)
      } catch (listError) {
        console.error("  Could not list files during cleanup:", listError)
      }

      this.updateProgress({
        stage: "error",
        progress: 0,
        message: `Compilation failed: ${error instanceof Error ? error.message : String(error)}`,
        totalSegments: segments.length,
      })
      throw error
    }
  }

  private async processVideoSegment(
    segment: CompilationSegment,
    outputFilename: string,
    outputDimensions: { width: number; height: number },
    options: CompilationOptions
  ): Promise<void> {
    const inputFilename = `input_${Date.now()}.mp4`

    try {
      // Write input file
      const arrayBuffer = await segment.videoFile!.arrayBuffer()
      console.log(`  Writing video file: ${inputFilename}, original size: ${arrayBuffer.byteLength} bytes`)
      await this.ffmpeg.writeFile(inputFilename, new Uint8Array(arrayBuffer))

      // Verify input file was written
      const inputData = await this.ffmpeg.readFile(inputFilename)
      console.log(`  Input file written: ${inputFilename}, size: ${inputData.length} bytes`)

      if (inputData.length === 0) {
        throw new Error("Failed to write input video file")
      }

      // Try simple copy first, then scaling if needed
      let args: string[]

      if (segment.duration) {
        // With duration limit and scaling
        args = [
          "-i", inputFilename,
          "-vf", `scale=${outputDimensions.width}:${outputDimensions.height}:force_original_aspect_ratio=decrease,pad=${outputDimensions.width}:${outputDimensions.height}:(ow-iw)/2:(oh-ih)/2:black`,
          "-t", segment.duration.toString(),
          "-c:v", "libx264",
          "-preset", "ultrafast",
          "-crf", "28", // Higher CRF for faster processing
          "-pix_fmt", "yuv420p",
          "-r", options.frameRate.toString(),
          "-avoid_negative_ts", "make_zero",
          "-y",
          outputFilename
        ]
      } else {
        // Simple copy with scaling
        args = [
          "-i", inputFilename,
          "-vf", `scale=${outputDimensions.width}:${outputDimensions.height}:force_original_aspect_ratio=decrease,pad=${outputDimensions.width}:${outputDimensions.height}:(ow-iw)/2:(oh-ih)/2:black`,
          "-c:v", "libx264",
          "-preset", "ultrafast",
          "-crf", "28",
          "-pix_fmt", "yuv420p",
          "-r", options.frameRate.toString(),
          "-avoid_negative_ts", "make_zero",
          "-y",
          outputFilename
        ]
      }

      // Handle audio - ALWAYS include an audio stream with consistent parameters
      if (options.preserveOriginalAudio) {
        console.log("[v0] Preserving audio for video segment with volume:", options.originalAudioVolume)
        // Add audio codec and bitrate before the output filename
        args.splice(-2, 0, "-c:a", "aac", "-b:a", "128k", "-ar", "48000", "-ac", "2")

        // Add volume adjustment if needed
        if (options.originalAudioVolume !== 1.0) {
          args.splice(-6, 0, "-af", `volume=${options.originalAudioVolume}`)
        }
      } else {
        console.log("[v0] Creating silent audio track for video segment (preserveOriginal:", options.preserveOriginalAudio, ")")
        // Generate silent audio instead of removing audio completely
        // This ensures all segments have consistent audio streams for concatenation
        args.splice(-2, 0, "-f", "lavfi", "-i", "anullsrc=channel_layout=stereo:sample_rate=48000", "-c:a", "aac", "-b:a", "128k", "-ar", "48000", "-ac", "2", "-shortest")
      }

      console.log(`  Processing video segment with command:`, args.join(" "))

      await this.ffmpeg.exec(args)

      // Verify output was created
      try {
        const outputData = await this.ffmpeg.readFile(outputFilename)
        console.log(`  Video segment processed successfully: ${outputFilename}, size: ${outputData.length} bytes`)

        if (outputData.length === 0) {
          throw new Error("FFmpeg produced empty output file")
        }
      } catch (readError) {
        console.error(`  Failed to read output file ${outputFilename}:`, readError)
        throw new Error("Failed to create output video file")
      }

    } catch (error) {
      console.error(`  Video segment processing failed:`, error)
      throw error
    } finally {
      // Clean up input file
      await this.safeDeleteFile(inputFilename)
    }
  }

  private async processOverlaySegment(
    segment: CompilationSegment,
    outputFilename: string,
    outputDimensions: { width: number; height: number },
    options: CompilationOptions
  ): Promise<void> {
    console.log(`  Processing overlay segment: ${segment.overlayPath}, duration: ${segment.duration}s`)

    try {
      let overlayData: Uint8Array

      if (segment.overlayBlob) {
        // Use the pre-loaded blob
        const arrayBuffer = await segment.overlayBlob.arrayBuffer()
        overlayData = new Uint8Array(arrayBuffer)
      } else if (segment.overlayPath) {
        // Load the overlay video from the path
        const response = await fetch(segment.overlayPath)
        if (!response.ok) {
          throw new Error(`Failed to fetch overlay video: ${segment.overlayPath}`)
        }
        const arrayBuffer = await response.arrayBuffer()
        overlayData = new Uint8Array(arrayBuffer)
      } else {
        throw new Error("No overlay video source provided")
      }

      // Determine file extension from path or default to mp4 (sanitize query/hash)
      const rawExt = segment.overlayPath?.split('.').pop() || 'mp4'
      const cleanExt = rawExt.split('?')[0].split('#')[0].toLowerCase()
      const extension = /^(mp4|mov|webm|mkv|gif|webp)$/.test(cleanExt) ? cleanExt : 'mp4'
      const inputFilename = `overlay_input_${Date.now()}_${Math.floor(Math.random()*1e6)}.${extension}`

      // Write the overlay video file to FFmpeg's virtual filesystem
      await this.ffmpeg.writeFile(inputFilename, overlayData)
      console.log(`  Written overlay file: ${inputFilename}, size: ${overlayData.length} bytes`)

      // Convert overlay video to specified duration and dimensions with guaranteed audio
      const args = [
        "-i", inputFilename,
        "-f", "lavfi", "-i", "anullsrc=channel_layout=stereo:sample_rate=48000",
        "-vf", `scale=${outputDimensions.width}:${outputDimensions.height}:force_original_aspect_ratio=decrease,pad=${outputDimensions.width}:${outputDimensions.height}:(ow-iw)/2:(oh-ih)/2:black`,
        "-t", segment.duration.toString(),
        "-c:v", "libx264",
        "-preset", "ultrafast",
        "-crf", "28",
        "-pix_fmt", "yuv420p",
        "-r", options.frameRate.toString(),
        "-c:a", "aac",
        "-b:a", "128k",
        "-ar", "48000",
        "-ac", "2",
        "-shortest",
        "-avoid_negative_ts", "make_zero",
        "-y",
        outputFilename
      ]

      console.log(`  Processing overlay video with command:`, args.join(" "))
      await this.ffmpeg.exec(args)

      // Verify output was created
      const outputData = await this.ffmpeg.readFile(outputFilename)
      console.log(`  Overlay segment processed successfully: ${outputFilename}, size: ${outputData.length} bytes`)

      if (outputData.length === 0) {
        throw new Error("FFmpeg produced empty output file for overlay video")
      }

      // Clean up input file
      await this.safeDeleteFile(inputFilename)

    } catch (error) {
      console.error(`  Overlay segment processing failed:`, error)
      throw error
    }
  }









  private async concatenateFiles(inputFiles: string[], outputFilename: string, options: CompilationOptions): Promise<void> {
    // Create file list for concatenation
    const fileList = inputFiles.map(file => `file '${file}'`).join('\n')
    await this.ffmpeg.writeFile("file_list.txt", new TextEncoder().encode(fileList))

    let args: string[]

    if (options.backgroundAudioFile) {
      // Handle background audio mixing
      const backgroundAudioFilename = `background_audio_${Date.now()}.mp3`

      try {
        // Write background audio file
        const audioArrayBuffer = await options.backgroundAudioFile.arrayBuffer()
        await this.ffmpeg.writeFile(backgroundAudioFilename, new Uint8Array(audioArrayBuffer))

        // Complex filter for mixing background audio with video
        const audioFilter = options.preserveOriginalAudio
          ? `[1:a]volume=${options.backgroundAudioVolume}[bg];[0:a]volume=${options.originalAudioVolume}[orig];[bg][orig]amix=inputs=2:duration=first:dropout_transition=0[mixed]`
          : `[1:a]volume=${options.backgroundAudioVolume}[mixed]`

        args = [
          "-f", "concat",
          "-safe", "0",
          "-i", "file_list.txt",
          "-i", backgroundAudioFilename,
          "-filter_complex", audioFilter,
          "-map", "0:v",
          "-map", "[mixed]",
          "-c:v", "copy",
          "-c:a", "aac",
          "-b:a", "128k",
          "-shortest",
          "-y",
          outputFilename
        ]

        console.log(`  Concatenating with background audio:`, args.join(" "))
        await this.ffmpeg.exec(args)

        // Clean up background audio file
        await this.safeDeleteFile(backgroundAudioFilename)

      } catch (error) {
        console.error("  Background audio processing failed, falling back to simple concatenation:", error)
        await this.safeDeleteFile(backgroundAudioFilename)

        // Fixed fallback - re-encode audio instead of copy
        args = [
          "-f", "concat",
          "-safe", "0",
          "-i", "file_list.txt",
          "-c:v", "copy",
          "-c:a", "aac",
          "-b:a", "128k",
          "-y",
          outputFilename
        ]
        await this.ffmpeg.exec(args)
      }
    } else {
      // Simple concatenation with proper audio handling
      args = [
        "-f", "concat",
        "-safe", "0",
        "-i", "file_list.txt",
        "-c:v", "copy",
        "-c:a", "aac",
        "-b:a", "128k",
        "-ar", "48000",
        "-ac", "2",
        "-y",
        outputFilename
      ]

      console.log(`[v0] Concatenating files with command:`, args.join(" "))
      await this.ffmpeg.exec(args)
    }
  }

  
  private async safeDeleteFile(filename: string): Promise<void> {
    try {
      await this.ffmpeg.deleteFile(filename)
      console.log(`  Deleted file: ${filename}`)
    } catch (error) {
      console.warn(`  Could not delete file ${filename}:`, error)
    }
  }

  private async createSimpleFallbackSegment(
    segment: CompilationSegment,
    outputFilename: string,
    outputDimensions: { width: number; height: number },
    options: CompilationOptions
  ): Promise<void> {
    console.log(`  Creating simple fallback for segment type: ${segment.type}`)

    if (segment.type === "video" && segment.videoFile) {
      // Super simple video processing - just copy and hope for the best
      const inputFilename = `fallback_input_${Date.now()}_${Math.floor(Math.random()*1e6)}.mp4`

      try {
        const arrayBuffer = await segment.videoFile.arrayBuffer()
        await this.ffmpeg.writeFile(inputFilename, new Uint8Array(arrayBuffer))

        // Most basic video processing possible with silent audio
        const args = [
          "-i", inputFilename,
          "-f", "lavfi", "-i", "anullsrc=channel_layout=stereo:sample_rate=48000",
          "-c:v", "libx264",
          "-preset", "ultrafast",
          "-crf", "30", // Lower quality for speed
          "-pix_fmt", "yuv420p",
          "-c:a", "aac", "-b:a", "128k",
          "-shortest", // Match video duration
          "-t", "5", // Limit to 5 seconds max
          "-y",
          outputFilename
        ]

        await this.ffmpeg.exec(args)

      } finally {
        await this.safeDeleteFile(inputFilename)
      }

    } else if (segment.type === "overlay-video") {
      // Create a simple colored background video as fallback for missing overlay videos
      const duration = Math.min(segment.duration, 10) // Max 10 seconds

      const args = [
        "-f", "lavfi",
        "-i", `color=c=blue:s=${outputDimensions.width}x${outputDimensions.height}:d=${duration}:r=${options.frameRate}`,
        "-f", "lavfi", "-i", "anullsrc=channel_layout=stereo:sample_rate=48000",
        "-c:v", "libx264",
        "-preset", "ultrafast",
        "-crf", "30",
        "-pix_fmt", "yuv420p",
        "-c:a", "aac", "-b:a", "128k",
        "-shortest", // Match video duration
        "-t", duration.toString(),
        "-y",
        outputFilename
      ]

      await this.ffmpeg.exec(args)
    }
  }

  private async cleanupFiles(filenames: string[]): Promise<void> {
    for (const filename of filenames) {
      await this.safeDeleteFile(filename)
    }
  }

  private async calculateOutputDimensions(
    segments: CompilationSegment[],
    options: CompilationOptions,
  ): Promise<{ width: number; height: number }> {
    if (options.aspectRatio === "custom" && options.customWidth && options.customHeight) {
      return { width: options.customWidth, height: options.customHeight }
    }

    if (options.aspectRatio === "original") {
      const firstVideoSegment = segments.find((s) => s.type === "video" && s.videoFile)
      if (firstVideoSegment?.videoFile) {
        try {
          const videoInfo = await this.getVideoInfo(firstVideoSegment.videoFile)
          return { width: videoInfo.width, height: videoInfo.height }
        } catch {
          console.warn("  Could not get video info, using default dimensions")
        }
      }
    }

    const baseResolution = this.getResolutionDimensions(options.resolution || "1080p")

    switch (options.aspectRatio) {
      case "16:9":
        return baseResolution
      case "9:16":
        return { width: (baseResolution.height * 9) / 16, height: baseResolution.height }
      case "4:5":
        return { width: (baseResolution.height * 4) / 5, height: baseResolution.height }
      case "5:4":
        return { width: (baseResolution.height * 5) / 4, height: baseResolution.height }
      case "1:1":
        return { width: baseResolution.height, height: baseResolution.height }
      default:
        return baseResolution
    }
  }

  private getResolutionDimensions(resolution: string): { width: number; height: number } {
    switch (resolution) {
      case "720p":
        return { width: 1280, height: 720 }
      case "1080p":
        return { width: 1920, height: 1080 }
      case "4k":
        return { width: 3840, height: 2160 }
      default:
        return { width: 1920, height: 1080 }
    }
  }

  async getVideoInfo(file: File): Promise<{
    duration: number
    width: number
    height: number
    frameRate: number
  }> {
    return new Promise((resolve, reject) => {
      const video = document.createElement("video")

      video.onloadedmetadata = () => {
        resolve({
          duration: video.duration,
          width: video.videoWidth,
          height: video.videoHeight,
          frameRate: 30,
        })
        URL.revokeObjectURL(video.src)
      }

      video.onerror = () => {
        URL.revokeObjectURL(video.src)
        reject(new Error("Failed to load video for analysis"))
      }

      video.src = URL.createObjectURL(file)
    })
  }

  dispose(): void {
    console.log("  FFmpeg video compiler disposed")
  }
}
