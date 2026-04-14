import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatPPM(ppm: number): string {
  if (ppm >= 10000) return `${(ppm / 1000).toFixed(1)}K`;
  return ppm.toString();
}

export function formatTime(): string {
  return new Date().toLocaleTimeString("en-GB", {
    hour:   "2-digit",
    minute: "2-digit",
    second: "2-digit",
  });
}
