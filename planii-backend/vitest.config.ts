import { defineConfig } from 'vitest/config'

// Les variables sont posées ICI et non dans tests/setup.ts : les `import` d'un fichier sont exécutés avant
// son corps, donc `src/config/env.ts` lisait `.env` (la base de dev) avant que setup.ts ne change DATABASE_URL.
// Base dédiée par défaut ; en changer avec TEST_DATABASE_URL (son nom doit finir par `_test`, voir tests/setup.ts).
export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    setupFiles: ['./tests/setup.ts'],
    testTimeout: 30_000,
    hookTimeout: 60_000,
    fileParallelism: false,
    env: {
      NODE_ENV: 'test',
      JWT_SECRET: process.env.JWT_SECRET || 'test-jwt-secret',
      DATABASE_URL: process.env.TEST_DATABASE_URL || 'postgres://localhost:5432/planii_test',
      SMTP_PASS: '', // jamais d'envoi réel d'e-mail depuis les tests
      // Le limiteur par IP est en mémoire et partagé par tous les tests du run (tous en 127.0.0.1) : sans cela,
      // le 21e appel /auth/* d'un run répond 429 et fait échouer des tests sans rapport.
      AUTH_RATE_LIMIT_MAX: '100000',
      RATE_LIMIT_MAX: '100000',
    },
  },
})
