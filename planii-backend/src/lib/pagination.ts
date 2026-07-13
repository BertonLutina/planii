export interface PaginationParams {
  page: number
  limit: number
  offset: number
}

export interface PaginatedResult<T> {
  items: T[]
  page: number
  limit: number
  total: number
  totalPages: number
  hasMore: boolean
}

export function parsePagination(
  query: Record<string, unknown>,
  defaults: { page?: number; limit?: number; maxLimit?: number } = {},
): PaginationParams {
  const page = Math.max(1, parseInt(String(query.page ?? defaults.page ?? 1), 10) || 1)
  const max = defaults.maxLimit ?? 100
  const rawLimit = parseInt(String(query.limit ?? defaults.limit ?? 50), 10) || defaults.limit || 50
  const limit = Math.min(max, Math.max(1, rawLimit))
  return { page, limit, offset: (page - 1) * limit }
}

export function paginated<T>(items: T[], total: number, page: number, limit: number): PaginatedResult<T> {
  const totalPages = Math.max(1, Math.ceil(total / limit))
  return {
    items,
    page,
    limit,
    total,
    totalPages,
    hasMore: page < totalPages,
  }
}
