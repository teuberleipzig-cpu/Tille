import { BoardProvider } from './board-provider.js';

export class BoardConfigurationError extends Error {}
const berlinTime = (iso) => new Intl.DateTimeFormat('sv-SE', { timeZone: 'Europe/Berlin', dateStyle: 'short', timeStyle: 'medium' }).format(new Date(iso));

export class TrelloProvider extends BoardProvider {
  constructor(config, fetchImpl = fetch) { super(); this.config = config; this.fetch = fetchImpl; }
  credentials() {
    if (!this.config.apiKey || !this.config.token) throw new BoardConfigurationError('Board credentials missing');
    return { key: this.config.apiKey, token: this.config.token };
  }
  destination(category) {
    const value = this.config.categoryDestinations[category];
    if (!value) throw new BoardConfigurationError('Category destination missing');
    return value;
  }
  async createFeedback(feedback) {
    if (!this.config.openLabelId) throw new BoardConfigurationError('Open label missing');
    if (feedback.replyEmail && !this.config.replyRequestedLabelId) throw new BoardConfigurationError('Reply label missing');
    const labels = [this.config.openLabelId, ...(feedback.replyEmail ? [this.config.replyRequestedLabelId] : [])];
    const params = new URLSearchParams({ ...this.credentials(), idList: this.destination(feedback.category), idLabels: labels.join(','),
      name: `Website Feedback · ${feedback.category} · ${berlinTime(feedback.receivedAt)}`,
      desc: `${feedback.feedback}\n\n\n________________\n\nReply email: ${feedback.replyEmail || '(nicht angegeben)'}\nReceived at: ${feedback.receivedAt}\nKategorie: ${feedback.category}` });
    const response = await this.fetch('https://api.trello.com/1/cards', { method: 'POST', headers: { 'content-type': 'application/x-www-form-urlencoded' }, body: params });
    if (!response.ok) throw new Error('Board provider request failed');
  }
  async countNewFeedbackSince(timestamp) {
    const credentials = this.credentials();
    const categories = Object.fromEntries(Object.keys(this.config.categoryDestinations).map(category => [category, 0]));
    for (const category of Object.keys(categories)) {
      const destination = this.destination(category);
      const query = new URLSearchParams({ ...credentials, since: timestamp, fields: 'id' });
      const response = await this.fetch(`https://api.trello.com/1/lists/${encodeURIComponent(destination)}/cards?${query}`);
      if (!response.ok) throw new Error('Board provider count failed');
      categories[category] = (await response.json()).length;
    }
    return { total: Object.values(categories).reduce((a, b) => a + b, 0), categories };
  }
}
