export class SidecarError extends Error {
  payload?: Record<string, any>;
  constructor(message: string, payload?: Record<string, any>) {
    super(message);

    this.name = 'SidecarError';
    this.payload = payload;
  }
}
