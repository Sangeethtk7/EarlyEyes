/**
 * Design tokens for EarlyEyes.
 * Colors, typography, spacing, and transition constants.
 */

export const COLORS = {
  parent: {
    bg: "#FAFAF7",
    primary: "#7C9E87",
    accent: "#C4714F",
    text: "#2C2C2C",
    muted: "#6B7280",
    card: "#FFFFFF",
    border: "#E8E5E0",
  },
  clinic: {
    bg: "#FFFFFF",
    primary: "#4F46E5",
    text: "#475569",
    card: "#F8FAFC",
    border: "#E2E8F0",
  },
  risk: {
    low: "#7C9E87",
    moderate: "#D4A853",
    high: "#C4714F",
  },
};

export const SPACING = {
  xs: "0.25rem",
  sm: "0.5rem",
  md: "1rem",
  lg: "1.5rem",
  xl: "2rem",
  "2xl": "3rem",
};

export const TRANSITIONS = {
  default: "all 0.3s ease",
  subtle: "all 0.2s cubic-bezier(0.4, 0, 0.2, 1)",
  bounce: "all 0.4s cubic-bezier(0.175, 0.885, 0.32, 1.275)",
};
