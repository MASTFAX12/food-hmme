import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./app/**/*.{js,ts,jsx,tsx}",
    "./components/**/*.{js,ts,jsx,tsx}",
    "./services/**/*.{js,ts,jsx,tsx}",
    "./App.tsx",
  ],
  theme: {
    extend: {
      fontFamily: {
        display: ["'Tajawal'", "'Poppins'", "system-ui", "sans-serif"],
        sans: ["'Tajawal'", "system-ui", "sans-serif"],
      },
      colors: {
        primary: {
          50: "#eef2ff",
          100: "#dfe4ff",
          200: "#c3c7ff",
          300: "#a4a7ff",
          400: "#7e7cff",
          500: "#5b5bff",
          600: "#4a46d6",
          700: "#3833a8",
          800: "#262279",
          900: "#161348",
        },
      },
      boxShadow: {
        glow: "0 10px 40px rgba(91, 91, 255, 0.25)",
      },
      keyframes: {
        "fade-in-up": {
          "0%": { opacity: "0", transform: "translateY(20px)" },
          "100%": { opacity: "1", transform: "translateY(0)" },
        },
      },
      animation: {
        "fade-in-up": "fade-in-up 0.6s ease forwards",
      },
    },
  },
  plugins: [],
};

export default config;
