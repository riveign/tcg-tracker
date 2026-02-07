interface RateLimitEntry {
  attempts: number[];
}

export class RateLimiter {
  private store: Map<string, RateLimitEntry> = new Map();
  private cleanupInterval: ReturnType<typeof setInterval> | null = null;

  constructor(
    private maxAttempts: number,
    private windowMs: number,
    private cleanupIntervalMs: number = 60000 // Clean up every minute
  ) {
    this.startCleanup();
  }

  /**
   * Check if a key has exceeded the rate limit
   * @param key - Unique identifier (e.g., email address)
   * @returns true if rate limit is exceeded
   */
  isRateLimited(key: string): boolean {
    const now = Date.now();
    const entry = this.store.get(key);

    if (!entry) {
      this.store.set(key, { attempts: [now] });
      return false;
    }

    // Filter out expired attempts
    entry.attempts = entry.attempts.filter(
      (timestamp) => now - timestamp < this.windowMs
    );

    // Check if rate limit is exceeded
    if (entry.attempts.length >= this.maxAttempts) {
      return true;
    }

    // Add new attempt
    entry.attempts.push(now);
    return false;
  }

  /**
   * Get remaining attempts for a key
   * @param key - Unique identifier
   * @returns number of remaining attempts
   */
  getRemainingAttempts(key: string): number {
    const now = Date.now();
    const entry = this.store.get(key);

    if (!entry) {
      return this.maxAttempts;
    }

    // Filter out expired attempts
    entry.attempts = entry.attempts.filter(
      (timestamp) => now - timestamp < this.windowMs
    );

    return Math.max(0, this.maxAttempts - entry.attempts.length);
  }

  /**
   * Reset rate limit for a key
   * @param key - Unique identifier
   */
  reset(key: string): void {
    this.store.delete(key);
  }

  /**
   * Start automatic cleanup of expired entries
   */
  private startCleanup(): void {
    this.cleanupInterval = setInterval(() => {
      const now = Date.now();

      for (const [key, entry] of this.store.entries()) {
        // Filter out expired attempts
        entry.attempts = entry.attempts.filter(
          (timestamp) => now - timestamp < this.windowMs
        );

        // Remove entry if no recent attempts
        if (entry.attempts.length === 0) {
          this.store.delete(key);
        }
      }
    }, this.cleanupIntervalMs);
  }

  /**
   * Stop the cleanup interval (for cleanup/testing)
   */
  stopCleanup(): void {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
      this.cleanupInterval = null;
    }
  }
}

/**
 * Rate limiter for password reset requests
 * Limits to 3 requests per 15 minutes per email
 */
export const passwordResetLimiter = new RateLimiter(
  3, // max attempts
  15 * 60 * 1000 // 15 minutes in milliseconds
);
