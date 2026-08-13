export class MemoryRateLimit {
  constructor({ max, windowMs, now = Date.now }) { Object.assign(this, { max, windowMs, now }); this.entries = new Map(); }
  cleanup(now = this.now()) {
    for (const [key, values] of this.entries) {
      const active = values.filter(time => now - time < this.windowMs);
      if (active.length) this.entries.set(key, active); else this.entries.delete(key);
    }
  }
  allow(key) {
    const now = this.now();
    this.cleanup(now);
    const values = this.entries.get(key) || [];
    values.push(now);
    this.entries.set(key, values);
    return values.length <= this.max;
  }
}
