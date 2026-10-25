import { BackendHealth } from './ImageBackend';

export async function inspectEndpoint(url: string, expectImage: boolean): Promise<BackendHealth> {
  const response = await fetch(url, { method: 'GET', signal: AbortSignal.timeout(8000) });
  try {
    const body = expectImage ? '' : (await response.text()).slice(0, 1000);
    if (!response.ok) throw new Error(`HTTP ${response.status} ${response.statusText}${body ? `: ${body}` : ''}`);
    if (expectImage && !response.headers.get('content-type')?.toLowerCase().startsWith('image/')) {
      throw new Error('Test image did not return an image response');
    }
    return { state: expectImage ? 'available' : 'reachable',
      detail: expectImage ? 'Test image is reachable; individual images may differ' : body };
  } finally {
    if (!response.bodyUsed) await response.body?.cancel();
  }
}
