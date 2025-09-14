interface SidecarErrorOptions {
  cause: unknown;
  payload?: Record<string, any>;
}

export class SidecarError extends Error {
  payload?: Record<string, any>;
  constructor(message: string, options?: SidecarErrorOptions) {
    super(message);

    this.name = 'SidecarError';
    this.payload = options?.payload;
  }
}
