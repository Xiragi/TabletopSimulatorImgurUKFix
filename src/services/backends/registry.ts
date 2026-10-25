import { ImageBackend } from './ImageBackend';
import { CatboxBackend } from './permanent/CatboxBackend';
import { PermanentHostBackend } from './permanent/PermanentHostBackend';
import { DuckDuckGoBackend } from './temporary/DuckDuckGoBackend';
import { KageurufuBackend } from './temporary/KageurufuBackend';
import { TemporaryProxyBackend } from './temporary/TemporaryProxyBackend';

export const permanentBackends: readonly PermanentHostBackend[] = [new CatboxBackend()];
export const temporaryBackends: readonly TemporaryProxyBackend[] = [new KageurufuBackend(), new DuckDuckGoBackend()];
export const backends: readonly ImageBackend[] = [...permanentBackends, ...temporaryBackends];
export const backendById: Readonly<Record<string, ImageBackend>> = Object.fromEntries(backends.map(backend => [backend.id, backend]));
export const defaultBackendId = 'auto';

export function getBackendProviders(backendId: string): readonly ImageBackend[] {
  if (backendId === defaultBackendId) return backends;
  if (!Object.prototype.hasOwnProperty.call(backendById, backendId)) throw new Error(`Unknown image backend: ${backendId}`);
  return [backendById[backendId]];
}

export function isTemporaryFixUrl(link: string): boolean {
  try {
    const url = new URL(link);
    return temporaryBackends.some(backend => backend.ownsUrl(url));
  } catch {
    return false;
  }
}

export function containsTemporaryFix(content: string): boolean {
  return (content.match(/https?:\/\/[^"\s\\]+/g) || []).some(isTemporaryFixUrl);
}

export function getBackendInfo() {
  return {
    id: defaultBackendId,
    name: 'Automatic (recommended)',
    permanentBackend: permanentBackends[0] ? { id: permanentBackends[0].id, shortName: permanentBackends[0].shortName } : null,
    requiresLocalDownload: backends.some(backend => backend.requiresLocalDownload),
    providers: backends.map(({ id, name, shortName, kind, requiresLocalDownload }) =>
      ({ id, name, shortName, kind, requiresLocalDownload }))
  };
}
