import { BoardProvider } from './board-provider.js';
export class NextcloudDeckProvider extends BoardProvider {
  async createFeedback() { throw new Error('NextcloudDeckProvider is not configured'); }
  async countNewFeedbackSince() { throw new Error('NextcloudDeckProvider is not configured'); }
}
