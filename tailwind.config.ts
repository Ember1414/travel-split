import type { Config } from 'tailwindcss';

const config: Config = {
  darkMode: 'class',
  content: [
    './app/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        // 复古旅行明信片主题
        sand: {
          50: '#FBF6EC',
          100: '#F5EFE3',
          200: '#EBE0C8',
          300: '#D9C49C',
        },
        desert: {
          400: '#E89B5F',
          500: '#E07A3E',
          600: '#C56530',
          700: '#A04E25',
        },
        ink: {
          600: '#4A3D2E',
          700: '#3A2E1F',
          800: '#2A2118',
        },
        moss: {
          500: '#3A6F5C',
          600: '#2D5A4A',
          700: '#1F4538',
        },
        stamp: {
          500: '#C8442C',
          600: '#A8341F',
        },
      },
      fontFamily: {
        hand: ['"LXGW WenKai"', '"霞鹜文楷"', 'Noto Serif SC', 'serif'],
        sans: ['"Noto Sans SC"', 'system-ui', 'sans-serif'],
      },
      borderRadius: {
        card: '12px',
        pill: '24px',
      },
      boxShadow: {
        paper: '0 2px 8px rgba(58, 46, 31, 0.08), 0 1px 2px rgba(58, 46, 31, 0.04)',
        stamp: '0 0 0 2px rgba(200, 68, 44, 0.15)',
      },
      backgroundImage: {
        'paper-texture':
          "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='200' height='200'%3E%3Cfilter id='n'%3E%3CfeTurbulence baseFrequency='0.9' numOctaves='2'/%3E%3CfeColorMatrix values='0 0 0 0 0.4 0 0 0 0 0.3 0 0 0 0 0.2 0 0 0 0.04 0'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E\")",
      },
      keyframes: {
        'fade-up': {
          '0%': { opacity: '0', transform: 'translateY(8px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        'bounce-in': {
          '0%': { transform: 'scale(0.9)' },
          '50%': { transform: 'scale(1.05)' },
          '100%': { transform: 'scale(1)' },
        },
        'slide-in-top': {
          '0%': { opacity: '0', transform: 'translateY(-12px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        'slide-in-bottom': {
          '0%': { opacity: '0', transform: 'translateY(16px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
      },
      animation: {
        'fade-up': 'fade-up 0.4s ease-out both',
        'bounce-in': 'bounce-in 0.3s ease-out',
        'slide-in-top': 'slide-in-top 0.3s ease-out',
        'slide-in-bottom': 'slide-in-bottom 0.3s ease-out',
      },
    },
  },
  plugins: [],
};

export default config;
