import { one } from '../db/pool'

export const findById = (id: string) => one('SELECT * FROM tasks WHERE id=$1', [id])
