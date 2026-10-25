import { GameItem } from './types';

export const gameStatuses = {
  clean: { className: 'row-done', label: 'Converted — no Imgur links', color: '#e6ffed' },
  temporary: { className: 'row-temporary', label: 'Temporary proxy fix', color: '#fff0cc' },
  partial: { className: 'row-partial', label: 'Converted — Imgur links remain', color: '#e6ccff' },
  needed: { className: 'row-needs-convert', label: 'Needs conversion', color: '#ffe6e6' },
  none: { className: 'row-no-imgur', label: 'No Imgur links to convert', color: '#f4f4f4' },
  update: { className: 'row-update', label: 'Update available', color: '#e6f2ff' },
  queued: { className: 'row-queued', label: 'Queued', color: '#ffebcc' },
  active: { className: 'row-converting', label: 'Converting', color: '#e6f7ff' },
  incomplete: { className: 'row-incomplete', label: 'Incomplete', color: '#fff5cc' },
  error: { className: 'row-error', label: 'Conversion failed', color: '#ffcccc' }
};

export function getGameStatus(item: GameItem) {
  if (item.convertState === 'Error') return gameStatuses.error;
  if (item.convertState === 'Queued...') return gameStatuses.queued;
  if (item.convertState === 'Converting...') return gameStatuses.active;
  if (item.convertState === 'Incomplete') return gameStatuses.incomplete;
  if (item.hasUpdate || item.convertState === 'Update Available') return gameStatuses.update;
  if (item.temporaryFix) return gameStatuses.temporary;
  if (item.isConverted || item.convertState === 'Done') return item.hasImgur || item.imgurCount > 0 ? gameStatuses.partial : gameStatuses.clean;
  if (item.convertState === 'Already Converted') return gameStatuses.partial;
  return item.hasImgur ? gameStatuses.needed : gameStatuses.none;
}
