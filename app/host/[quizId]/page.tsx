"use client";

import React, { useEffect, useMemo, useRef, useState } from "react";
import { useParams, useRouter } from "next/navigation";

import {
  useStartQuizGame,
  useRequestNextQuestion,
  useStartQuestionTime,
  useRetrieveQuiz,
  useElapseQuestionTime,
  useStopQuizBroadcast,
  useRealtimeStageDetails,
  useHostRealtimeToken,
} from "../misc/api/quizHostApi";
import { getQuestionResultsTally } from "../misc/api/quizHostApi";

import { useIVSRealtimeStage } from "@/hooks/useIVSRealtimeStage";
import { useMQTT } from "@/hooks/useMqttService";
import { StatusBadge } from "../misc/components/StatusBadge";
import { DataGrid, DataPoint } from "../misc/components/DataGrid";
import { TallyModal } from "../misc/components/TallyModal";
import type { QuestionTallyResponse } from "../misc/api/quizHostApi";
import { ChevronLeft } from "lucide-react";
import Link from "next/link";

const cardBase =
  "rounded-3xl border border-white/10 bg-white/[0.04] px-4 py-3.5 md:p-5";

type ControlButton = {
  label: string;
  onClick: () => void;
  disabled?: boolean;
  variant?: "primary" | "accent" | "danger" | "neutral";
  description?: string;
};

const controlButtonBase =
  "flex flex-col justify-center rounded-lg md:rounded-2xl px-2 py-1.5 md:px-4 md:py-3 text-left text-sm font-semibold transition duration-150 ease-out focus:outline-none focus-visible:ring-2 focus-visible:ring-white/60 disabled:cursor-not-allowed disabled:opacity-50";

const controlVariants: Record<NonNullable<ControlButton["variant"]>, string> = {
  primary:
    "bg-gradient-to-r from-indigo-500 to-blue-500 text-white hover:from-indigo-400 hover:to-blue-400",
  accent:
    "bg-gradient-to-r from-purple-500 to-pink-500 text-white hover:from-purple-400 hover:to-pink-400",
  danger:
    "bg-gradient-to-r from-rose-600 to-red-500 text-white hover:from-rose-500 hover:to-red-400",
  neutral: "bg-white/10 text-white hover:bg-white/20",
};

