/** @type {import('tailwindcss').Config} */

export default {
  darkMode: "class",
  content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx}"],
  theme: {
    container: {
      center: true,
    },
    extend: {
      fontFamily: {
        display: ['Fraunces', 'Georgia', 'serif'],
        sans: ['"Space Grotesk"', 'system-ui', 'sans-serif'],
      },
      colors: {
        navy: {
          DEFAULT: '#1b2a4a',
          light: '#2a3f6b',
          dark: '#111c33',
        },
        amber: {
          DEFAULT: '#e0a458',
          light: '#eab97e',
          dark: '#c1863a',
        },
        cream: '#f5f1e8',
        graphite: '#2c2c2c',
      },
      boxShadow: {
        card: '0 6px 24px -8px rgba(27, 42, 74, 0.25)',
      },
    },
  },
  plugins: [],
};
