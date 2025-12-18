/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

import { useCallback, useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import {
  ChevronLeft,
  ChevronRight,
  Upload,
  Settings,
  Eye,
  Play,
} from "lucide-react";

import { VideoUploader } from "@/components/video-uploader";
import { VideoPreview } from "@/components/video-preview";
import { VideoProcessingEngine } from "@/components/video-processing-engine";
import { VideoConfiguration } from "./video-configuration";
import { useCreateStreamSession } from "@/app/(main)/streams/misc/api";

// Adjusted the `VideoFile` interface to ensure `file` is always a `File` type
export interface VideoFile {
  id: string;
  file: File;
  name: string;
  size: number;
  duration?: number;
  url?: string;
}

export type WorkflowStep =
  | "upload"
  | "configure"
  | "preview"
  | "process"
  | "create-session";

interface VideoWorkflowProps {
  onComplete?: (result: Blob, meta?: { video_time_stamps?: Record<string, string>[]; gameSession?: any }) => void;
  sessionData?: any; // Session data from the parent component
}

export function VideoWorkflow({ onComplete, sessionData }: VideoWorkflowProps) {
  const [currentStep, setCurrentStep] = useState<
    WorkflowStep | "create-session"
  >(sessionData ? "upload" : "create-session"); // Start with upload if session exists
  const [videos, setVideos] = useState<VideoFile[]>([]);
  const [configuration, setConfiguration] = useState<any>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [processingResult, setProcessingResult] = useState<Blob | null>(null);
  const [createdSessionId, setCreatedSessionId] = useState<number | null>(
    sessionData?.id || null
  );
  const [isLoadingVideos, setIsLoadingVideos] = useState(false);

  const { mutate: createSession, isPending: isCreatingSession } =
    useCreateStreamSession();

  // Load videos from session data when component mounts
  useEffect(() => {
    console.log("VideoWorkflow useEffect triggered:", { 
      sessionData, 
      hasStreamQuestionIds: sessionData?.stream_question_ids,
      videosLength: videos.length 
    });
    
    if (sessionData && sessionData.stream_question_ids && videos.length === 0) {
      setIsLoadingVideos(true);
      
      // Convert array of stream_question_ids to a single object for fetchAndConvertVideos
      const videoObjs = sessionData.stream_question_ids.reduce((acc: any, questionObj: any) => {
        return { ...acc, ...questionObj };
      }, {});
      
      console.log("Loading videos from session data:", videoObjs);
      
      fetchAndConvertVideos(videoObjs)
        .then((videoFiles) => {
          console.log("Loaded video files:", videoFiles);
          setVideos(videoFiles);
          setIsLoadingVideos(false);
        })
        .catch((error) => {
          console.error("Failed to load session videos:", error);
          setIsLoadingVideos(false);
        });
    }
  }, [sessionData, videos.length]);

  const fetchAndConvertVideos = async (videoObjs: any) => {
    console.log("fetchAndConvertVideos called with:", videoObjs);
    
    const videoPromises = Object.entries(videoObjs).map(
      async ([key, urlObj], index) => {
        try {
          console.log(`Processing video ${key}:`, urlObj);
          
          // Extract the URL from the object structure
          let url =
            typeof urlObj === "string"
              ? urlObj
              : Object.values(urlObj as Record<string, string>)[0];

          console.log(`Extracted URL for video ${key}:`, url);

          // Ensure the URL is properly encoded
          const urlObj_parsed = new URL(url);
          url = urlObj_parsed.toString();

          console.log(`Fetching video via proxy for ${key}:`, url);

          // Use a proxy endpoint to fetch the video and avoid CORS issues
          const response = await fetch("/api/proxy-video", {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify({ url }),
          });

          if (!response.ok) {
            throw new Error(`Failed to fetch video via proxy: ${url}`);
          }
          const blob = await response.blob();
          const file = new File([blob], `video-${key}.mp4`, {
            type: blob.type,
          });
          
          console.log(`Successfully loaded video ${key}, size:`, blob.size);
          
          return {
            id: `video-${key}`,
            file,
            name: `Video ${index + 1}`,
            size: blob.size,
          } as VideoFile;
        } catch (error) {
          console.error(`Error fetching video ${key}:`, error);
          return null;
        }
      }
    );

    const videoFiles = await Promise.all(videoPromises);
    return videoFiles.filter((video): video is VideoFile => video !== null);
  };

  const handleCreateSession = () => {
    createSession(undefined, {
      onSuccess: async (data) => {
        if (data.status === "success" && data.video_objs) {
          const videoFiles = await fetchAndConvertVideos(data.video_objs);
          setVideos(videoFiles);
          setCurrentStep("upload");
          setCreatedSessionId(data.session_id);
        }
      },
      onError: (error) => {
        console.error("Failed to create session:", error);
      },
    });
  };
  const handleWorkflowComplete = useCallback(
    (result: Blob, meta?: { video_time_stamps?: Record<string, string>[]; gameSession?: any }) => {
      setProcessingResult(result);
      onComplete?.(result, meta);
    },
    [onComplete]
  );

  const steps = [
    {
      id: "create-session" as const,
      title: "Create Session",
      description: "Initiate creation of stream session",
      icon: Upload,
      completed: !!createdSessionId,
    },
    {
      id: "upload" as const,
      title: "Upload Videos",
      description: "Select 2-6 question videos",
      icon: Upload,
      completed: videos.length >= 2,
    },
    {
      id: "configure" as const,
      title: "Configure",
      description: "Set timing and audio options",
      icon: Settings,
      completed: configuration !== null,
    },
    {
      id: "preview" as const,
      title: "Preview",
      description: "Review video sequence",
      icon: Eye,
      completed: currentStep == "process",
    },
    {
      id: "process" as const,
      title: "Process",
      description: "Compile final video",
      icon: Play,
      completed: !!processingResult,
    },
  ];

  const currentStepIndex = steps.findIndex((step) => step.id === currentStep);
  const canGoNext = () => {
    switch (currentStep) {
      case "upload":
        return videos.length >= 2 && videos.length <= 6;
      case "configure":
        return configuration !== null;
      case "preview":
        return true;
      case "process":
        return false;
      default:
        return false;
    }
  };

  const canGoPrevious = () => {
    return currentStepIndex > 0 && !isProcessing;
  };

  const handleNext = () => {
    if (canGoNext()) {
      const nextIndex = currentStepIndex + 1;
      if (nextIndex < steps.length) {
        setCurrentStep(steps[nextIndex].id);
      }
    }
  };

  const handlePrevious = () => {
    if (canGoPrevious()) {
      const prevIndex = currentStepIndex - 1;
      if (prevIndex >= 0) {
        setCurrentStep(steps[prevIndex].id);
      }
    }
  };

  const handleStepClick = (stepId: WorkflowStep) => {
    if (isProcessing) return;

    const stepIndex = steps.findIndex((step) => step.id === stepId);
    const currentIndex = currentStepIndex;

    // Allow going back to any previous step
    if (stepIndex <= currentIndex) {
      setCurrentStep(stepId);
    }
    // Allow going forward only if all previous steps are completed
    else if (stepIndex === currentIndex + 1 && canGoNext()) {
      setCurrentStep(stepId);
    }
  };

  const renderStepContent = () => {
    switch (currentStep) {
      case "create-session":
        return (
          <div className="flex justify-center items-center h-full">
            <Button
              onClick={handleCreateSession}
              disabled={isCreatingSession}
              className="px-6 py-3 text-lg"
            >
              {isCreatingSession
                ? "Creating Session..."
                : "Create Stream Session"}
            </Button>
          </div>
        );
      case "upload":
        return (
          <div className="space-y-6">
            {/* Show loading state when fetching videos from session */}
            {isLoadingVideos && (
              <Card>
                <CardHeader>
                  <CardTitle>Loading Session Videos</CardTitle>
                  <CardDescription>
                    Fetching videos from session #{sessionData?.id}...
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center justify-center py-8">
                    <div className="text-muted-foreground">Loading videos...</div>
                  </div>
                </CardContent>
              </Card>
            )}
            
            {/* Display uploaded videos */}
            {!isLoadingVideos && videos.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle>Session Videos ({videos.length}/6)</CardTitle>
                  <CardDescription>
                    {sessionData 
                      ? `Videos loaded from session #${sessionData.id}`
                      : videos.length >= 2
                        ? "Ready to proceed to configuration"
                        : "Upload at least 2 videos to continue"
                    }
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {videos.map((video, index) => (
                      <div
                        key={video.id}
                        className="flex items-center gap-3 p-3 bg-muted rounded-lg"
                      >
                        <div className="flex h-10 w-10 items-center justify-center rounded bg-primary/10">
                          <span className="text-sm font-medium text-primary">
                            {index + 1}
                          </span>
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-foreground truncate">
                            {video.name}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            {(video.size / (1024 * 1024)).toFixed(2)} MB
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}
            
            {/* Show video uploader only if no session data */}
            {!sessionData && !isLoadingVideos && (
              <VideoUploader 
                onUpload={(files) => {
                  const videoFiles = files.map((file, index) => ({
                    id: `upload-${Date.now()}-${index}`,
                    file,
                    name: file.name,
                    size: file.size,
                  }));
                  setVideos(prev => [...prev, ...videoFiles]);
                }}
                maxFiles={6 - videos.length}
              />
            )}
          </div>
        );
      case "configure":
        return (
          <VideoConfiguration
            videos={videos}
            configuration={configuration}
            onConfigurationChange={setConfiguration}
          />
        );
      case "preview":
        return (
          <VideoPreview
            videos={videos}
            configuration={configuration}
            onStartProcessing={() => setCurrentStep("process")}
          />
        );
      case "process":
        return (
          <VideoProcessingEngine
            videos={videos}
            configuration={configuration}
            onComplete={handleWorkflowComplete}
            onProcessingStateChange={setIsProcessing}
          />
        );
      default:
        return null;
    }
  };

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      {/* Step Navigation */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            Video Compilation Workflow
            <Badge variant="outline">
              {currentStepIndex + 1} of {steps.length}
            </Badge>
          </CardTitle>
          <CardDescription>steps</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between mb-6">
            {steps.map((step, index) => {
              const Icon = step.icon;
              const isActive = step.id === currentStep;
              const isCompleted = step.completed;
              const isClickable =
                index <= currentStepIndex ||
                (index === currentStepIndex + 1 && canGoNext());

              return (
                <div key={step.id} className="flex items-center">
                  <button
                    onClick={() => handleStepClick(step.id)}
                    disabled={!isClickable || isProcessing}
                    className={`flex flex-col items-center p-4 rounded-lg transition-all ${
                      isCompleted
                        ? "bg-green-100 text-green-700 hover:bg-green-200"
                        : isActive
                        ? "bg-primary text-primary-foreground"
                        : isClickable
                        ? "bg-muted hover:bg-muted/80"
                        : "bg-muted/50 text-muted-foreground cursor-not-allowed"
                    }`}
                  >
                    <Icon className="h-6 w-6 mb-2" />
                    <span className="text-sm font-medium">{step.title}</span>
                    <span className="text-xs opacity-75">
                      {step.description}
                    </span>
                  </button>
                  {index < steps.length - 1 && (
                    <div className="flex-1 h-px bg-border mx-4" />
                  )}
                </div>
              );
            })}
          </div>

          {/* Progress Bar */}
          <div className="mb-6">
            <Progress
              value={(currentStepIndex / (steps.length - 1)) * 100}
              className="h-2"
            />
          </div>

          {/* Navigation Buttons */}
          <div className="flex justify-between">
            <Button
              variant="outline"
              onClick={handlePrevious}
              disabled={!canGoPrevious()}
              className="flex items-center gap-2"
            >
              <ChevronLeft className="h-4 w-4" />
              Previous
            </Button>

            <Button
              onClick={handleNext}
              disabled={!canGoNext() || currentStep === "process"}
              className="flex items-center gap-2"
            >
              Next
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </CardContent>
      </Card>
      {/* Step Content */}
      <div className="min-h-[600px]">{renderStepContent()}</div>
    </div>
  );
}
