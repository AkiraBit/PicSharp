export class CompressError extends Error {
  payload?: Record<string, any>;
  constructor(message: string, cause: unknown, payload?: Record<string, any>) {
    super(message, {
      cause,
    });

    this.name = 'CompressError';
    this.payload = payload;
  }
}
