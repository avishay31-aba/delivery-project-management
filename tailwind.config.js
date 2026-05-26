/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        sf: {
          brand: '#0176d3',
          'brand-dark': '#014486',
          'brand-light': '#1b96ff',
          header: '#f3f3f3',
          sidebar: '#032d60',
          'sidebar-hover': '#014486',
          'sidebar-active': '#0176d3',
          border: '#c9c9c9',
          surface: '#ffffff',
          'surface-alt': '#f3f3f3',
          text: '#181818',
          'text-muted': '#706e6b',
          success: '#2e844a',
          warning: '#fe9339',
          error: '#ea001e',
          info: '#0176d3',
        },
      },
      fontFamily: {
        sans: [
          'Segoe UI',
          'Salesforce Sans',
          'system-ui',
          '-apple-system',
          'sans-serif',
        ],
      },
      boxShadow: {
        sf: '0 2px 4px rgba(0, 0, 0, 0.1)',
      },
    },
  },
  plugins: [],
}
