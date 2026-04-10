/** @type {import('tailwindcss').Config} */
import colors from "tailwindcss/colors";

export default {
  content: ["./index.html", "./src/**/*.{js,jsx}"] ,
  theme: {
    extend: {
      fontFamily: {
        display: ["Inter", "ui-sans-serif", "system-ui"],
        body: ["Inter", "ui-sans-serif", "system-ui"],
      },
      colors: {
        ink: "#0f172a",
        slate: colors.slate,
        ocean: "#8b5cf6",
        mint: "#34d399",
        blush: "#fb7185",
        lemon: "#facc15",
        sand: "#f6f1ea",
      },
      boxShadow: {
        glow: "0 14px 50px rgba(139, 92, 246, 0.22)",
        card: "0 18px 50px rgba(15, 23, 42, 0.08)",
      },
      keyframes: {
        floatIn: {
          "0%": { opacity: "0", transform: "translateY(12px)" },
          "100%": { opacity: "1", transform: "translateY(0)" },
        },
        pulseSoft: {
          "0%, 100%": { opacity: "1" },
          "50%": { opacity: "0.6" },
        },
      },
      animation: {
        floatIn: "floatIn 0.6s ease-out",
        pulseSoft: "pulseSoft 2.5s ease-in-out infinite",
      },
    },
  },
  plugins: [],
};