export default function QuizDetailPage() {
  const params = useParams();
  const router = useRouter();
  const quizId = params.quizId as string;

  const { data: stageDetails } = useRealtimeStageDetails(quizId);

  const [question, setQuestion] = useState<any>(null);
  const [questionIndex, setQuestionIndex] = useState<number>(1);
  const [timer, setTimer] = useState<number>(10);
  const [timerRunning, setTimerRunning] = useState(false);
  const [correctOption, setCorrectOption] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [log, setLog] = useState<string[]>([]);
  const [roundTally, setRoundTally] = useState<QuestionTallyResponse["data"] | null>(null);
  const [isTallyModalOpen, setIsTallyModalOpen] = useState(false);
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const { isConnected, sendMessage } = useMQTT();

  // API hooks
  const startQuiz = useStartQuizGame();
  const requestQuestion = useRequestNextQuestion();
  const startQTime = useStartQuestionTime();
  const elapseQTime = useElapseQuestionTime();
  const stopQuizBroadcast = useStopQuizBroadcast();
  const { data: quizData, isLoading: loadingQuiz } = useRetrieveQuiz(quizId);

  const hostToken = useHostRealtimeToken();
  const { joinStage, leaveStage, localStream, remoteParticipants, isJoined } =
    useIVSRealtimeStage();
  const localVideoRef = useRef<HTMLVideoElement>(null);

  const quizStatusRaw = quizData?.data?.status;
  const quizStatus =
    typeof quizStatusRaw === "string" ? quizStatusRaw.toLowerCase() : "";
  const showStartQuiz =
    !quizStatus ||
    ![
      "in_progress",
      "live",
      "running",
      "active",
      "ended",
      "completed",
      "complete",
      "closed",
      "finished",
    ].includes(quizStatus);

  useEffect(() => {
    const videoEl = localVideoRef.current;
    if (!videoEl) return;

    if (!localStream) {
      videoEl.srcObject = null;
      return;
    }

    videoEl.srcObject = localStream;
    videoEl.muted = true;
    videoEl.playsInline = true;
    videoEl.autoplay = true;

    const playPromise = videoEl.play();
    if (playPromise !== undefined) {
      playPromise.catch(() => {
        // Autoplay rejection can be ignored; the user can tap to resume.
      });
    }
  }, [localStream]);

  useEffect(() => {
    return () => {
      void leaveStage();
    };
  }, [leaveStage]);

  // Helper: log events
  const addLog = (msg: string) => setLog((prev) => [msg, ...prev.slice(0, 29)]);

  const handleGoLive = async () => {
    if (isJoined) {
      addLog("Already connected to IVS real-time stage.");
      return;
    }

    if (stageDetails && !stageDetails.data?.stage_arn) {
      addLog("Stage details unavailable. Ensure the real-time stage exists.");
      return;
    }

    setLoading(true);
    try {
      const tokenPayload = await hostToken.mutateAsync(quizId);
      const token = tokenPayload?.data?.participant_token?.token;

      if (!token) {
        addLog("Failed to retrieve host participant token.");
        return;
      }

      await joinStage(token);
      addLog("Joined IVS real-time stage.");
    } catch (err) {
      console.error(err);
      addLog("Failed to join real-time stage.");
      addLog(err instanceof Error ? err.message : String(err));
    } finally {
      setLoading(false);
    }
  };

  const handleStopStream = async () => {
    setLoading(true);
    try {
      try {
        await leaveStage();
        addLog("Left IVS real-time stage.");
      } catch (err) {
        console.error(err);
        addLog("Failed to leave real-time stage.");
      }

      try {
        await stopQuizBroadcast.mutateAsync(quizId);
        addLog("Broadcast stop signal sent.");
      } catch (err) {
        console.error(err);
        addLog("Failed to notify backend to stop broadcast.");
      }
    } finally {
      setLoading(false);
    }
  };

  // Start quiz
  const handleStartQuiz = async () => {
    setLoading(true);
    try {
      await startQuiz.mutateAsync(quizId);
      addLog(`Quiz started: ID ${quizId}`);
    } catch {
      addLog("Failed to start quiz");
    }
    setLoading(false);
  };

  // Request next question and send to player
  const handleSendQuestion = async () => {
    setLoading(true);
    setCorrectOption(null);
    setRoundTally(null);
    setIsTallyModalOpen(false);
    try {
      const res = await requestQuestion.mutateAsync(quizId);
      const q = res.data.question;
      setQuestion(q);
      setQuestionIndex(res.data.question_index);
      // Structure for player
      const payload = {
        event: "quest",
        data: {
          question: {
            question_id: q.question_id,
            question: q.question,
            option_a: q.option_a,
            option_b: q.option_b,
            option_c: q.option_c,
            option_d: q.option_d,
          },
          question_index: res.data.question_index,
        },
      };
      await sendMessage(payload);
      addLog(`Sent question ${res.data.question_index} to players.`);
    } catch (e) {
      addLog("Failed to fetch/send next question");
    }
    setLoading(false);
  };

  // Start timer and notify players
  const handleStartTimer = async () => {
    if (!question) return;
    setTimer(10);
    setTimerRunning(true);
    try {
      await startQTime.mutateAsync(question.question_id);
      await sendMessage({
        event: "timer_start",
        data: { seconds_allowed: 10 },
      });
      addLog("Timer started (10s)");
    } catch {
      addLog("Failed to start question time");
    }
    if (timerRef.current) clearInterval(timerRef.current);
    timerRef.current = setInterval(() => {
      setTimer((prev) => {
        if (prev <= 1) {
          clearInterval(timerRef.current!);
          setTimerRunning(false);
          handleEndTimer();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
  };

  // End timer, send correct option, and tally
  const handleEndTimer = async () => {
    if (!question) return;
    setLoading(true);
    try {
      // Call elapse endpoint first
      await elapseQTime.mutateAsync(question.question_id);
      addLog("Question time elapsed.");

      // Then get tally
      const tallyRes = await getQuestionResultsTally(question.question_id);
      const correct = tallyRes?.data?.question?.correct_option || null;
      setCorrectOption(correct);
      setRoundTally(tallyRes.data);
      setIsTallyModalOpen(true);
      await sendMessage({
        event: "timer_end",
        data: { question: { correct_option: correct } },
      });
      addLog(`Timer ended. Correct: ${correct || "?"}`);
      await sendMessage({ event: "leaderboard_update", data: tallyRes.data });
      addLog("Tally sent.");
    } catch {
      addLog("Failed to get/send tally.");
    }
    setLoading(false);
  };

  // Manual tally fetch/send for current question
  const handleManualTally = async () => {
    if (!question) return;
    setLoading(true);
    try {
      // Call elapse endpoint first if timer was running
      if (timerRunning) {
        await elapseQTime.mutateAsync(question.question_id);
        addLog("Question time elapsed (manual).");
      }

      const tallyRes = await getQuestionResultsTally(question.question_id);
      await sendMessage({ event: "leaderboard_update", data: tallyRes.data });
      addLog("Manual tally sent.");
      console.log(tallyRes.data);
      setRoundTally(tallyRes.data);
      setIsTallyModalOpen(true);
    } catch {
      addLog("Manual tally failed.");
    }
    setLoading(false);
  };

  // End entire quiz session
  const handleEndQuiz = async () => {
    setLoading(true);
    try {
      await sendMessage({ event: "quiz_session_end" });
      addLog("Quiz session end signal sent.");
      setIsTallyModalOpen(false);
      setRoundTally(null);
    } catch {
      addLog("Failed to send session end.");
    }
    setLoading(false);
  };

  const metadata = useMemo<DataPoint[]>(() => {
    if (!quizData?.data) {
      return [];
    }

    return [
      {
        label: "Game Code",
        value: quizData.data.game_code
          ? String(quizData.data.game_code)
          : undefined,
      },
      {
        label: "Status",
        value: quizData.data.status ? String(quizData.data.status) : undefined,
      },
      {
        label: "Anchor",
        value: quizData.data.anchor_name
          ? String(quizData.data.anchor_name)
          : undefined,
      },
      {
        label: "Stage",
        value: stageDetails?.data?.name
          ? String(stageDetails.data.name)
          : undefined,
      },
    ];
  }, [quizData?.data, stageDetails?.data?.name]);

  const stageControlButtons: ControlButton[] = [
    {
      label: isJoined ? "Stage active" : "Go live",
      onClick: handleGoLive,
      disabled: loading || isJoined,
      variant: isJoined ? "neutral" : "accent",
      description: isJoined ? "Already live on stage" : "Connect and go live",
    },
    {
      label: "Stop stream",
      onClick: handleStopStream,
      disabled: loading || !isJoined,
      variant: "danger",
      description: "Disconnect from the stage",
    },
  ];

  const questionControlButtons: ControlButton[] = [
    showStartQuiz
      ? {
          label: "Start quiz",
          onClick: handleStartQuiz,
          disabled: loading,
          variant: "primary",
          description: "Open the session for players",
        }
      : null,
    {
      label: "Send next question",
      onClick: handleSendQuestion,
      disabled: loading || timerRunning,
      variant: "primary",
      description: timerRunning
        ? "Wait for timer to finish"
        : "Push the next prompt",
    },
    {
      label: "Start timer",
      onClick: handleStartTimer,
      disabled: !question || timerRunning,
      variant: "accent",
      description: question ? "Countdown for answers" : "Load a question first",
    },
    {
      label: "Send tally now",
      onClick: handleManualTally,
      disabled: loading || !question,
      variant: "neutral",
      description: "Refresh the leaderboard",
    },
    {
      label: "End quiz",
      onClick: handleEndQuiz,
      disabled: loading,
      variant: "danger",
      description: "Wrap up and share results",
    },
  ].filter(Boolean) as ControlButton[];

  const renderControlButton = (button: ControlButton) => {
    const variant: NonNullable<ControlButton["variant"]> =
      button.variant ?? "primary";
    return (
      <button
        key={button.label}
        type="button"
        onClick={button.onClick}
        disabled={button.disabled}
        className={`${controlButtonBase} ${controlVariants[variant]}`}
      >
        <span className="text-sm md:text-base">{button.label}</span>
        {button.description && (
          <span className="mt-1 hidden text-[0.65rem] font-normal text-white/75 md:block">
            {button.description}
          </span>
        )}
      </button>
    );
  };

  if (loadingQuiz) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#0b001c]">
        <span className="animate-pulse text-sm text-white/60">
          Loading quiz…
        </span>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#050014] via-[#0b001c] to-[#1b0e35] pb-16">
      <div className="mx-auto flex w-full max-w-[1440px] flex-col gap-4 md:gap-6 p-3 md:py-8 sm:px-6 lg:px-10">
        <header className="rounded-3xl border border-white/10 bg-white/[0.05] p-3 md:px-5 md:py5 shadow-[0_40px_80px_-60px_rgba(15,0,38,0.9)] backdrop-blur">
          <div className="flex md:flex-col justify-between gap-4 md:gap-6 lg:flex-row lg:items-start lg:justify-between">
            <div className="flex md:flex-col items-center md:items-start gap-4">
              <Link
                type="button"
                href={"/host"}
                className="flex p-2 md:px-4 md:py-2 items-center justify-center w-max rounded-full border border-white/10 bg-white/10 text-xs font-semibold uppercase tracking-[0.2em] text-white/70 transition hover:bg-white/20"
              >
                <ChevronLeft className="inline size-3 lg:size-5 md:mr-1 md:-ml-1" />
                <span className="max-md:hidden">Back to quizzes</span>
              </Link>
              <div>
                <h1 className="sm:text-2xl md:text-3xl font-semibold text-white/90 truncate ">
                  {/* {quizData?.data?.name || `Quiz ${quizId}`} */}
                  Early Santa Liberty
                </h1>
              </div>
            </div>
            <div className="flex flex-wrap items-center gap-1 md:gap-3 shrink-0">
              <StatusBadge
                label="MQTT"
                value={isConnected ? "Online" : "Offline"}
                tone={isConnected ? "success" : "danger"}
              />
              <StatusBadge
                label="Stage"
                value={isJoined ? "Live" : "Prep"}
                tone={isJoined ? "success" : "warning"}
              />
              {timerRunning && (
                <StatusBadge label="Timer" value={`${timer}s`} tone="accent" />
              )}
            </div>
          </div>

          {metadata.length > 0 && (
            <div className="mt-6 max-md:!hidden">
              <DataGrid points={metadata} />
            </div>
          )}
{/* 
          {stageDetails?.data?.stage_arn && (
            <div className="mt-4 rounded-2xl border border-white/5 bg-white/[0.03] p-4 text-xs text-white/60 max-md:!hidden">
              <span className="font-semibold text-white/70">Stage ARN:</span>
              <span className="ml-2 break-all text-white/60">
                {stageDetails.data.stage_arn}
              </span>
            </div>
          )} */}
        </header>

        <div className="grid gap-4 md:gap-6 xl:auto-rows-min xl:grid-cols-[1.35fr_1fr]">
          <section
            className={`${cardBase} order-1 flex flex-col gap-2.5 md:gap-5 shadow-[0_30px_60px_-40px_rgba(0,0,0,0.85)]`}
          >
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <h2 className="text-sm font-semibold uppercase tracking-[0.2em] text-white/50">
                  Stage preview
                </h2>
              </div>
              <StatusBadge
                className="hidden md:block"
                label="Realtime"
                value={stageDetails?.data?.name || "Unlinked"}
                tone={stageDetails?.data?.name ? "default" : "warning"}
              />
            </div>

            <div className="flex flex-col gap-4 lg:flex-row lg:items-start">
              <div className="flex-1">
                <div className="relative w-full overflow-hidden rounded-3xl border border-white/10 bg-black pb-[56.25%]">
                  <video
                    ref={localVideoRef}
                    className="absolute inset-0 h-full w-full object-cover"
                    muted
                    playsInline
                    autoPlay
                  />
                  {!isJoined && (
                    <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 bg-black/70 text-center">
                      <span className="text-sm font-semibold text-white/80">
                        Preview inactive
                      </span>
                      <span className="text-xs text-white/50">
                        Use “Go live” once your gear is ready.
                      </span>
                    </div>
                  )}
                  {isJoined && (
                    <div className="absolute left-4 top-4 flex items-center gap-2 rounded-full bg-emerald-500/80 px-3 py-1 text-[11px] font-semibold text-white">
                      <span className="h-2 w-2 animate-pulse rounded-full bg-white"></span>
                      Live to stage
                    </div>
                  )}
                </div>
                <div className="mt-3 grid gap-2 grid-cols-2">
                  {stageControlButtons.map(renderControlButton)}
                </div>
              </div>

              {remoteParticipants.length > 0 && (
                <div className="mt-4 w-full rounded-2xl border border-white/10 bg-white/[0.02] p-3 lg:mt-0 lg:ml-4 lg:w-[260px]">
                  <div className="flex items-center justify-between">
                    <h3 className="text-[11px] uppercase tracking-[0.2em] text-white/50">
                      Remote participants
                    </h3>
                    <span className="rounded-full bg-white/10 px-2 py-1 text-[10px] text-white/60">
                      {remoteParticipants.length}
                    </span>
                  </div>
                  <div className="mt-3 flex max-h-56 flex-col gap-3 overflow-y-auto pr-1">
                    {remoteParticipants.map((participant) => (
                      <div
                        key={participant.participantId}
                        className="relative w-full overflow-hidden rounded-xl border border-white/10 bg-black pb-[56%]"
                      >
                        <video
                          className="absolute inset-0 h-full w-full object-cover"
                          playsInline
                          autoPlay
                          ref={(videoEl) => {
                            if (videoEl && participant.mediaStream) {
                              if (
                                videoEl.srcObject !== participant.mediaStream
                              ) {
                                videoEl.srcObject = participant.mediaStream;
                              }
                              videoEl.muted = false;
                              const playPromise = videoEl.play();
                              if (playPromise !== undefined) {
                                playPromise.catch(() => {});
                              }
                            }
                          }}
                        />
                        <span className="absolute bottom-2 left-2 rounded-full bg-black/70 px-2 py-1 text-[9px] font-semibold uppercase tracking-wide text-white">
                          {participant.participantId}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            <p className="text-[0.65rem] md:text-xs text-white/50">
              {isJoined
                ? "You are live on the IVS stage. The audience sees whatever you broadcast here."
                : "Join the stage when you are ready to go live. Test your mic and lighting first."}
            </p>
          </section>

          <section className={`${cardBase} order-2 flex flex-col gap-2.5 md:gap-5`}>
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <h2 className="text-sm font-semibold uppercase tracking-[0.2em] text-white/50">
                  Question feed
                </h2>
              
              </div>
              {question && (
                <span className="rounded-full bg-indigo-500/20 px-4 py-1 text-xs font-semibold text-indigo-200">
                  Q{questionIndex}
                </span>
              )}
            </div>

            {question ? (
              <div className="space-y-4">
                <p className="text-sm font-semibold text-white/90">
                  {question.question}
                </p>
                <div className="grid gap-2 grid-cols-2">
                  {["option_a", "option_b", "option_c", "option_d"].map(
                    (key, idx) => {
                      const optionKey = key as keyof typeof question;
                      const label = String.fromCharCode(65 + idx);
                      const isCorrect = correctOption === label;
                      return (
                        <div
                          key={optionKey as string | number}
                          className={`rounded-2xl border px-4 py-3 text-xs sm:text-sm font-medium transition ${
                            isCorrect
                              ? "border-emerald-500/60 bg-emerald-500/10 text-emerald-100"
                              : "border-white/10 bg-white/[0.03] text-white/80"
                          }`}
                        >
                          <span className="mr-2 text-xs font-semibold tracking-[0.3em] text-white/50">
                            {label}.
                          </span>
                          {question[optionKey]}
                        </div>
                      );
                    }
                  )}
                </div>
                {correctOption && (
                  <div className="rounded-2xl border border-emerald-500/30 bg-emerald-500/10 px-4 py-2 text-xs font-semibold text-emerald-200">
                    Option {correctOption} locked in as the correct answer.
                  </div>
                )}
              </div>
            ) : (
              <div className="flex flex-col items-center gap-3 rounded-2xl border border-dashed border-white/10 bg-white/[0.02] p-8 text-center text-sm text-white/50">
                <span>No active question yet.</span>
                <span>Use “Send next question” to load the next prompt.</span>
              </div>
            )}

            <div className="grid gap-2 grid-cols-2 2xl:grid-cols-3">
              {questionControlButtons.map(renderControlButton)}
            </div>

            <div className="grid gap-2 sm:grid-cols-2">
              <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-4">
                <p className="text-[10px] uppercase tracking-[0.3em] text-white/40">
                  Timer
                </p>
                <div className="mt-2 flex items-end justify-between">
                  <span className="text-3xl font-semibold text-white/90">
                    {timerRunning ? timer : "00"}
                  </span>
                  <span className="text-[11px] text-white/40">seconds</span>
                </div>
                <div className="mt-3 h-1.5 w-full overflow-hidden rounded-full bg-white/10">
                  <div
                    className="h-full transition-[width] ease-linear rounded-full bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500 "
                    style={{
                      width: `${Math.max(0, Math.min(timer, 10)) * 10}%`,
                    }}
                  ></div>
                </div>
              </div>
              <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-4">
                <p className="text-[10px] uppercase tracking-[0.3em] text-white/40">
                  Correct option
                </p>
                <div className="mt-2 flex items-center justify-between">
                  <span className="text-2xl font-semibold text-emerald-300">
                    {correctOption || "?"}
                  </span>
                  <span className="text-[11px] text-white/40">
                    Filled after tally
                  </span>
                </div>
              </div>
            </div>
          </section>

          <section className={`${cardBase} order-3 xl:col-span-2`}>
            <div className="mb-3 flex items-center justify-between">
              <h2 className="text-sm font-semibold uppercase tracking-[0.2em] text-white/50">
                Activity log
              </h2>
              <span className="text-xs text-white/40">Newest first</span>
            </div>
            <div className="h-48 overflow-y-auto rounded-2xl border border-white/5 bg-black/40 p-4 font-mono text-[11px] text-white/70">
              {log.length > 0 ? (
                <ul className="space-y-2">
                  {log.map((entry, index) => (
                    <li key={`${entry}-${index}`} className="leading-relaxed">
                      {entry}
                    </li>
                  ))}
                </ul>
              ) : (
                <div className="flex h-full items-center justify-center text-white/30">
                  Waiting for activity…
                </div>
              )}
            </div>
          </section>

          <section className={`${cardBase} order-4 hidden xl:block`}>
            <h2 className="text-sm font-semibold uppercase tracking-[0.2em] text-white/50">
              Quick tips
            </h2>
            <ul className="mt-4 space-y-2 text-xs text-white/50">
              <li>
                Advance in the order: send question → start timer → send tally.
              </li>
              <li>Use the log to confirm MQTT events land as expected.</li>
              <li>
                Stop stream before leaving the stage to avoid surprise
                broadcasts.
              </li>
            </ul>
          </section>
        </div>
      </div>
      <TallyModal
        isOpen={isTallyModalOpen && !!roundTally}
        onClose={() => setIsTallyModalOpen(false)}
        questionIndex={questionIndex}
        questionText={question?.question ?? null}
        tallyData={roundTally}
      />
    </div>
  );
}
