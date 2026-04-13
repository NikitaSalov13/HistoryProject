import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./app/**/*.{ts,tsx}",
    "./components/**/*.{ts,tsx}",
    "./lib/**/*.{ts,tsx}"
  ],
  theme: {
    extend: {
      colors: {
        parchment: "#f4efe4",
        ink: "#182337",
        rust: "#8b3e2f",
        sea: "#1f5f78",
        moss: "#355f3f"
      },
      boxShadow: {
        panel: "0 16px 40px rgba(24, 35, 55, 0.12)"
      }
    }
  },
  plugins: []
};

export default config;
