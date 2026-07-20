import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./src/**/*.{js,ts,jsx,tsx,mdx}"],
  theme: {
    extend: {
      colors: {
        paper: "#F6F4EF",
        ink: "#1B1A17",
        muted: "#6B6558",
        border: "#E4E0D6",
        indigo: {
          DEFAULT: "#2F3B6B",
          soft: "#DCE7F7",
        },
        stage: {
          applied: "#8B8578",
          oa: "#C08A2E",
          interviewing: "#2F6FBF",
          offer: "#1F8A5F",
          rejected: "#9C4A42",
        },
        urgent: "#C1440E",
      },
      fontFamily: {
        display: ["'Space Grotesk'", "sans-serif"],
        sans: ["Inter", "sans-serif"],
        mono: ["'JetBrains Mono'", "monospace"],
      },
      borderRadius: {
        card: "12px",
      },
    },
  },
  plugins: [],
};

export default config;
