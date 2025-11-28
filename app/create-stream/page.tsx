"use client";

import { useState, useCallback } from "react";
import { VideoWorkflow } from "@/components/video-workflow";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Download, Play, ArrowLeft, Upload } from "lucide-react";
import { useGetSingleStreamSession } from "../misc/api/getSingleStreamSession";
import { useSearchParams, useRouter } from "next/navigation";
import { Badge } from "@/components/ui/badge";
import { useCompileStreamSession, useInitSingleUpload, useCompleteUpload, useStartLiveSession, usePushStreamQuestion, usePushQuestionsTime, usePushQuestionEndTimer } from "../misc/api";
import HlsPlayer from "@/components/hls-player";
import type { QuestionData } from "../misc/api/postPushStreamQuestion";

export default function CreateStreamPage() {
  const [processingResult, setProcessingResult] = useState<Blob | null>(null);
  const [uploadingCompiled, setUploadingCompiled] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [uploadSuccess, setUploadSuccess] = useState(false);
  const [currentQuestion, setCurrentQuestion] = useState<QuestionData | null>(null);
  const [questionIndex, setQuestionIndex] = useState<number | null>(null);
  const [countdown, setCountdown] = useState<number | null>(null);
  const [timerState, setTimerState] = useState<'idle' | 'running' | 'ended'>('idle');
  const searchParams = useSearchParams();
  const router = useRouter();
  const sessionId = searchParams.get("sessionId");
  
  const { data: sessionData, isLoading, error } = useGetSingleStreamSession(sessionId || undefined);
  const initSingleUpload = useInitSingleUpload();
  const compileSession = useCompileStreamSession();
  const completeUpload = useCompleteUpload();
  const startLive = useStartLiveSession();
  const pushQuestion = usePushStreamQuestion();
  const pushQuestionsTime = usePushQuestionsTime();
  const pushQuestionEndTimer = usePushQuestionEndTimer();

  const handleWorkflowComplete = useCallback((result: Blob) => {
    setProcessingResult(result);
  }, []);

  const handleDownload = useCallback(() => {
    if (!processingResult) return;

    const url = URL.createObjectURL(processingResult);
    const a = document.createElement("a");
    a.href = url;
    a.download = `game-show-video-${Date.now()}.mp4`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }, [processingResult]);

  const handleBackToSessions = () => {
    router.push("/");
  };

  // Timer functionality
  const startCountdownTimer = useCallback(() => {
    if (!currentQuestion) return;
    
    setTimerState('running');
    setCountdown(10);
    
    // Start the timer on backend
    pushQuestionsTime.mutate({ questionId: currentQuestion.question_id });
    
    // Client-side countdown
    const timer = setInterval(() => {
      setCountdown((prev) => {
        if (prev === null || prev <= 1) {
          clearInterval(timer);
          setTimerState('ended');
          // Auto-trigger end timer
          pushQuestionEndTimer.mutate({ questionId: currentQuestion.question_id });
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
  }, [currentQuestion, pushQuestionsTime, pushQuestionEndTimer]);

  const handleNextQuestion = useCallback(() => {
    pushQuestion.mutate({ sessionId: sessionData?.id || 0 }, {
      onSuccess: (data) => {
        setCurrentQuestion(data.data.question);
        setQuestionIndex(data.data.question_index);
        setTimerState('idle');
        setCountdown(null);
      }
    });
  }, [sessionData?.id, pushQuestion]);

  // Helper: upload Blob to S3 via our proxy
  const uploadToS3ViaProxy = async (url: string, data: Blob, contentType?: string) => {
    const proxyUrl = `/api/s3-upload-proxy?url=${encodeURIComponent(url)}`;
    const headers: Record<string, string> = {};
    if (contentType) headers["x-content-type"] = contentType;
    const res = await fetch(proxyUrl, { method: "POST", body: data, headers });
    if (!res.ok) {
      const txt = await res.text().catch(() => "");
      throw new Error(`Proxy upload failed: ${res.status} ${res.statusText} - ${txt}`);
    }
    return res.headers.get("ETag") || res.headers.get("etag") || null;
  };

  // Format date as YY-MM-DD HH:mm:ss
  const formatBackendDate = (d: Date) => {
    const pad = (n: number) => n.toString().padStart(2, "0");
    const yy = d.getFullYear().toString().slice(-2);
    const mm = pad(d.getMonth() + 1);
    const dd = pad(d.getDate());
    const hh = pad(d.getHours());
    const mi = pad(d.getMinutes());
    const ss = pad(d.getSeconds());
    return `${yy}-${mm}-${dd} ${hh}:${mi}:${ss}`;
  };

  const handleUploadCompiled = async () => {
    if (!processingResult || !sessionData) return;
    setUploadingCompiled(true);
    setUploadError(null);
    setUploadSuccess(false);

    try {
      const filename = `compiled_session_${sessionData.id}.mp4`;
      const filesize = processingResult.size;

      // 1) Init single upload to get presigned URL + asset_id
      const initRes = await initSingleUpload.mutateAsync({ filename, filesize });
      const { presigned_url, asset_id } = initRes.data;

      if (!presigned_url) throw new Error("No presigned URL returned from init upload");

      // 2) Upload the compiled blob to S3 via proxy (set correct content type)
      const contentType = processingResult.type || "video/mp4";
      await uploadToS3ViaProxy(presigned_url, processingResult, contentType);

      // 3) Mark upload complete so backend records the asset
      await completeUpload.mutateAsync({ asset_id });

      // 4) Call compile_stream_sessions/{id} (last step)
      const now = new Date();
      await compileSession.mutateAsync({
        sessionId: sessionData.id,
        payload: {
          start_time: formatBackendDate(now),
          end_time: formatBackendDate(now),
          compiled_video_tag: `VID_${sessionData.id}`,
          video_time_stamps: sessionData.video_time_stamps ?? {},
          compiled_video_asset_id: asset_id,
        },
      });

      setUploadSuccess(true);
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Failed to upload compiled video";
      setUploadError(msg);
    } finally {
      setUploadingCompiled(false);
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-900 dark:to-slate-800">
        <div className="container mx-auto px-4 py-8">
          <div className="flex items-center justify-center py-16">
            <div className="text-muted-foreground">Loading session...</div>
          </div>
        </div>
      </div>
    );
  }

  if (error || !sessionData) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-900 dark:to-slate-800">
        <div className="container mx-auto px-4 py-8">
          <Card className="max-w-md mx-auto">
            <CardHeader>
              <CardTitle className="text-red-600">Session Not Found</CardTitle>
              <CardDescription>
                The session you&apos;re looking for doesn&apos;t exist or couldn&apos;t be loaded.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Button onClick={handleBackToSessions} className="w-full">
                <ArrowLeft className="mr-2 h-4 w-4" />
                Back to Sessions
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-900 dark:to-slate-800">
      <div className="container mx-auto px-4 py-8">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Button
                variant="outline"
                size="sm"
                onClick={handleBackToSessions}
              >
                <ArrowLeft className="h-4 w-4 mr-2" />
                Back
              </Button>
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary">
                <Play className="h-5 w-5 text-primary-foreground" />
              </div>
              <div>
                <h1 className="text-xl font-semibold text-foreground">
                  Create Stream - Session #{sessionData.id}
                </h1>
                <div className="flex items-center gap-2 mt-1">
                  <Badge variant={sessionData.is_active ? "default" : "secondary"}>
                    {sessionData.is_active ? "Active" : "Inactive"}
                  </Badge>
                  <Badge variant={sessionData.upload_completed ? "default" : "destructive"}>
                    {sessionData.upload_completed ? "Upload Complete" : "Upload Pending"}
                  </Badge>
                  <span className="text-sm text-muted-foreground">
                    {sessionData.total_questions} questions
                  </span>
                </div>
              </div>
            </div>
            {processingResult && (
              <div className="flex items-center gap-2">
                <Button
                  onClick={handleDownload}
                  variant="outline"
                  className="flex items-center gap-2"
                >
                  <Download className="h-4 w-4" />
                  Download Video
                </Button>
                <Button
                  onClick={handleUploadCompiled}
                  disabled={uploadingCompiled}
                  className="flex items-center gap-2"
                >
                  <Upload className={`h-4 w-4 ${uploadingCompiled ? 'animate-pulse' : ''}`} />
                  {uploadingCompiled ? "Uploading..." : "Upload Compiled Video"}
                </Button>
              </div>
            )}
          </div>
        </div>

        {/* Session Info Card */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle>Session Information</CardTitle>
            <CardDescription>
              Created on {new Date(sessionData.created_at).toLocaleDateString()} at {new Date(sessionData.created_at).toLocaleTimeString()}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
              <div>
                <span className="font-medium">Session ID:</span>
                <div>#{sessionData.id}</div>
              </div>
              <div>
                <span className="font-medium">Questions:</span>
                <div>{sessionData.total_questions}</div>
              </div>
              <div>
                <span className="font-medium">Stream Used:</span>
                <div>{sessionData.stream_used ? "Yes" : "No"}</div>
              </div>
              <div>
                <span className="font-medium">Video Asset:</span>
                <div>{sessionData.compiled_video_asset_id ? "Available" : "Not generated"}</div>
              </div>
            </div>
          </CardContent>
        </Card>

        {sessionData.live_stream_url ? (
          <>
            {/* Live Stream Admin Panel */}
            <Card>
              <CardHeader>
                <CardTitle>Live Stream Admin</CardTitle>
                <CardDescription>
                  Manage the live session and preview the stream.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <HlsPlayer src={sessionData.live_stream_url} title={`Session #${sessionData.id} Live`} />
                  
                  {/* Current Question Display */}
                  {currentQuestion && (
                    <Card className="border-blue-200 bg-blue-50">
                      <CardHeader className="pb-3">
                        <div className="flex justify-between items-center">
                          <CardTitle className="text-blue-800">Current Question #{questionIndex}</CardTitle>
                          <div className="flex gap-2">
                            {timerState === 'idle' && (
                              <Button
                                onClick={startCountdownTimer}
                                disabled={!currentQuestion}
                                size="sm"
                                variant="default"
                              >
                                Start Timer
                              </Button>
                            )}
                            {timerState === 'running' && (
                              <div className="flex items-center gap-2">
                                <div className="bg-red-500 text-white px-3 py-1 rounded text-sm font-mono">
                                  {countdown}s
                                </div>
                                <span className="text-sm text-gray-600">Time remaining</span>
                              </div>
                            )}
                            {timerState === 'ended' && (
                              <Button
                                onClick={handleNextQuestion}
                                disabled={pushQuestion.isPending}
                                size="sm"
                                variant="default"
                              >
                                {pushQuestion.isPending ? "Loading..." : "Next Question"}
                              </Button>
                            )}
                          </div>
                        </div>
                      </CardHeader>
                      <CardContent>
                        <div className="space-y-3">
                          <p className="font-medium text-gray-900">{currentQuestion.question}</p>
                          <div className="grid grid-cols-2 gap-2 text-sm">
                            <div className="p-2 bg-white rounded border">
                              <span className="font-medium text-blue-600">A:</span> {currentQuestion.option_a}
                            </div>
                            <div className="p-2 bg-white rounded border">
                              <span className="font-medium text-blue-600">B:</span> {currentQuestion.option_b}
                            </div>
                            <div className="p-2 bg-white rounded border">
                              <span className="font-medium text-blue-600">C:</span> {currentQuestion.option_c}
                            </div>
                            <div className="p-2 bg-white rounded border">
                              <span className="font-medium text-blue-600">D:</span> {currentQuestion.option_d}
                            </div>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  )}
                  
                  <div className="flex gap-3">
                    <Button
                      onClick={() => startLive.mutate({ sessionId: sessionData.id })}
                      disabled={startLive.isPending}
                    >
                      {startLive.isPending ? "Starting..." : "Start Live Session"}
                    </Button>
                    <Button
                      onClick={() => pushQuestion.mutate({ sessionId: sessionData.id }, {
                        onSuccess: (data) => {
                          setCurrentQuestion(data.data.question);
                          setQuestionIndex(data.data.question_index);
                        }
                      })}
                      disabled={pushQuestion.isPending}
                      variant="outline"
                    >
                      {pushQuestion.isPending ? "Pushing..." : "Push Question"}
                    </Button>
                    {startLive.isSuccess && (
                      <span className="text-sm text-green-600">Live session started.</span>
                    )}
                    {startLive.isError && (
                      <span className="text-sm text-red-600">Failed to start live session.</span>
                    )}
                    {pushQuestion.isSuccess && (
                      <span className="text-sm text-green-600">Question pushed successfully.</span>
                    )}
                    {pushQuestion.isError && (
                      <span className="text-sm text-red-600">Failed to push question.</span>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          </>
        ) : (
          <>
            {/* Main Workflow */}
            <VideoWorkflow onComplete={handleWorkflowComplete} sessionData={sessionData} />

            {/* Success Message */}
            {processingResult && (
              <Card className="mt-8 border-green-200 bg-green-50">
                <CardHeader>
                  <CardTitle className="text-green-800">Video Processing Complete!</CardTitle>
                  <CardDescription className="text-green-600">
                    Video has been successfully compiled and is ready for download.
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="grid gap-3 sm:grid-cols-2">
                    <Button onClick={handleDownload} variant="outline">
                      <Download className="h-4 w-4 mr-2" />
                      Download Final Video
                    </Button>
                    <Button onClick={handleUploadCompiled} disabled={uploadingCompiled}>
                      <Upload className="h-4 w-4 mr-2" />
                      {uploadingCompiled ? "Uploading..." : "Upload Compiled Video"}
                    </Button>
                  </div>
                  {uploadError && (
                    <p className="mt-3 text-sm text-red-600">{uploadError}</p>
                  )}
                  {uploadSuccess && !uploadError && (
                    <p className="mt-3 text-sm text-green-700">
                      Compiled video uploaded and session compiled successfully.
                    </p>
                  )}
                </CardContent>
              </Card>
            )}
          </>
        )}
      </div>
    </div>
  );
}
