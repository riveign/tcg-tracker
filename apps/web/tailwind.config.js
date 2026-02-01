/** @type {import('tailwindcss').Config} */
export default {
  darkMode: ['class'],
  content: [
    './index.html',
    './src/**/*.{js,ts,jsx,tsx}',
  ],
  theme: {
    extend: {
      colors: {
        // Cyber-Minimal Theme
        background: {
          DEFAULT: '#0A0E14', // Deep space gray
          surface: '#151922',  // Elevated dark
        },
        accent: {
          cyan: '#5ECBF5',      // Neon cyan - actions
          lavender: '#B497BD',  // Digital lavender - premium
        },
        success: '#AADBC8',     // Mint pixel - completed
        text: {
          primary: '#E6EDF3',   // Cool white
          secondary: '#8B949E', // Muted gray
        },
        // shadcn/ui compatibility
        border: '#1F2937',
        input: '#151922',
        ring: '#5ECBF5',
        foreground: '#E6EDF3',
        primary: {
          DEFAULT: '#5ECBF5',
          foreground: '#0A0E14',
        },
        secondary: {
          DEFAULT: '#151922',
          foreground: '#E6EDF3',
        },
        destructive: {
          DEFAULT: '#EF4444',
          foreground: '#E6EDF3',
        },
        muted: {
          DEFAULT: '#1F2937',
          foreground: '#8B949E',
        },
        accent: {
          DEFAULT: '#B497BD',
          foreground: '#E6EDF3',
        },
        popover: {
          DEFAULT: '#151922',
          foreground: '#E6EDF3',
        },
        card: {
          DEFAULT: '#151922',
          foreground: '#E6EDF3',
        },
      },
      borderRadius: {
        lg: '0.5rem',
        md: '0.375rem',
        sm: '0.25rem',
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
        display: ['Space Grotesk', 'system-ui', 'sans-serif'],
        mono: ['JetBrains Mono', 'monospace'],
      },
    },
  },
  plugins: [require('tailwindcss-animate')],
}
