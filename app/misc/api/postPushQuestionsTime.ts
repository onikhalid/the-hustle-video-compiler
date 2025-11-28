import { tokenlessAxios } from "@/lib/axios";
import { useMutation } from "@tanstack/react-query";

export interface PushQuestionsTimeArgs {
  questionId: string | number;
}

const pushQuestionsTime = async ({ questionId }: PushQuestionsTimeArgs) => {
  const res = await tokenlessAxios.post(
    `/live-streams/push_questions_time/${questionId}`
  );
  return res.data as { status: string };
};

export const usePushQuestionsTime = () => {
  return useMutation({
    mutationFn: pushQuestionsTime,
    mutationKey: ["push-questions-time"],
  });
};