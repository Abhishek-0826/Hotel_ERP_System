/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,jsx}"],
  theme: {
    extend: {
      colors: {
        brand: {
          50: "#f2f1fd",
          100: "#e6e4fb",
          200: "#c4bff5",
          300: "#a29aee",
          400: "#8175e6",
          500: "#6256d9",
          600: "#4f45c0",
          700: "#3f379a",
          800: "#2f2a74",
          900: "#211d54",
        },
        sun: {
          50: "#fdf3ec",
          100: "#fbe4d2",
          200: "#f5c39d",
          300: "#eea169",
          400: "#e8834a",
          500: "#dd6a30",
          600: "#c05323",
          700: "#973f1c",
          800: "#6f2f18",
          900: "#4a2010",
        },
        ink: {
          50: "#f6f7f9",
          100: "#eceef2",
          200: "#d7dbe3",
          300: "#b3bac8",
          400: "#8891a3",
          500: "#656f85",
          600: "#4d566b",
          700: "#3a4256",
          800: "#262c3c",
          900: "#14171f",
        },
      },
      fontFamily: {
        sans: ["Inter", "ui-sans-serif", "system-ui", "-apple-system", "Segoe UI", "sans-serif"],
      },
      boxShadow: {
        card: "0 1px 2px rgba(20,23,31,0.04), 0 8px 24px -12px rgba(20,23,31,0.12)",
        pop: "0 12px 32px -8px rgba(31,25,86,0.22)",
      },
      borderRadius: {
        xl2: "1.25rem",
      },
      backgroundImage: {
        "sand-noise": "radial-gradient(circle at 1px 1px, rgba(20,23,31,0.05) 1px, transparent 0)",
      },
      keyframes: {
        fadeIn: { from: { opacity: 0, transform: "translateY(6px)" }, to: { opacity: 1, transform: "translateY(0)" } },
        pulseSoft: { "0%,100%": { opacity: 1 }, "50%": { opacity: 0.55 } },
      },
      animation: {
        fadeIn: "fadeIn .35s ease both",
        pulseSoft: "pulseSoft 1.6s ease-in-out infinite",
      },
    },
  },
  plugins: [],
};
