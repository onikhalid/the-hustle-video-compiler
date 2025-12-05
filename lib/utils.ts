import { AxiosError } from "axios";
import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}


/**
 * @param error An axios error instance. Usually returned by React Query.
 * @returns The error message formatted for the UI. Contents of an array are merged into a single string.
 */
export const formatAxiosErrorMessage = (
  // Typed as any because errors from server do not have a consistent shape.
  // eslint-disable-next-line @typescript-eslint/ban-ts-comment
  //@ts-ignore
  error: AxiosError<any, any>
) => {
  const firstDigitInResponseStatus = String(error?.response?.status).charAt(0);

  if (firstDigitInResponseStatus === "5") {
    return "Server Error";
  }

  // Return default error message string if user is not connected to the internet.
  if (error?.code === "ERR_NETWORK") {
    return `${error.message}. Please check your internet connection.`;
  }

  const errorMessage = Object.values(error?.response?.data).flat();

  if (Array.isArray(errorMessage)) {
    const allMessages = errorMessage
      //@ts-expect-error blablabla
      .filter((m) => isNaN(m) && typeof m === "string")
      // eslint-disable-next-line @typescript-eslint/ban-ts-comment
      //@ts-expect-error
      .map((m) => capitalizeFirstLetter(m))
      .join(". ");

    return `${allMessages}`;
  }
};