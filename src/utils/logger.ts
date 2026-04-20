import type { Logger } from '../types/config.js';

export const noopLogger: Logger = {
  debug() {},
  info() {},
  warn() {},
  error() {},
};
