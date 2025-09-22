export class UpdateError extends Error {
  payload?: Record<string, any>;
  constructor(message: string, cause: unknown, payload?: Record<string, any>) {
    super(message, {
      cause,
    });

    this.name = 'UpdateError';
    this.payload = payload;
  }
}
