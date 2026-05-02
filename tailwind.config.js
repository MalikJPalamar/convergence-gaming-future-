/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        forge: {
          bg: "#0b0d10",
          panel: "#11151b",
          line: "#1f2730",
          ink: "#e6edf3",
          mute: "#8b97a4",
          accent: "#7ee8c2",
          warn: "#f5b169",
          danger: "#ef6f6c",
        },
      },
      fontFamily: {
        sans: ["Inter", "ui-sans-serif", "system-ui", "sans-serif"],
        mono: ["JetBrains Mono", "ui-monospace", "monospace"],
      },
    },
  },
  plugins: [],
};
