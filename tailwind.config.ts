import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: ["var(--font-sans)", "ui-sans-serif", "system-ui", "sans-serif"],
      },
      colors: {
        unit: {
          1: { DEFAULT: "#2563eb", soft: "#dbeafe" },
          2: { DEFAULT: "#16a34a", soft: "#dcfce7" },
          3: { DEFAULT: "#9333ea", soft: "#f3e8ff" },
          4: { DEFAULT: "#ea580c", soft: "#ffedd5" },
        },
        birthday: {
          today: "#f59e0b",
          week: "#fef08a",
        },
      },
    },
  },
  plugins: [],
};

export default config;
