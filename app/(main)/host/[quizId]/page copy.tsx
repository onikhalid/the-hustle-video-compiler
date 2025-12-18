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
import { StatusBadge } from "../components/StatusBadge";
import { ActionSection, ActionConfig } from "../components/ActionSection";
import { DataGrid, DataPoint } from "../components/DataGrid";

const cardBase = "rounded-3xl border border-white/10 bg-white/[0.04] p-5";

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
      const tokenPayload = await hostToken.mutateAsync(
        quizId
      );
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
    } catch {
      addLog("Failed to send session end.");
    }
    setLoading(false);
  };

  // Next question
  const handleNextQuestion = () => {
    setQuestion(null);
    setCorrectOption(null);
    setTimer(10);
    setTimerRunning(false);
  };

  const metadata = useMemo<DataPoint[]>(() => {
    if (!quizData?.data) {
      return [];
    }

    return [
      {
        label: "Game Code",
        value: quizData.data.game_code ? String(quizData.data.game_code) : undefined,
      },
      {
        label: "Status",
        value: quizData.data.status ? String(quizData.data.status) : undefined,
      },
      {
        label: "Anchor",
        value: quizData.data.anchor_name ? String(quizData.data.anchor_name) : undefined,
      },
      {
        label: "Stage",
        value: stageDetails?.data?.name
          ? String(stageDetails.data.name)
          : undefined,
      },
    ];
  }, [quizData?.data, stageDetails?.data?.name]);

  if (loadingQuiz) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#0b001c]">
        <span className="animate-pulse text-sm text-white/60">Loading quiz…</span>
      </div>
    );
  }

  return (
    <div className="min-h-screen   pb-16">
      <div className="mx-auto flex w-full max-w-[1440px] flex-col gap-8 px-4 py-10 sm:px-6 lg:px-10">
        <header className="rounded-3xl border border-white/10 bg-white/[0.05] p-6 shadow-[0_40px_80px_-60px_rgba(15,0,38,0.9)] backdrop-blur">
          <div className="flex flex-col gap-6 lg:flex-row lg:items-start lg:justify-between">
            <div className="flex flex-col gap-4">
              <button
                type="button"
                onClick={() => router.push("/host")}
                className="w-max rounded-full border border-white/10 bg-white/10 px-4 py-2 text-xs font-semibold uppercase tracking-[0.2em] text-white/70 transition hover:bg-white/20"
              >
                Back to quizzes
              </button>
              <div>
                <h1 className="text-3xl font-semibold text-white/90">
                  Hosting quiz #{quizId}
                </h1>
                <p className="mt-2 max-w-xl text-sm text-white/60">
                  Everything the host needs in one place. Follow the control flow on the
                  right, watch your stage preview, and keep an eye on activity as the
                  show unfolds.
                </p>
              </div>
            </div>
            <div className="flex flex-wrap items-center gap-3">
              <StatusBadge
                label="MQTT"
                value={isConnected ? "Online" : "Offline"}
                tone={isConnected ? "success" : "danger"}
              />
              <StatusBadge
                label="Stage"
                value={isJoined ? "Live" : "Preview"}
                tone={isJoined ? "success" : "warning"}
              />
              {timerRunning && (
                <StatusBadge
                  label="Timer"
                  value={`${timer}s`}
                  tone="accent" 
                />
              )}
            </div>
          </div>

          {metadata.length > 0 && (
            <div className="mt-6">
              <DataGrid points={metadata} />
            </div>
          )}

          {stageDetails?.data?.stage_arn && (
            <div className="mt-4 rounded-2xl border border-white/5 bg-white/[0.03] p-4 text-xs text-white/60">
              <span className="font-semibold text-white/70">Stage ARN:</span>
              <span className="ml-2 break-all text-white/60">
                {stageDetails.data.stage_arn}
              </span>
            </div>
          )}
        </header>

        <div className="grid gap-8 xl:grid-cols-[2fr_1fr]">
          <div className="flex flex-col gap-8">
            <section className={`${cardBase} shadow-[0_30px_60px_-40px_rgba(0,0,0,0.85)]`}>
              <div className="mb-4 flex items-center justify-between">
                <div>
                  <h2 className="text-sm font-semibold uppercase tracking-[0.2em] text-white/50">
                    Stage preview
                  </h2>
                  <p className="mt-1 text-xs text-white/40">
                    Confirm your camera and audio before pushing live to contestants.
                  </p>
                </div>
                <StatusBadge
                  label="Realtime"
                  value={stageDetails?.data?.name || "Unlinked"}
                  tone={stageDetails?.data?.name ? "default" : "warning"}
                />
              </div>
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
                  <div className="absolute left-5 top-5 flex items-center gap-2 rounded-full bg-emerald-500/80 px-3 py-1 text-xs font-semibold text-white">
                    <span className="h-2 w-2 animate-pulse rounded-full bg-white"></span>
                    Live to stage
                  </div>
                )}
              </div>
              <p className="mt-4 text-xs text-white/50">
                {isJoined
                  ? "You are currently connected to the IVS stage. The audience sees whatever you broadcast here."
                  : "Join the stage when you are ready to go live. Test your mic and lighting first."}
              </p>
            </section>

            {remoteParticipants.length > 0 && (
              <section className={cardBase}>
                <div className="mb-4 flex items-center justify-between">
                  <div>
                    <h2 className="text-sm font-semibold uppercase tracking-[0.2em] text-white/50">
                      Remote participants
                    </h2>
                    <p className="mt-1 text-xs text-white/40">
                      Monitor connected co-hosts or guests.
                    </p>
                  </div>
                  <span className="rounded-full bg-white/10 px-3 py-1 text-xs text-white/70">
                    {remoteParticipants.length} active
                  </span>
                </div>
                <div className="grid gap-4 md:grid-cols-2">
                  {remoteParticipants.map((participant) => (
                    <div
                      key={participant.participantId}
                      className="relative w-full overflow-hidden rounded-2xl border border-white/10 bg-black pb-[56.25%]"
                    >
                      <video
                        className="absolute inset-0 h-full w-full object-cover"
                        playsInline
                        autoPlay
                        ref={(videoEl) => {
                          if (videoEl && participant.mediaStream) {
                            if (videoEl.srcObject !== participant.mediaStream) {
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
                      <span className="absolute bottom-3 left-3 rounded-full bg-black/60 px-3 py-1 text-[10px] font-semibold uppercase tracking-wide text-white">
                        {participant.participantId}
                      </span>
                    </div>
                  ))}
                </div>
              </section>
            )}

            <section className={cardBase}>
              <div className="mb-5 flex items-center justify-between">
                <div>
                  <h2 className="text-sm font-semibold uppercase tracking-[0.2em] text-white/50">
                    Question feed
                  </h2>
                  <p className="mt-1 text-xs text-white/40">
                    Check the prompt before starting the timer.
                  </p>
                </div>
                {question && (
                  <span className="rounded-full bg-indigo-500/20 px-4 py-1 text-xs font-semibold text-indigo-200">
                    Q{questionIndex}
                  </span>
                )}
              </div>

              {question ? (
                <div className="space-y-5">
                  <div>
                    <p className="text-base font-semibold text-white/90">
                      {question.question}
                    </p>
                  </div>
                  <div className="grid gap-3 sm:grid-cols-2">
                    {["option_a", "option_b", "option_c", "option_d"].map((key, idx) => {
                      const optionKey = key as keyof typeof question;
                      const label = String.fromCharCode(65 + idx);
                      const isCorrect = correctOption === label;
                      return (
                        <div
                          key={optionKey as string | number}
                          className={`rounded-2xl border px-4 py-3 text-sm font-medium transition ${
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
                    })}
                  </div>
                  {correctOption && (
                    <div className="rounded-2xl border border-emerald-500/30 bg-emerald-500/10 px-4 py-3 text-xs font-semibold text-emerald-200">
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
            </section>

            <section className={cardBase}>
              <div className="mb-4 flex items-center justify-between">
                <h2 className="text-sm font-semibold uppercase tracking-[0.2em] text-white/50">
                  Activity log
                </h2>
                <span className="text-xs text-white/40">Newest first</span>
              </div>
              <div className="h-56 overflow-y-auto rounded-2xl border border-white/5 bg-black/40 p-4 font-mono text-[11px] text-white/70">
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
          </div>

          <aside className="flex flex-col gap-8">
            <section className={`${cardBase} space-y-5`}>
              <div>
                <h2 className="text-sm font-semibold uppercase tracking-[0.2em] text-white/50">
                  Live status
                </h2>
                <p className="mt-1 text-xs text-white/40">
                  Keep tabs on timing and answers as you move through the quiz.
                </p>
              </div>

              <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-5">
                <p className="text-xs uppercase tracking-[0.3em] text-white/40">
                  Timer
                </p>
                <div className="mt-3 flex items-end justify-between">
                  <span className="text-4xl font-semibold text-white/90">
                    {timerRunning ? timer : "00"}
                  </span>
                  <span className="text-xs text-white/40">seconds</span>
                </div>
                <div className="mt-4 h-2 w-full overflow-hidden rounded-full bg-white/10">
                  <div
                    className="h-full rounded-full bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500 transition-all"
                    style={{ width: `${Math.max(0, Math.min(timer, 10)) * 10}%` }}
                  ></div>
                </div>
              </div>

              <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-5">
                <p className="text-xs uppercase tracking-[0.3em] text-white/40">
                  Correct option
                </p>
                <div className="mt-3 flex items-center justify-between">
                  <span className="text-3xl font-semibold text-emerald-300">
                    {correctOption || "?"}
                  </span>
                  <span className="text-xs text-white/40">
                    Auto-filled after tally
                  </span>
                </div>
              </div>
            </section>

            <ActionSection
              title="Broadcast"
              hint="Manage your link to the IVS real-time stage."
              actions={[
                {
                  label: isJoined ? "Stage active" : "Go live",
                  description: isJoined
                    ? "You are already publishing to the stage."
                    : "Connect to the stage when you are ready for contestants to see you.",
                  onClick: handleGoLive,
                  disabled: loading || isJoined,
                  tone: isJoined ? "neutral" : "accent",
                },
                {
                  label: "Stop stream",
                  description: "Disconnect from the stage and end the broadcast feed.",
                  onClick: handleStopStream,
                  disabled: loading || !isJoined,
                  tone: "danger",
                },
              ]}
            />

            <ActionSection
              title="Question flow"
              hint="Move players through each round in order."
              actions={[
                {
                  label: "Start quiz",
                  description: "Send the warm-up signal and open the session to players.",
                  onClick: handleStartQuiz,
                  disabled: loading,
                },
                {
                  label: "Send next question",
                  description: timerRunning
                    ? "Timer active – wait for it to finish before swapping questions."
                    : "Push the next question to every connected player.",
                  onClick: handleSendQuestion,
                  disabled: loading || timerRunning,
                },
                {
                  label: "Start timer",
                  description: question
                    ? "Begin the countdown – players can now lock answers."
                    : "Load a question before starting the timer.",
                  onClick: handleStartTimer,
                  disabled: !question || timerRunning,
                  tone: "accent",
                },
                {
                  label: "Send tally now",
                  description: question
                    ? "Force a tally update if you need to refresh the leaderboard."
                    : "Requires a question in play.",
                  onClick: handleManualTally,
                  disabled: loading || !question,
                  tone: "neutral",
                },
           
                {
                  label: "End quiz",
                  description: "Wrap up the session and share final standings with everyone.",
                  onClick: handleEndQuiz,
                  disabled: loading,
                  tone: "danger",
                },
              ]}
            />

            <section className={cardBase}>
              <div>
                <h2 className="text-sm font-semibold uppercase tracking-[0.2em] text-white/50">
                  Quick tips
                </h2>
                <ul className="mt-4 space-y-3 text-xs text-white/50">
                  <li>Run through “Send next question” → “Start timer” → “Send tally now”.</li>
                  <li>Use “Next question placeholder” if you want to preview the next prompt privately.</li>
                  <li>Keep the activity log open to confirm MQTT events landed.</li>
                </ul>
              </div>
            </section>
          </aside>
        </div>
      </div>
    </div>
  );
}
