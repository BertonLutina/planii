/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        planii: {
          bg: 'var(--bg)', surface: 'var(--surface)', surface2: 'var(--surface-2)',
          line: 'var(--line)', text: 'var(--text)', muted: 'var(--muted)',
          accent: 'var(--accent)', accentbg: 'var(--accent-bg)',
          ok: 'var(--ok)', danger: 'var(--danger)', warn: 'var(--warn)',
        },
      },
      borderRadius: { xl2: '12px' },
    },
  },
  plugins: [],
}
