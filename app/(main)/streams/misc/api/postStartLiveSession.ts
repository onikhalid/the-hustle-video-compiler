import { gameAxios, tokenlessAxios } from "@/lib/axios";
import { useMutation } from "@tanstack/react-query";

export interface StartLiveSessionArgs {
  sessionId: string | number;
}

const startLiveSession = async ({ sessionId }: StartLiveSessionArgs) => {
  const res = await gameAxios.post(
    `/live-streams/start_live_session/${sessionId}`
  );
  return res.data as { status: string };
};

export const useStartLiveSession = () => {
  return useMutation({
    mutationFn: startLiveSession,
    mutationKey: ["start-live-session"],
  });
};
