export class MemoryRateLimit {
  constructor({ max, windowMs, now = Date.now }) { Object.assign(this, { max, windowMs, now }); this.entries = new Map(); }
  allow(key) { const now = this.now(); const values = (this.entries.get(key) || []).filter(time => now - time < this.windowMs); values.push(now); this.entries.set(key, values); return values.length <= this.max; }
}
