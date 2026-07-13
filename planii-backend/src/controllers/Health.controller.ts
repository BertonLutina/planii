import { asyncHandler } from '../middleware/auth'
import * as HealthService from '../services/health.service'

export const check = asyncHandler(async (_req, res) => {
  res.json(await HealthService.check())
})
