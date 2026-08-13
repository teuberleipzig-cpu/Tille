import { FakeBoardProvider } from './fake-board-provider.js';
import { TrelloProvider } from './trello-provider.js';
export function createBoardProvider(config) {
  if (config.boardProvider === 'trello') return new TrelloProvider(config.trello);
  if (config.boardProvider === 'fake') return new FakeBoardProvider();
  throw new Error('Unsupported board provider');
}
