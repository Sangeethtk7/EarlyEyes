/** @type {import('tailwindcss').Config} */
import forms from '@tailwindcss/forms';
import animate from 'tailwindcss-animate';

export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        parent: {
          bg: "var(--parent-bg, #FAFAF7)",
          primary: "var(--parent-primary, #7C9E87)",
          accent: "var(--parent-accent, #C4714F)",
          text: "var(--parent-text, #2C2C2C)",
          muted: "var(--parent-text-muted, #6B7280)",
          card: "var(--parent-card, #FFFFFF)",
          border: "var(--parent-border, #E8E5E0)",
        },
        clinic: {
          bg: "var(--clinic-bg, #FFFFFF)",
          primary: "var(--clinic-primary, #4F46E5)",
          text: "var(--clinic-text, #475569)",
          card: "var(--clinic-card, #F8FAFC)",
          border: "var(--clinic-border, #E2E8F0)",
        },
        risk: {
          low: "var(--risk-low, #7C9E87)",
          moderate: "var(--risk-moderate, #D4A853)",
          high: "var(--risk-high, #C4714F)",
        },
      },
      fontFamily: {
        sans: ["Inter", "sans-serif"],
      },
    },
  },
  plugins: [forms, animate],
}
