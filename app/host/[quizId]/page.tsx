"use client";

import React, { useState, useRef } from "react";
import { useParams, useRouter } from "next/navigation";

import {
  useStartQuizGame,
  useRequestNextQuestion,
  useStartQuestionTime,
  useRetrieveQuiz,
  useElapseQuestionTime,
  useQuizStartDetails,
} from "../misc/api/quizHostApi";
import { getQuestionResultsTally } from "../misc/api/quizHostApi";

import { useIVSBroadcast } from "@/hooks/useIVSBroadcast";
import { useMQTT } from "@/hooks/useMqttService";

export default function QuizDetailPage() {
  const params = useParams();
  const router = useRouter();
  const quizId = params.quizId as string;

  const { data: startDetails } = useQuizStartDetails(quizId);

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
  const { data: quizData, isLoading: loadingQuiz } = useRetrieveQuiz(quizId);

  const { startBroadcast, stopBroadcast } = useIVSBroadcast();
  const previewCanvasRef = useRef<HTMLCanvasElement>(null);

  // Helper: log events
  const addLog = (msg: string) => setLog((prev) => [msg, ...prev.slice(0, 9)]);

  const handleGoLive = async () => {
    if (!previewCanvasRef.current) {
      addLog("Preview unavailable. Try reloading the page.");
      return;
    }

    const ingestServer = startDetails?.data?.ingest_server;
    const streamKey = startDetails?.data?.stream_key;

    if (!ingestServer || !streamKey) {
      addLog("Stream credentials missing. Check quiz settings.");
      return;
    }

    try {
      const devices = await navigator.mediaDevices.enumerateDevices();

      const camera = devices.find((d) => d.kind === "videoinput");
      const mic = devices.find((d) => d.kind === "audioinput");

      if (!camera || !mic) {
        alert("Camera or microphone not found");
        return;
      }

      await startBroadcast(ingestServer, streamKey, previewCanvasRef.current);
      addLog("Broadcast started");
    } catch (err) {
      console.error(err);
      addLog("Failed to start broadcast. Check console for details.");
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

  if (loadingQuiz) {
    return (
      <div className="p-8 max-w-6xl mx-auto">
        <div className="text-center text-gray-500">Loading quiz...</div>
      </div>
    );
  }

  return (
    <div className="p-8 max-w-6xl mx-auto">
      {/* Header with back button */}
      <div className="mb-6">
        <button
          onClick={() => router.push("/host")}
          className="text-blue-600 hover:text-blue-800 mb-4 flex items-center gap-2"
        >
          ← Back to Quiz List
        </button>
        <div className="bg-white p-6 rounded-lg shadow-md">
          <h1 className="text-2xl font-bold mb-2">Quiz #{quizId}</h1>
          {quizData?.data && (
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <span className="font-semibold">Game Code:</span>{" "}
                {quizData.data.game_code || "N/A"}
              </div>
              <div>
                <span className="font-semibold">Status:</span>{" "}
                {quizData.data.status || "N/A"}
              </div>
              <div>
                <span className="font-semibold">Anchor:</span>{" "}
                {quizData.data.anchor_name || "N/A"}
              </div>
              <div>
                <span className="font-semibold">MQTT:</span>{" "}
                <span
                  className={isConnected ? "text-green-600" : "text-red-600"}
                >
                  {isConnected ? "Connected" : "Disconnected"}
                </span>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Control Buttons */}
      <div className="mb-6 flex gap-2 items-center flex-wrap">
        <button
          onClick={handleStartQuiz}
          className="bg-blue-700 text-white px-6 py-3 rounded-lg font-semibold hover:bg-blue-800 transition-colors"
          disabled={loading}
        >
          Start Quiz
        </button>
        <button
          onClick={handleSendQuestion}
          className="bg-blue-600 text-white px-6 py-3 rounded-lg font-semibold hover:bg-blue-700 transition-colors"
          disabled={loading || timerRunning}
        >
          Send Next Question
        </button>
        <button
          onClick={handleStartTimer}
          className="bg-orange-600 text-white px-6 py-3 rounded-lg font-semibold hover:bg-orange-700 transition-colors"
          disabled={!question || timerRunning}
        >
          Start Timer
        </button>
        <button
          onClick={handleManualTally}
          className="bg-purple-700 text-white px-6 py-3 rounded-lg font-semibold hover:bg-purple-800 transition-colors"
          disabled={loading || !question}
        >
          Send Tally Now
        </button>
        <button
          onClick={handleEndQuiz}
          className="bg-red-600 text-white px-6 py-3 rounded-lg font-semibold hover:bg-red-700 transition-colors"
          disabled={loading}
        >
          End Quiz
        </button>
        <button
          onClick={handleNextQuestion}
          className="bg-gray-600 text-white px-6 py-3 rounded-lg font-semibold hover:bg-gray-700 transition-colors"
          disabled={timerRunning}
        >
          Next Question
        </button>
      </div>
      <div className="w-full max-w-4xl mx-auto mb-4">
        <div className="relative w-full rounded-lg overflow-hidden bg-black pb-[56.25%]">
          <canvas
            ref={previewCanvasRef}
            className="absolute inset-0 h-full w-full"
          />
        </div>
      </div>

      <div className="mb-6 flex flex-wrap gap-2">
        <button
          onClick={handleGoLive}
          className="bg-green-600 text-white px-6 py-3 rounded-lg font-semibold"
        >
          Go Live
        </button>

        <button
          onClick={stopBroadcast}
          className="bg-red-600 text-white px-6 py-3 rounded-lg font-semibold"
        >
          Stop Stream
        </button>
      </div>

      {/* Status Display */}
      <div className="grid grid-cols-2 gap-4 mb-6">
        <div className="bg-white p-4 rounded-lg shadow">
          <span className="font-semibold">Timer: </span>
          <span className="text-2xl font-bold">
            {timerRunning ? timer : "-"}
          </span>
        </div>
        <div className="bg-white p-4 rounded-lg shadow">
          <span className="font-semibold">Correct Option: </span>
          <span className="text-2xl font-bold text-green-600">
            {correctOption || "-"}
          </span>
        </div>
      </div>

      {/* Log */}
      <div className="mb-6 bg-white p-4 rounded-lg shadow">
        <span className="font-semibold mb-2 block">Activity Log:</span>
        <ul className="text-xs bg-gray-900 text-white p-3 rounded h-40 overflow-y-auto">
          {log.length > 0 ? (
            log.map((l, i) => (
              <li key={i} className="mb-1">
                {l}
              </li>
            ))
          ) : (
            <li className="text-gray-400">No activity yet</li>
          )}
        </ul>
      </div>

      {/* Current Question Display */}
      {question && (
        <div className="bg-white p-6 rounded-lg shadow-md">
          <div className="font-semibold text-lg mb-3">Current Question:</div>
          <div className="mb-4">
            <b className="text-blue-600">Q{questionIndex}:</b>{" "}
            {question.question}
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div className="p-3 bg-gray-50 rounded border">
              <span className="font-semibold">A.</span> {question.option_a}
            </div>
            <div className="p-3 bg-gray-50 rounded border">
              <span className="font-semibold">B.</span> {question.option_b}
            </div>
            <div className="p-3 bg-gray-50 rounded border">
              <span className="font-semibold">C.</span> {question.option_c}
            </div>
            <div className="p-3 bg-gray-50 rounded border">
              <span className="font-semibold">D.</span> {question.option_d}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
