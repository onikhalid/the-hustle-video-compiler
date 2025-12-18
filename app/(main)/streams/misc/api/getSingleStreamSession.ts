/* eslint-disable @typescript-eslint/no-explicit-any */
import { tokenlessAxios } from "@/lib/axios";
import { useQuery } from "@tanstack/react-query";

const getStreamSessions = async (id?: string) => {
  const res = await tokenlessAxios.get(`/live-streams/retrieve_stream_sessions/${id}`);
  return res.data as TStreamSession;
};

export const useGetSingleStreamSession = (id?: string) => {
  return useQuery({
    queryFn: () => getStreamSessions(id),
    queryKey: ["get-stream-session", id],
    enabled: !!id,
  });
};

interface TStreamSession {
  id: number;
  stream_question_ids: Streamquestionid[];
  updated_at: string;
  created_at: string;
  start_time: string;
  end_time: string;
  is_active: boolean;
  compiled_video_asset_id: number;
  compiled_video_tag: string;
  video_time_stamps: Videotimestamps;
  total_questions: number;
  status: string;
  live_stream_url: string;
  upload_completed: boolean;
  stream_used: boolean;
  compiled: boolean;
}

interface Videotimestamps {
  question: string;
}

interface Streamquestionid {
  '5'?: string;
  '6'?: string;
  '1'?: string;
  '2'?: string;
  '3'?: string;
  '4'?: string;
}
