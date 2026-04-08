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
        ocean: "#0ea5e9",
        mint: "#5eead4",
        sand: "#f6f1ea",
      },
      boxShadow: {
        glow: "0 12px 40px rgba(14, 165, 233, 0.2)",
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
