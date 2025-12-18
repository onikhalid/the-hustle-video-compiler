import { tokenlessAxios } from "@/lib/axios";
import { useMutation } from "@tanstack/react-query";

export interface InitSingleUploadPayload {
  filename: string;
  filesize: number;
}

export interface InitResult {
  status: string;
  data: {
    asset_id: number;
    s3_key: string;
    presigned_url: string;
  };
}

const initSingleUpload = async (payload: InitSingleUploadPayload) => {
  const res = await tokenlessAxios.post("/live-streams/single_upload", payload);
  return res.data as InitResult;
};

export const useInitSingleUpload = () => {
  return useMutation({
    mutationFn: initSingleUpload,
    mutationKey: ["init-single-upload"],
  });
};
