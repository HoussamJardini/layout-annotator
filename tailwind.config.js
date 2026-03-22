export default {
  content: ["./index.html", "./src/**/*.{js,jsx}"],
  theme: {
    extend: {
      colors: {
        navy: { 900: '#0f1e2e', 800: '#1E3A5F', 700: '#2a4a73' },
        accent: { DEFAULT: '#2E86AB', light: '#4da6cc' },
        surface: { DEFAULT: '#1a2535', raised: '#212d3d', border: '#2d3f55' }
      },
      fontFamily: { mono: ['JetBrains Mono', 'Fira Code', 'monospace'] }
    }
  },
  plugins: []
}
