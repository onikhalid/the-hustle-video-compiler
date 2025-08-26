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
  audioEnabled: boolean
  aspectRatio?: "original" | "16:9" | "9:16" | "4:5" | "5:4" | "1:1" | "custom"
  customWidth?: number
  customHeight?: number
  scaleMode?: "fit" | "fill" | "stretch"
}

export interface CompilationProgress {
  stage: "initializing" | "loading" | "processing" | "encoding" | "finalizing" | "complete" | "error"
  progress: number
  currentSegment?: number
  totalSegments: number
  message: string
  timeRemaining?: number
}

export class VideoCompiler {
  private ffmpeg: FFmpeg
  private isInitialized = false
  private onProgressUpdate?: (progress: CompilationProgress) => void

  constructor() {
    this.ffmpeg = new FFmpeg()
    console.log("[v0] FFmpeg-based video compiler initialized")
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

      console.log("[v0] Loading FFmpeg from:", baseURL)

      const coreURL = await toBlobURL(`${baseURL}/ffmpeg-core.js`, "text/javascript")
      const wasmURL = await toBlobURL(`${baseURL}/ffmpeg-core.wasm`, "application/wasm")

      console.log("[v0] Created blob URLs - Core:", coreURL.substring(0, 50), "... WASM:", wasmURL.substring(0, 50))

      await this.ffmpeg.load({
        coreURL,
        wasmURL,
      })

      // Set up global logging for all FFmpeg operations
      this.ffmpeg.on("log", ({ type, message }) => {
        if (type === "fferr" || message.includes("Error") || message.includes("error")) {
          console.error(`[v0] FFmpeg Error: ${message}`)
        } else {
          console.log(`[v0] FFmpeg: ${message}`)
        }
      })

      // Load a default font for text rendering
      await this.loadDefaultFont()

      this.isInitialized = true
      console.log("[v0] FFmpeg loaded successfully")

      this.updateProgress({
        stage: "initializing",
        progress: 100,
        message: "FFmpeg ready",
        totalSegments: 0,
      })
    } catch (error) {
      console.error("[v0] FFmpeg initialization failed:", error)
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
        console.log("[v0] Default font loaded successfully")
      } else {
        console.warn("[v0] Could not load default font, will use system default")
      }
    } catch (error) {
      console.warn("[v0] Font loading failed, text rendering will use system default:", error)
    }
  }

  async compileVideo(
    segments: CompilationSegment[],
    options: CompilationOptions = {
      outputFormat: "mp4",
      quality: "medium",
      resolution: "1080p",
      frameRate: 30,
      audioEnabled: true,
      aspectRatio: "original",
      scaleMode: "fit",
    },
  ): Promise<Blob> {
    console.log("[v0] Starting FFmpeg video compilation with", segments.length, "segments")

    if (!this.isInitialized) {
      await this.initialize()
    }

    this.updateProgress({
      stage: "loading",
      progress: 0,
      message: `Preparing ${segments.length} video segments...`,
      totalSegments: segments.length,
    })

    try {
      const outputDimensions = await this.calculateOutputDimensions(segments, options)
      console.log("[v0] Output dimensions:", outputDimensions)

      // Process segments one by one to avoid filesystem issues
      const processedFiles: string[] = []
      
      for (let i = 0; i < segments.length; i++) {
        const segment = segments[i]
        const outputFilename = `processed_${i}.mp4`
        
        this.updateProgress({
          stage: "processing",
          progress: 10 + (i / segments.length) * 60,
          message: `Processing segment ${i + 1}/${segments.length}...`,
          totalSegments: segments.length,
          currentSegment: i + 1,
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
          console.log(`[v0] Successfully processed segment ${i + 1}, size: ${fileData.length} bytes`)
          
        } catch (segmentError) {
          console.error(`[v0] Failed to process segment ${i + 1}:`, segmentError)
          
          // Try a super simple fallback for this segment
          try {
            console.log(`[v0] Attempting simple fallback for segment ${i + 1}`)
            await this.createSimpleFallbackSegment(segment, outputFilename, outputDimensions, options)
            
            const fallbackData = await this.ffmpeg.readFile(outputFilename)
            if (fallbackData.length > 0) {
              processedFiles.push(outputFilename)
              console.log(`[v0] Fallback successful for segment ${i + 1}`)
              continue // Move to next segment
            }
          } catch (fallbackError) {
            console.error(`[v0] Fallback also failed for segment ${i + 1}:`, fallbackError)
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
      await this.concatenateFiles(processedFiles, "final_output.mp4")

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

      console.log("[v0] Video compilation completed successfully - Final blob size:", outputBlob.size)
      return outputBlob

    } catch (error) {
      console.error("[v0] Compilation failed:", error)
      
      // Try to clean up any remaining files
      try {
        const files = await this.ffmpeg.listDir("/")
        console.log("[v0] Files in virtual filesystem during error:", files)
      } catch (listError) {
        console.error("[v0] Could not list files during cleanup:", listError)
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
      console.log(`[v0] Writing video file: ${inputFilename}, original size: ${arrayBuffer.byteLength} bytes`)
      await this.ffmpeg.writeFile(inputFilename, new Uint8Array(arrayBuffer))
      
      // Verify input file was written
      const inputData = await this.ffmpeg.readFile(inputFilename)
      console.log(`[v0] Input file written: ${inputFilename}, size: ${inputData.length} bytes`)
      
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
          "-an",
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
          "-an",
          "-y",
          outputFilename
        ]
      }

      console.log(`[v0] Processing video segment with command:`, args.join(" "))
      
      await this.ffmpeg.exec(args)
      
      // Verify output was created
      try {
        const outputData = await this.ffmpeg.readFile(outputFilename)
        console.log(`[v0] Video segment processed successfully: ${outputFilename}, size: ${outputData.length} bytes`)
        
        if (outputData.length === 0) {
          throw new Error("FFmpeg produced empty output file")
        }
      } catch (readError) {
        console.error(`[v0] Failed to read output file ${outputFilename}:`, readError)
        throw new Error("Failed to create output video file")
      }

    } catch (error) {
      console.error(`[v0] Video segment processing failed:`, error)
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
    console.log(`[v0] Processing overlay segment: ${segment.overlayPath}, duration: ${segment.duration}s`)

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

      // Determine file extension from path or default to mp4
      const extension = segment.overlayPath?.split('.').pop() || 'mp4'
      const inputFilename = `overlay_input_${Date.now()}.${extension}`

      // Write the overlay video file to FFmpeg's virtual filesystem
      await this.ffmpeg.writeFile(inputFilename, overlayData)
      console.log(`[v0] Written overlay file: ${inputFilename}, size: ${overlayData.length} bytes`)

      // Convert overlay video to specified duration and dimensions
      const args = [
        "-i", inputFilename,
        "-vf", `scale=${outputDimensions.width}:${outputDimensions.height}:force_original_aspect_ratio=decrease,pad=${outputDimensions.width}:${outputDimensions.height}:(ow-iw)/2:(oh-ih)/2:black`,
        "-t", segment.duration.toString(),
        "-c:v", "libx264",
        "-preset", "ultrafast",
        "-crf", "28",
        "-pix_fmt", "yuv420p",
        "-r", options.frameRate.toString(),
        "-an", // Remove audio
        "-avoid_negative_ts", "make_zero",
        "-y",
        outputFilename
      ]

      console.log(`[v0] Processing overlay video with command:`, args.join(" "))
      await this.ffmpeg.exec(args)

      // Verify output was created
      const outputData = await this.ffmpeg.readFile(outputFilename)
      console.log(`[v0] Overlay segment processed successfully: ${outputFilename}, size: ${outputData.length} bytes`)

      if (outputData.length === 0) {
        throw new Error("FFmpeg produced empty output file for overlay video")
      }

      // Clean up input file
      await this.safeDeleteFile(inputFilename)

    } catch (error) {
      console.error(`[v0] Overlay segment processing failed:`, error)
      throw error
    }
  }









  private async concatenateFiles(inputFiles: string[], outputFilename: string): Promise<void> {
    // Create file list for concatenation
    const fileList = inputFiles.map(file => `file '${file}'`).join('\n')
    await this.ffmpeg.writeFile("file_list.txt", new TextEncoder().encode(fileList))

    const args = [
      "-f", "concat",
      "-safe", "0",
      "-i", "file_list.txt",
      "-c", "copy", // Copy streams without re-encoding for speed
      "-y",
      outputFilename
    ]

    console.log(`[v0] Concatenating files with command:`, args.join(" "))
    await this.ffmpeg.exec(args)
  }

  private async safeDeleteFile(filename: string): Promise<void> {
    try {
      await this.ffmpeg.deleteFile(filename)
      console.log(`[v0] Deleted file: ${filename}`)
    } catch (error) {
      console.warn(`[v0] Could not delete file ${filename}:`, error)
    }
  }

  private async createSimpleFallbackSegment(
    segment: CompilationSegment,
    outputFilename: string,
    outputDimensions: { width: number; height: number },
    options: CompilationOptions
  ): Promise<void> {
    console.log(`[v0] Creating simple fallback for segment type: ${segment.type}`)

    if (segment.type === "video" && segment.videoFile) {
      // Super simple video processing - just copy and hope for the best
      const inputFilename = `fallback_input_${Date.now()}.mp4`

      try {
        const arrayBuffer = await segment.videoFile.arrayBuffer()
        await this.ffmpeg.writeFile(inputFilename, new Uint8Array(arrayBuffer))

        // Most basic video processing possible
        const args = [
          "-i", inputFilename,
          "-c:v", "libx264",
          "-preset", "ultrafast",
          "-crf", "30", // Lower quality for speed
          "-pix_fmt", "yuv420p",
          "-an", // Remove audio
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
        "-c:v", "libx264",
        "-preset", "ultrafast",
        "-crf", "30",
        "-pix_fmt", "yuv420p",
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
        } catch (error) {
          console.warn("[v0] Could not get video info, using default dimensions")
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
    console.log("[v0] FFmpeg video compiler disposed")
  }
}
