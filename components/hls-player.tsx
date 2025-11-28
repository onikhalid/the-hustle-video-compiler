"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Slider } from "@/components/ui/slider";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import {
  Play,
  Pause,
  SkipForward,
  SkipBack,
  Volume2,
  VolumeX,
  Maximize,
} from "lucide-react";

interface QualityLevel {
  height: number;
  width: number;
  bitrate: number;
  index: number;
  label: string;
}

interface VideoMetadata {
  duration: number;
  currentTime: number;
  buffered: TimeRanges | null;
  videoWidth: number;
  videoHeight: number;
  playbackRate: number;
}

interface HlsPlayerProps {
  src: string; // HLS URL
  title?: string;
  className?: string;
}

export default function HlsPlayer({ src, title, className }: HlsPlayerProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  type MinimalLevel = { height: number; width: number; bitrate: number };
  type MinimalHls = {
    levels: (MinimalLevel & { [k: string]: unknown })[];
    currentLevel: number;
    loadSource: (src: string) => void;
    attachMedia: (video: HTMLVideoElement) => void;
    destroy: () => void;
    on: (event: string, handler: (...args: unknown[]) => void) => void;
  };

  const hlsRef = useRef<MinimalHls | null>(null);

  const [isPlaying, setIsPlaying] = useState(false);
  const [volume, setVolume] = useState(1);
  const [isMuted, setIsMuted] = useState(false);
  const [showControls, setShowControls] = useState(true);
  const [qualityLevels, setQualityLevels] = useState<QualityLevel[]>([]);
  const [currentQuality, setCurrentQuality] = useState<number>(-1);
  const [metadata, setMetadata] = useState<VideoMetadata>({
    duration: 0,
    currentTime: 0,
    buffered: null,
    videoWidth: 0,
    videoHeight: 0,
    playbackRate: 1,
  });
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Initialize HLS
  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    const initializeHLS = async () => {
      try {
        setIsLoading(true);
        setError(null);

        // Dynamic import of hls.js
        const Hls = (await import("hls.js")).default as unknown as {
          new (config?: Record<string, unknown>): MinimalHls;
          isSupported: () => boolean;
          Events: { [key: string]: string };
        };

        if (Hls.isSupported()) {
          const hls = new Hls({
            enableWorker: true,
            lowLatencyMode: true,
            backBufferLength: 90,
          });

          hlsRef.current = hls;

          hls.loadSource(src);
          hls.attachMedia(video);

          hls.on(Hls.Events.MANIFEST_PARSED, () => {
            setIsLoading(false);

            // Extract quality levels
            const levels = hls.levels.map((level: MinimalLevel, index: number) => ({
              height: level.height,
              width: level.width,
              bitrate: level.bitrate,
              index,
              label: `${level.height}p (${Math.round(level.bitrate / 1000)}kbps)`,
            }));

            setQualityLevels(levels);
            setCurrentQuality(-1); // Auto quality
          });

          hls.on(Hls.Events.ERROR, (_event: unknown, data: unknown) => {
            const d = (data || {}) as { fatal?: boolean; details?: string };
            if (d.fatal) {
              setError(`HLS Error: ${d.details}`);
              setIsLoading(false);
            }
          });

          hls.on(Hls.Events.LEVEL_SWITCHED, (_event: unknown, data: unknown) => {
            const d = (data || {}) as { level?: number };
            if (typeof d.level === "number") setCurrentQuality(d.level);
          });
        } else if (video.canPlayType("application/vnd.apple.mpegurl")) {
          // Native HLS support (Safari)
          video.src = src;
          setIsLoading(false);
        } else {
          setError("HLS is not supported in this browser");
          setIsLoading(false);
        }
      } catch {
        setError("Failed to load video player");
        setIsLoading(false);
      }
    };

    initializeHLS();

    return () => {
      if (hlsRef.current) {
        hlsRef.current.destroy();
      }
    };
  }, [src]);

  // Video event listeners
  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    const updateMetadata = () => {
      setMetadata({
        duration: video.duration || 0,
        currentTime: video.currentTime || 0,
        buffered: video.buffered,
        videoWidth: video.videoWidth,
        videoHeight: video.videoHeight,
        playbackRate: video.playbackRate,
      });
    };

    const handlePlay = () => setIsPlaying(true);
    const handlePause = () => setIsPlaying(false);
    const handleVolumeChange = () => {
      setVolume(video.volume);
      setIsMuted(video.muted);
    };

    video.addEventListener("loadedmetadata", updateMetadata);
    video.addEventListener("timeupdate", updateMetadata);
    video.addEventListener("progress", updateMetadata);
    video.addEventListener("play", handlePlay);
    video.addEventListener("pause", handlePause);
    video.addEventListener("volumechange", handleVolumeChange);

    return () => {
      video.removeEventListener("loadedmetadata", updateMetadata);
      video.removeEventListener("timeupdate", updateMetadata);
      video.removeEventListener("progress", updateMetadata);
      video.removeEventListener("play", handlePlay);
      video.removeEventListener("pause", handlePause);
      video.removeEventListener("volumechange", handleVolumeChange);
    };
  }, []);

  // Control functions
  const togglePlay = useCallback(() => {
    const video = videoRef.current;
    if (!video) return;

    if (isPlaying) {
      video.pause();
    } else {
      void video.play();
    }
  }, [isPlaying]);

  const handleSeek = useCallback((value: number[]) => {
    const video = videoRef.current;
    if (!video) return;
    video.currentTime = value[0];
  }, []);

  const handleVolumeChange = useCallback((value: number[]) => {
    const video = videoRef.current;
    if (!video) return;
    const newVolume = value[0];
    video.volume = newVolume;
    setVolume(newVolume);
    setIsMuted(newVolume === 0);
  }, []);

  const toggleMute = useCallback(() => {
    const video = videoRef.current;
    if (!video) return;
    video.muted = !video.muted;
  }, []);

  const skipForward = useCallback(() => {
    const video = videoRef.current;
    if (!video) return;
    video.currentTime = Math.min(video.currentTime + 10, video.duration);
  }, []);

  const skipBackward = useCallback(() => {
    const video = videoRef.current;
    if (!video) return;
    video.currentTime = Math.max(video.currentTime - 10, 0);
  }, []);

  const changeQuality = useCallback((qualityIndex: string) => {
    if (!hlsRef.current) return;
    const index = Number.parseInt(qualityIndex);
    hlsRef.current.currentLevel = index;
    setCurrentQuality(index);
  }, []);

  const changePlaybackRate = useCallback((rate: string) => {
    const video = videoRef.current;
    if (!video) return;
    const newRate = Number.parseFloat(rate);
    video.playbackRate = newRate;
    setMetadata((prev) => ({ ...prev, playbackRate: newRate }));
  }, []);

  const toggleFullscreen = useCallback(() => {
    const container = containerRef.current;
    if (!container) return;

    if (!document.fullscreenElement) {
      void container.requestFullscreen();
    } else {
      void document.exitFullscreen();
    }
  }, []);

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, "0")}`;
  };

  const getBufferedPercentage = () => {
    const video = videoRef.current;
    if (!video || !video.buffered.length) return 0;

    const buffered = video.buffered.end(video.buffered.length - 1);
    return (buffered / video.duration) * 100;
  };

  if (error) {
    return (
      <Card className="p-8 text-center">
        <div className="text-destructive mb-4">⚠️ Error Loading Video</div>
        <p className="text-muted-foreground">{error}</p>
      </Card>
    );
  }

  return (
    <Card className={`overflow-hidden ${className ?? ""}`}>
      <div
        ref={containerRef}
        className="relative bg-black group"
        onMouseEnter={() => setShowControls(true)}
        onMouseLeave={() => setShowControls(false)}
      >
        {/* Video Element */}
        <video
          ref={videoRef}
          className="w-full aspect-video"
          onClick={togglePlay}
          onDoubleClick={toggleFullscreen}
          playsInline
          muted={isMuted}
        />

        {/* Loading Overlay */}
        {isLoading && (
          <div className="absolute inset-0 flex items-center justify-center bg-black/50">
            <div className="text-white">Loading video...</div>
          </div>
        )}

        {/* Controls Overlay */}
        <div
          className={`absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent transition-opacity duration-300 ${showControls ? "opacity-100" : "opacity-0"}`}
        >
          {/* Top Bar - Video Info */}
          <div className="absolute top-0 left-0 right-0 p-4">
            <div className="flex items-center justify-between text-white">
              <div>
                {title && <h3 className="font-semibold">{title}</h3>}
                <div className="text-sm text-white/80">
                  {metadata.videoWidth}x{metadata.videoHeight} • {formatTime(metadata.duration)}
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Badge variant="secondary" className="text-xs">
                  {currentQuality === -1 ? "Auto" : qualityLevels[currentQuality]?.label}
                </Badge>
                <Badge variant="secondary" className="text-xs">
                  {metadata.playbackRate}x
                </Badge>
              </div>
            </div>
          </div>

          {/* Bottom Controls */}
          <div className="absolute bottom-0 left-0 right-0 p-4">
            {/* Progress Bar */}
            <div className="mb-4">
              <div className="relative">
                {/* Buffer Bar */}
                <div className="absolute inset-0 bg-white/20 rounded-full h-1">
                  <div
                    className="bg-white/40 h-full rounded-full transition-all duration-300"
                    style={{ width: `${getBufferedPercentage()}%` }}
                  />
                </div>
                {/* Progress Slider */}
                <Slider
                  value={[metadata.currentTime]}
                  max={metadata.duration || 100}
                  step={0.1}
                  onValueChange={handleSeek}
                  className="relative z-10"
                />
              </div>
              <div className="flex justify-between text-xs text-white/80 mt-1">
                <span>{formatTime(metadata.currentTime)}</span>
                <span>{formatTime(metadata.duration)}</span>
              </div>
            </div>

            {/* Control Buttons */}
            <div className="flex items-center justify-between">
              {/* Left Controls */}
              <div className="flex items-center gap-2">
                <Button variant="ghost" size="sm" onClick={togglePlay} className="text-white hover:bg-white/20">
                  {isPlaying ? <Pause className="h-5 w-5" /> : <Play className="h-5 w-5" />}
                </Button>

                <Button variant="ghost" size="sm" onClick={skipBackward} className="text-white hover:bg-white/20">
                  <SkipBack className="h-4 w-4" />
                </Button>

                <Button variant="ghost" size="sm" onClick={skipForward} className="text-white hover:bg-white/20">
                  <SkipForward className="h-4 w-4" />
                </Button>

                {/* Volume Control */}
                <div className="flex items-center gap-2">
                  <Button variant="ghost" size="sm" onClick={toggleMute} className="text-white hover:bg-white/20">
                    {isMuted || volume === 0 ? <VolumeX className="h-4 w-4" /> : <Volume2 className="h-4 w-4" />}
                  </Button>
                  <div className="w-20">
                    <Slider value={[isMuted ? 0 : volume]} max={1} step={0.01} onValueChange={handleVolumeChange} />
                  </div>
                </div>
              </div>

              {/* Right Controls */}
              <div className="flex items-center gap-2">
                {/* Playback Speed */}
                <Select value={metadata.playbackRate.toString()} onValueChange={changePlaybackRate}>
                  <SelectTrigger className="w-20 h-8 text-white border-white/20 bg-black/20">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="0.25">0.25x</SelectItem>
                    <SelectItem value="0.5">0.5x</SelectItem>
                    <SelectItem value="0.75">0.75x</SelectItem>
                    <SelectItem value="1">1x</SelectItem>
                    <SelectItem value="1.25">1.25x</SelectItem>
                    <SelectItem value="1.5">1.5x</SelectItem>
                    <SelectItem value="2">2x</SelectItem>
                  </SelectContent>
                </Select>

                {/* Quality Selection */}
                {qualityLevels.length > 0 && (
                  <Select value={currentQuality.toString()} onValueChange={changeQuality}>
                    <SelectTrigger className="w-32 h-8 text-white border-white/20 bg-black/20">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="-1">Auto</SelectItem>
                      {qualityLevels.map((level) => (
                        <SelectItem key={level.index} value={level.index.toString()}>
                          {level.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}

                <Button variant="ghost" size="sm" onClick={toggleFullscreen} className="text-white hover:bg-white/20">
                  <Maximize className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Video Metadata Panel */}
      <div className="p-4 bg-muted/50">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
          <div>
            <div className="font-medium">Resolution</div>
            <div className="text-muted-foreground">
              {metadata.videoWidth}x{metadata.videoHeight}
            </div>
          </div>
          <div>
            <div className="font-medium">Duration</div>
            <div className="text-muted-foreground">{formatTime(metadata.duration)}</div>
          </div>
          <div>
            <div className="font-medium">Current Quality</div>
            <div className="text-muted-foreground">
              {currentQuality === -1 ? "Auto" : qualityLevels[currentQuality]?.label || "Unknown"}
            </div>
          </div>
          <div>
            <div className="font-medium">Playback Rate</div>
            <div className="text-muted-foreground">{metadata.playbackRate}x</div>
          </div>
        </div>
      </div>
    </Card>
  );
}
