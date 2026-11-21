export const logger = {
  info: (msg, meta = '') => console.log(`[INFO] [${new Date().toISOString()}] ${msg}`, meta ? meta : ''),
  warn: (msg, meta = '') => console.warn(`[WARN] [${new Date().toISOString()}] ${msg}`, meta ? meta : ''),
  error: (msg, meta = '') => console.error(`[ERROR] [${new Date().toISOString()}] ${msg}`, meta ? meta : ''),
  debug: (msg, meta = '') => {
    if (process.env.NODE_ENV !== 'production') {
      console.debug(`[DEBUG] [${new Date().toISOString()}] ${msg}`, meta ? meta : '');
    }
  }
};

// Guarantee global availability across all execution contexts, callbacks, and dynamically loaded modules
if (typeof global !== 'undefined') {
  global.logger = logger;
}
if (typeof globalThis !== 'undefined') {
  globalThis.logger = logger;
}

export default logger;

