import { tokenlessAxios } from "@/lib/axios";
import { useMutation } from "@tanstack/react-query";

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
