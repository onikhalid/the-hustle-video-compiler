import { tokenlessAxios } from "@/lib/axios";
import { useMutation } from "@tanstack/react-query";

export interface CompleteUploadPayload {
  asset_id: number;
}

const completeUpload = async (payload: CompleteUploadPayload) => {
  const res = await tokenlessAxios.post(
    "/live-streams/video_upload/complete",
    payload
  );
  return res.data as { status: string };
};

export const useCompleteUpload = () => {
  return useMutation({
    mutationFn: completeUpload,
    mutationKey: ["complete-upload"],
  });
};
