export class HttpError extends Error {
  constructor(
    public readonly status: number,
    message: string,
  ) {
    super(message)
    this.name = 'HttpError'
  }
}

export function fail(status: number, message: string): never {
  throw new HttpError(status, message)
}
