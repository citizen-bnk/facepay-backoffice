import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        midnight: { DEFAULT: "#081020", 800: "#0D1A30", 700: "#14233F", 600: "#1C2F52" },
        ink: "#050810",
        gold: { DEFAULT: "#D4A53A", light: "#F2CE6B", dark: "#B8862B", text: "#7A5A12" },
        slate: { fp: "#6B7280" },
        mist: "#F5F5F5",
        canvas: "#F4F6FA",
      },
      fontFamily: { sans: ["'Montserrat Variable'", "Montserrat", "system-ui", "sans-serif"] },
      backgroundImage: { "gold-gradient": "linear-gradient(135deg,#F2CE6B 0%,#D4A53A 55%,#B8862B 100%)" },
      boxShadow: { card: "0 1px 2px rgba(8,16,32,.04), 0 4px 16px rgba(8,16,32,.05)" },
    },
  },
  plugins: [],
};
export default config;
