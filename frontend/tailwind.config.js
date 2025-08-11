/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        primary: '#1877F2',
        secondary: '#42B72A',
        background: '#F0F2F5',
        card: '#FFFFFF',
        text: '#050505',
        textSecondary: '#65676B',
        border: '#CED0D4',
        error: '#E53935',
      },
      fontFamily: {
        sans: [
          'Segoe UI',
          'Roboto',
          'Arial',
          'sans-serif',
        ],
      },
      boxShadow: {
        card: '0 2px 8px 0 rgba(0,0,0,0.08)',
        button: '0 1px 2px 0 rgba(24,119,242,0.15)',
      },
      borderRadius: {
        xl: '1rem',
      },
    },
  },
  plugins: [],
}

