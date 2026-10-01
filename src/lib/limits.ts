/**
 * Sliding-window event log keyed by user. Backs both rate limits and the
 * moderation strike system.
 *
 * ponytail: in-memory and per process. Every server instance keeps its own
 * counts, so limits multiply with instance count and reset on deploy. Move to
 * Redis (ElastiCache / Azure Cache) or a DB table before running more than one
 * instance.
 */
export class SlidingWindow {
  private events = new Map<string, number[]>();
  private writes = 0;

  constructor(private readonly maxAgeMs: number) {}

  record(key: string, now = Date.now()): void {
    const list = this.prune(key, now);
    list.push(now);
    this.events.set(key, list);
    // Keys are pruned when touched; this sweep also drops users who never come back.
    if (++this.writes % 1000 === 0) for (const k of [...this.events.keys()]) this.prune(k, now);
  }

  /** Timestamps for `key` newer than `windowMs`, oldest first. */
  within(key: string, windowMs: number, now = Date.now()): number[] {
    return this.prune(key, now).filter((t) => t > now - windowMs);
  }

  private prune(key: string, now: number): number[] {
    const kept = (this.events.get(key) ?? []).filter((t) => t > now - this.maxAgeMs);
    // Drop idle keys so the map doesn't grow with every user ever seen.
    if (kept.length) this.events.set(key, kept);
    else this.events.delete(key);
    return kept;
  }
}

const HOUR = 60 * 60_000;
const requests = new SlidingWindow(HOUR);

/** True when `key` has made fewer than `limit` calls in the last hour; records the call. */
export function allowRequest(key: string, limit: number, now = Date.now()): boolean {
  if (requests.within(key, HOUR, now).length >= limit) return false;
  requests.record(key, now);
  return true;
}
