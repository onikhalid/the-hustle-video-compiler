import { tokenlessAxios } from "@/lib/axios";
import {  useQuery } from "@tanstack/react-query";

const getStreamSessions = async (url?: string) => {
  const endpoint = url || "/live-streams/stream_sessions";
  const res = await tokenlessAxios.get(endpoint);
  return res.data as APIResponse;
};

export const useGetStreamSessions = (url?: string) => {
  return useQuery({
    queryFn: () => getStreamSessions(url),
    queryKey: ["get-stream-sessions", url],
  });
};


interface APIResponse {
  count: number;
  next: string | null;
  previous: string | null;
  results: TStreamSession[];
}

interface TStreamSession {
  id: number;
  updated_at: string;
  created_at: string;
  stream_question_ids: StreamQuestionsId[];
  start_time: null;
  end_time: null;
  is_active: boolean;
  compiled_video_asset_id: string | null;
  compiled_video_tag: string | null;
  video_time_stamps: Videotimestamps;
  total_questions: number;
  upload_completed: boolean;
  stream_used: boolean;
}

interface Videotimestamps {
  0:{
    name:string;
  }
}

interface StreamQuestionsId {
  '6'?: string;
  '5'?: string;
  '4'?: string;
  '3'?: string;
  '2'?: string;
  '1'?: string;
}

interface RootObject {
  sessionId: string;
  videoId: string;
  totalDuration: number;
  questionCount: number;
  events: Event[];
  createdAt: string;
  version: string;
}

interface Event {
  id: string;
  type: string;
  timestamp: number;
  duration: number;
  metadata: Metadata;
  questionNumber?: number;
}

interface Metadata {
  totalQuestions: number;
  videoId?: string;
  questionId?: string;
  isLastQuestion?: boolean;
  countdownValue?: number;
}