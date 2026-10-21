import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        midnight: { DEFAULT: "#0E1A2B", 800: "#0D1A30", 700: "#14233F", 600: "#1C2F52" },
        ink: "#050810",
        gold: { DEFAULT: "#D4AF37", light: "#F6DFA0", dark: "#7A5C00", text: "#7A5A12" },
        slate: { fp: "#6B7280" },
        mist: "#F5F5F5",
        canvas: "#F4F6FA",
      },
      fontFamily: { sans: ['Poppins', "system-ui", "sans-serif"] },
      backgroundImage: { "gold-gradient": "linear-gradient(135deg,#F6DFA0 0%,#D4AF37 55%,#7A5C00 100%)" },
      boxShadow: { card: "0 1px 2px rgba(8,16,32,.04), 0 4px 16px rgba(8,16,32,.05)" },
    },
  },
  plugins: [],
};
export default config;
