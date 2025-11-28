import { tokenlessAxios } from "@/lib/axios";
import { useMutation } from "@tanstack/react-query";

export interface PushQuestionEndTimerArgs {
  questionId: string | number;
}

const pushQuestionEndTimer = async ({ questionId }: PushQuestionEndTimerArgs) => {
  const res = await tokenlessAxios.post(
    `/live-streams/push_question_end_timer/${questionId}`
  );
  return res.data as { status: string };
};

export const usePushQuestionEndTimer = () => {
  return useMutation({
    mutationFn: pushQuestionEndTimer,
    mutationKey: ["push-question-end-timer"],
  });
};