import { gameAxios } from "@/lib/axios";
import { useMutation, useQuery } from "@tanstack/react-query";

const createLiveQuiz = async (payload: any) => {
  const res = await gameAxios.post("/quiz/create/", payload);
  return res.data;
};
export const useCreateLiveQuiz = () => {
  return useMutation({ mutationFn: createLiveQuiz });
};

const startQuizGame = async (id: string | number) => {
  const res = await gameAxios.put(`/quiz/start/${id}`);
  return res.data;
};
export const useStartQuizGame = () => {
  return useMutation({
    mutationFn: (id: string | number) => startQuizGame(id),
  });
};

const requestNextQuestion = async (id: string | number) => {
  const res = await gameAxios.post(`/quiz/request/question/${id}`);
  return res.data;
};
export const useRequestNextQuestion = () => {
  return useMutation({
    mutationFn: (id: string | number) => requestNextQuestion(id),
  });
};

const startQuestionTime = async (id: string | number) => {
  const res = await gameAxios.put(`/quiz/question/start/${id}`);
  return res.data;
};
export const useStartQuestionTime = () => {
  return useMutation({
    mutationFn: (id: string | number) => startQuestionTime(id),
  });
};

const elapseQuestionTime = async (id: string | number) => {
  const res = await gameAxios.get(`/quiz/question/elapse/${id}`);
  return res.data;
};
export const useElapseQuestionTime = () => {
  return useMutation({
    mutationFn: (id: string | number) => elapseQuestionTime(id),
  });
};

const stopQuizBroadcast = async (id: string | number) => {
  const res = await gameAxios.get(`/quiz/stop/broadcast/${id}`);
  return res.data;
};
export const useStopQuizBroadcast = () => {
  return useMutation({
    mutationFn: (id: string | number) => stopQuizBroadcast(id),
  });
};

export const getQuestionResultsTally = async (id: string | number) => {
  const res = await gameAxios.get(`/quiz/question/tally/${id}`);
  return res.data;
};
export const useGetQuestionResultsTally = (id?: string | number) => {
  return useQuery({
    queryFn: () => getQuestionResultsTally(id!),
    queryKey: ["get-question-results-tally", id],
    enabled: !!id,
  });
};

interface QuizzesListResponse {
  count: number;
  next: null;
  previous: null;
  results: Results;
}

interface Results {
  status: string;
  message: string;
  data: LiveQuizSession[];
}

export interface LiveQuizSession {
  id: number;
  game_code: string;
  anchor_id: number;
  anchor_name: string;
  status: string;
  winner_id: string | null;
}

const listQuizSessions = async () => {
  const res = await gameAxios.get("/quiz/list/sessions");
  return res.data as QuizzesListResponse;
};
export const useListQuizSessions = () => {
  return useQuery({
    queryFn: listQuizSessions,
    queryKey: ["list-quiz-sessions"],
  });
};

const retrieveQuiz = async (id: string | number) => {
  const res = await gameAxios.get(`/quiz/retrieve/${id}`);
  return res.data;
};


export const useRetrieveQuiz = (id?: string | number) => {
  return useQuery({
    queryFn: () => retrieveQuiz(id!),
    queryKey: ["retrieve-quiz", id],
    enabled: !!id,
  });
};



export interface QuizStartDetailsResponse {
  status: string;
  message: string;
  data: QuizStartDetails;
}

export interface QuizStartDetails {
  channel_arn: string;
  ingest_server: string;
  playback_url: string;
  latency_mode: string;
  stream_key: string;
}

const retrieveQuizStartDetails = async (id: string | number) => {
  const res = await gameAxios.get(`/quiz/start/details/${id}`);
  return res.data as QuizStartDetailsResponse;
};

export const useQuizStartDetails = (id?: string | number) => {
  return useQuery({
    queryFn: () => retrieveQuizStartDetails(id!),
    queryKey: ["quiz-start-details", id],
    enabled: !!id,
  });
};
