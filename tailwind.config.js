/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ["./src/**/*.{js,ts,jsx,tsx,mdx}"],
  theme: {
    extend: {
      colors: {
        bg:      "#03060a",
        surface: "rgba(16,34,50,0.5)",
        accent:  "#07FFEB",
        danger:  "#ff2a2a",
        safe:    "#00e676",
        warn:    "#ffca28",
        subtext: "#8ab4f8",
      },
      fontFamily: {
        mono:    ["'Share Tech Mono'", "monospace"],
        display: ["'Orbitron'", "sans-serif"],
        body:    ["'DM Sans'", "sans-serif"],
      },
      animation: {
        "pulse-danger": "pulse-danger 1s ease-in-out infinite alternate",
        "scan":         "scan 3s linear infinite",
        "flicker":      "flicker 4s ease-in-out infinite",
        "blink":        "blink 1.2s step-end infinite",
      },
      keyframes: {
        "pulse-danger": {
          from: { boxShadow: "0 0 10px rgba(255,42,42,0.6)" },
          to:   { boxShadow: "0 0 30px rgba(255,42,42,0.9), 0 0 10px #ff2a2a" },
        },
        scan: {
          "0%":   { transform: "translateY(-100%)" },
          "100%": { transform: "translateY(100vh)" },
        },
        flicker: {
          "0%, 100%": { opacity: "1" },
          "50%":      { opacity: "0.92" },
          "75%":      { opacity: "0.96" },
        },
        blink: {
          "0%, 100%": { opacity: "1" },
          "50%":      { opacity: "0" },
        },
      },
    },
  },
  plugins: [],
};
