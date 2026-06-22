export interface RateLimiter {
  isLimitReached(key: string, limit: number, windowMs: number): Promise<boolean>;
}

export class InMemoryRateLimiter implements RateLimiter {
  private store = new Map<string, { count: number; resetAt: number }>();

  public async isLimitReached(key: string, limit: number, windowMs: number): Promise<boolean> {
    const now = Date.now();
    const record = this.store.get(key);

    if (!record || now > record.resetAt) {
      this.store.set(key, {
        count: 1,
        resetAt: now + windowMs,
      });
      return false;
    }

    record.count += 1;
    if (record.count > limit) {
      return true;
    }

    return false;
  }
}

export const rateLimiter = new InMemoryRateLimiter();

