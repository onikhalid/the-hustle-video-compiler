import Axios from "axios";
import type { AxiosInstance } from "axios";

const API_BASE_URL = process.env
  .NEXT_PUBLIC_API_URL as string;

 
export const gameAxios = Axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  }
});


export const tokenlessAxios = Axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  }
});

tokenlessAxios.interceptors.request.use((config) => {
  Object.assign(config.headers, {
    "ngrok-skip-browser-warning": "true",
  });
  return config;
});

export const setAxiosDefaultToken = (
  token: string,
  axiosInstance: AxiosInstance
) => {
  if (token) {
    axiosInstance.defaults.headers.common.Authorization = `Bearer ${token}`;
  
  }
};

export const deleteAxiosDefaultToken = () => {
  delete gameAxios.defaults.headers.common.Authorization;
};
