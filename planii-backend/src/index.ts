import { env } from './config/env'
import { logger } from './logger'
import { runMigrations } from './db/migrate'
import { createApp } from './app'
import { createServer } from './services/notification.service'
import { startReminderScheduler } from './services/reminder.job'
import { purgeExpired } from './oauth/oauth.service'

async function main() {
  await runMigrations()
  const app = createApp()
  const { server } = createServer(app)
  startReminderScheduler()
  // Connecteur IA : purge des codes/jetons expirés (au démarrage puis toutes les 6 h).
  const purge = () => purgeExpired().catch((e) => logger.error({ err: e }, 'purge oauth'))
  void purge()
  setInterval(purge, 6 * 60 * 60 * 1000).unref()
  server.listen(env.PORT, '0.0.0.0', () => {
    logger.info(`Planii backend (PostgreSQL + WebSocket) en écoute sur 0.0.0.0:${env.PORT} — APP_URL=${env.appUrl}`)
  })
}

main().catch((e) => {
  logger.error({ err: e }, 'Échec démarrage')
  process.exit(1)
})
