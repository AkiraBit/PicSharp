interface CompressErrorOptions {
  cause: unknown;
  payload?: Record<string, any>;
}

export class CompressError extends Error {
  payload?: Record<string, any>;
  constructor(message: string, options: CompressErrorOptions) {
    super(`${message} ${options.cause instanceof Error ? `: ${options.cause.message}` : ''}`, {
      cause: options.cause,
    });

    this.name = 'CompressError';
    this.payload = options.payload;
  }
}
