import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

/**
 * Merges class names safely using clsx and tailwind-merge.
 */
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/**
 * Calculates a child's age in years and months based on date of birth.
 */
export function calculateAge(dobString: string): string {
  if (!dobString) return "";
  const dob = new Date(dobString);
  const now = new Date();
  
  let years = now.getFullYear() - dob.getFullYear();
  let months = now.getMonth() - dob.getMonth();
  
  if (months < 0 || (months === 0 && now.getDate() < dob.getDate())) {
    years--;
    months += 12;
  }
  
  if (years === 0) {
    return `${months} month${months !== 1 ? "s" : ""}`;
  }
  
  if (months === 0) {
    return `${years} year${years !== 1 ? "s" : ""}`;
  }
  
  return `${years} year${years !== 1 ? "s" : ""}, ${months} month${months !== 1 ? "s" : ""}`;
}

/**
 * Formats a date string to a human-readable layout: e.g., "Oct 12, 2026".
 */
export function formatDate(dateString: string): string {
  if (!dateString) return "";
  const date = new Date(dateString);
  return date.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

/**
 * Formats a date to relative time, e.g. "2 hours ago", "yesterday".
 */
export function formatRelativeDate(dateString: string): string {
  if (!dateString) return "";
  const date = new Date(dateString);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.round(diffMs / 60000);
  const diffHours = Math.round(diffMs / 3600000);
  const diffDays = Math.round(diffMs / 86400000);

  if (diffMins < 1) return "Just now";
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays === 1) return "Yesterday";
  if (diffDays < 7) return `${diffDays}d ago`;
  
  return formatDate(dateString);
}
