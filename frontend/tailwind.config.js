export default {
  content: [
    "./index.html",
    "./src/**/*.{js,jsx}"
  ],
  theme: {
    extend: {
      colors: {
        'neon-green': '#39FF14',
        'neon-purple': '#BC13FE',
        'ghost-white': 'rgba(255, 255, 255, 0.1)'
      },
      animation: {
        'pulse-glow': 'pulse-glow 2s ease-in-out infinite',
        'float': 'float 3s ease-in-out infinite'
      },
      keyframes: {
        'pulse-glow': {
          '0%, 100%': { boxShadow: '0 0 20px rgba(57, 255, 20, 0.5)' },
          '50%': { boxShadow: '0 0 40px rgba(57, 255, 20, 0.8)' }
        },
        'float': {
          '0%, 100%': { transform: 'translateY(0px)' },
          '50%': { transform: 'translateY(-10px)' }
        }
      }
    }
  },
  plugins: []
};
