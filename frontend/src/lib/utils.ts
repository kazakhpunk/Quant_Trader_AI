import { type ClassValue, clsx } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export const getApiUrl = () => {
  return process.env.NODE_ENV === 'development'
    ? process.env.NEXT_PUBLIC_LOCAL
    : process.env.NEXT_PUBLIC_DEPLOY;
};
