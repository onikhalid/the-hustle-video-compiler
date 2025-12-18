import { tokenlessAxios } from "@/lib/axios";
import { useMutation } from "@tanstack/react-query";

const createStreamSession = async () => {
  const res = await tokenlessAxios.post(
    "/live-streams/create_stream_sessions/1"
  );
  return res.data as TCreatedSession;
};

export const useCreateStreamSession = () => {
  return useMutation({
    mutationFn: createStreamSession,
    mutationKey: ["create-stream-session"],
  });
};

interface TCreatedSession {
  status: string;
  session_id: number;
  video_objs: Videoobj[];
}

interface Videoobj {
  '6'?: string;
  '5'?: string;
  '4'?: string;
  '3'?: string;
  '2'?: string;
  '1'?: string;
}