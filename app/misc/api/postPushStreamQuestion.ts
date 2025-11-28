import { tokenlessAxios } from "@/lib/axios";
import { useMutation } from "@tanstack/react-query";

export interface PushStreamQuestionArgs {
  sessionId: string | number;
}

export interface QuestionData {
  question: string;
  option_a: string;
  option_b: string;
  option_c: string;
  option_d: string;
  question_id: number;
}

export interface PushStreamQuestionResponse {
  status: string;
  message: string;
  data: {
    question: QuestionData;
    question_index: number;
  };
}

const pushStreamQuestion = async ({ sessionId }: PushStreamQuestionArgs) => {
  const res = await tokenlessAxios.post(
    `/live-streams/push_stream_questions/${sessionId}`
  );
  return res.data as PushStreamQuestionResponse;
};

export const usePushStreamQuestion = () => {
  return useMutation({
    mutationFn: pushStreamQuestion,
    mutationKey: ["push-stream-question"],
  });
};