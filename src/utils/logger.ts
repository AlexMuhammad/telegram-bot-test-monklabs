export const logger = {
  error: (message: string, error?: unknown) => {
    console.log(`[ERROR] ${message}`, error);
  },
  info: (message: string) => {
    console.log(`[INFO] ${message}`);
  },
};
