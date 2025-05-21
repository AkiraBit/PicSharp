import { isProd } from '.';
import {
  info as tauriInfo,
  debug as tauriDebug,
  trace as tauriTrace,
  warn as tauriWarn,
  error as tauriError,
} from '@tauri-apps/plugin-log';

interface Logger {
  log: (message: string, ...args: unknown[]) => void;
  info: (message: string, ...args: unknown[]) => void;
  debug: (message: string, ...args: unknown[]) => void;
  trace: (message: string, ...args: unknown[]) => void;
  warn: (message: string, ...args: unknown[]) => void;
  error: (message: string, ...args: unknown[]) => void;
}

const devLogger: Logger = {
  log: console.log,
  info: console.info,
  debug: console.debug,
  trace: console.trace,
  warn: console.warn,
  error: console.error,
};

const prodLogger: Logger = {
  log: (message, ...args) => {
    tauriInfo(formatMessage(message, args));
    console.log(message, ...args);
  },
  info: (message, ...args) => {
    tauriInfo(formatMessage(message, args));
    console.info(message, ...args);
  },
  debug: (message, ...args) => {
    tauriDebug(formatMessage(message, args));
    console.debug(message, ...args);
  },
  trace: (message, ...args) => {
    tauriTrace(formatMessage(message, args));
    console.trace(message, ...args);
  },
  warn: (message, ...args) => {
    tauriWarn(formatMessage(message, args));
    console.warn(message, ...args);
  },
  error: (message, ...args) => {
    tauriError(formatMessage(message, args));
    console.error(message, ...args);
  },
};

function formatMessage(message: string, args: unknown[]): string {
  if (args.length === 0) {
    return message;
  }
  try {
    return `${message} ${args.map((arg) => (typeof arg === 'object' && arg !== null ? JSON.stringify(arg) : String(arg))).join(' ')}`;
  } catch (e) {
    // Fallback for circular structures or other stringify errors
    return `${message} ${args.map((arg) => String(arg)).join(' ')}`;
  }
}

export const logger: Logger = isProd ? prodLogger : devLogger;
