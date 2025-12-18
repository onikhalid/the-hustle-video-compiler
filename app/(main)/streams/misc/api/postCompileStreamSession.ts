import { tokenlessAxios } from "@/lib/axios";
import { useMutation } from "@tanstack/react-query";
import { GameEvent } from "@/lib/production-timestamps";
import { eventsToFlatTimestamps } from "@/lib/timestamp-adapter";

// Utility to get ordinal suffix for numbers
function getOrdinal(n: number) {
  const s = ["th", "st", "nd", "rd"], v = n % 100;
  return n + (s[(v - 20) % 10] || s[v] || s[0]);
}

// Generates video_time_stamps array in the requested format
export function generateVideoTimeStamps(questions: Array<{
  quest: string;
  timer_start: string;
  timer_end: string;
  result: string;
}>) {
  const video_time_stamps: Record<string, string>[] = [];
  questions.forEach((q, idx) => {
    const ord = getOrdinal(idx + 1);
    video_time_stamps.push({ [`${ord}_quest`]: q.quest });
    video_time_stamps.push({ [`${ord}_timer_start`]: q.timer_start });
    video_time_stamps.push({ [`${ord}_timer_end`]: q.timer_end });
    video_time_stamps.push({ [`${ord}_result`]: q.result });
  });
  return video_time_stamps;
}

// Convert GameEvent[] into the flat keyed HH:MM:SS array used by the backend
export function generateVideoTimeStampsFromEvents(events: GameEvent[]) {
  return eventsToFlatTimestamps(events);
}

export interface CompileSessionPayload {
  start_time: string;
  end_time: string;
  compiled_video_tag: string;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  video_time_stamps: Record<string, any>;
  compiled_video_asset_id: number;
}

export interface CompileSessionArgs {
  sessionId: string | number;
  payload: CompileSessionPayload;
}

const compileStreamSession = async ({ sessionId, payload }: CompileSessionArgs) => {
  const res = await tokenlessAxios.put(
    `/live-streams/compile_stream_sessions/${sessionId}`,
    payload
  );
  return res.data;
};

export const useCompileStreamSession = () => {
  return useMutation({
    mutationFn: compileStreamSession,
    mutationKey: ["compile-stream-session"],
  });
};
