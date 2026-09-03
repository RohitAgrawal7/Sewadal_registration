import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/lib/**/*.{js,ts,jsx,tsx}",
  ],
  safelist: [
    "bg-blue-100",
    "bg-blue-600",
    "text-blue-800",
    "text-white",
    "border-blue-300",
    "border-blue-700",
    "bg-green-100",
    "bg-green-600",
    "text-green-800",
    "border-green-300",
    "border-green-700",
    "bg-purple-100",
    "bg-purple-600",
    "text-purple-800",
    "border-purple-300",
    "border-purple-700",
    "bg-orange-100",
    "bg-orange-600",
    "text-orange-800",
    "border-orange-300",
    "border-orange-700",
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
