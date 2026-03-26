import type { Config } from "tailwindcss";

const config: Config = {
  darkMode: ["class"],
  content: [
    "./pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: ["DM Sans", "sans-serif"],
        mono: ["DM Mono", "monospace"],
      },
      colors: {
        background: "#F7F6F2",
        surface: "#FFFFFF",
        surface2: "#F0EFE9",
        border: "rgba(0,0,0,0.08)",
        text: "#1A1A18",
        muted: "#6B6B65",
        hint: "#A0A09A",
        green: {
          DEFAULT: "#3B6D11",
          bg: "#EAF3DE",
        },
        amber: {
          DEFAULT: "#BA7517",
          bg: "#FAEEDA",
        },
        red: {
          DEFAULT: "#A32D2D",
          bg: "#FCEBEB",
        },
        blue: {
          DEFAULT: "#185FA5",
          bg: "#E6F1FB",
        },
      },
      borderRadius: {
        card: "10px",
        "card-lg": "14px",
      },
      boxShadow: {
        card: "0 1px 3px rgba(0,0,0,0.06)",
      },
      keyframes: {
        "accordion-down": {
          from: { height: "0" },
          to: { height: "var(--radix-accordion-content-height)" },
        },
        "accordion-up": {
          from: { height: "var(--radix-accordion-content-height)" },
          to: { height: "0" },
        },
      },
      animation: {
        "accordion-down": "accordion-down 0.2s ease-out",
        "accordion-up": "accordion-up 0.2s ease-out",
      },
    },
  },
  plugins: [require("tailwindcss-animate")],
};

export default config;
