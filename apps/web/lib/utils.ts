import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function formatDate(dateInput: string | Date | number, options?: Intl.DateTimeFormatOptions) {
  try {
    const date = new Date(dateInput);
    if (isNaN(date.getTime())) return String(dateInput);
    
    const defaultOptions: Intl.DateTimeFormatOptions = {
      year: "numeric",
      month: "short",
      day: "numeric",
      ...options,
    };
    
    return new Intl.DateTimeFormat("en-US", defaultOptions).format(date);
  } catch {
    return String(dateInput);
  }
}
