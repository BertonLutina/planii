import { asyncHandler, auth } from '../middleware/auth'
import * as TodayService from '../services/today.service'
import * as TodayView from '../views/Today.view'

export const get = [auth, asyncHandler(async (req, res) => {
  res.json(TodayView.payload(await TodayService.getToday(req.user!.id)))
})]
