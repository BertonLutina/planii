import { defineConfig } from '@playwright/test'

// Runs against the production build (`vite preview`) because the PWA service worker only exists there.
// Build first: `npm run test:e2e`.
export default defineConfig({
  testDir: './e2e',
  timeout: 90_000,
  reporter: 'list',
  use: { baseURL: 'http://localhost:4173', channel: 'chrome', serviceWorkers: 'allow', screenshot: 'only-on-failure' },
  webServer: [
    {
      command: 'npx vite preview --port 4173 --strictPort',
      url: 'http://localhost:4173',
      reuseExistingServer: !process.env.CI,
      timeout: 90_000,
    },
    {
      // Same build, but with the response headers of nginx.conf (CSP, Permissions-Policy).
      command: 'node e2e/serve-with-nginx-headers.mjs',
      url: 'http://localhost:4174',
      reuseExistingServer: !process.env.CI,
      timeout: 30_000,
    },
  ],
})
