import { BoardProvider } from './board-provider.js';
export class FakeBoardProvider extends BoardProvider {
  constructor() { super(); this.feedback = []; }
  async createFeedback(value) { this.feedback.push(value); }
  async countNewFeedbackSince() { return { total: 0, categories: { Einlass: 0, Bar: 0, Club: 0, Awareness: 0, Sonstiges: 0 } }; }
}
