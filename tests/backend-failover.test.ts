import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { BackendSession } from '../src/services/backendService';
import { getBackendProviders } from '../src/services/backends/registry';

const source = 'https://i.imgur.com/kHKX2E4.jpeg';
const catboxApi = 'https://catbox.moe/user/api.php';
const imageResponse = () => new Response('image', { headers: { 'content-type': 'image/png' } });

function createSession(backendId = 'auto') {
  const callbacks = { log: vi.fn(), onProvider: vi.fn(), isCancelled: () => false };
  return { session: new BackendSession(getBackendProviders(backendId), callbacks), callbacks };
}

beforeEach(() => vi.useFakeTimers());
afterEach(() => vi.useRealTimers());

describe('backend failover on bad hosts', () => {
  it('skips Catbox retries after HTTP 412 and reuses the working fallback', async () => {
    const fetch = vi.fn(async (url: string) => url === catboxApi
      ? new Response('Uploads paused until I can resolve storage issues. Sorry!', { status: 412 })
      : imageResponse());
    vi.stubGlobal('fetch', fetch);
    const { session, callbacks } = createSession();

    expect(await session.resolve(source)).toBe('https://imgur.kageurufu.net/kHKX2E4.jpeg');
    expect(await session.resolve('https://i.imgur.com/next.png')).toBe('https://imgur.kageurufu.net/next.png');
    expect(fetch.mock.calls.filter(([url]) => url === catboxApi)).toHaveLength(1);
    expect(fetch).toHaveBeenCalledTimes(2);
    expect(session.delayBetweenLinksMs).toBe(0);
    const nextGame = createSession();
    await nextGame.session.resolve(source);
    expect(fetch).toHaveBeenCalledTimes(4);
    expect(callbacks.onProvider.mock.calls.map(([backend]) => backend.id))
      .toEqual(['catbox-url-upload', 'kageurufu-proxy', 'kageurufu-proxy']);
    expect(callbacks.log).toHaveBeenCalledWith(expect.stringContaining('Uploads paused'), 'warning');
    expect(callbacks.log).toHaveBeenCalledWith(expect.stringContaining('Temporary fix applied'), 'warning');
  });

  it.each(['DNS error', 'HTTP 503', 'timeout'])('fails over after exhausting retries for a %s', async failure => {
    const fetch = vi.fn(async (url: string, options: RequestInit) => {
      if (url !== catboxApi) return imageResponse();
      if (failure === 'DNS error') throw new TypeError('getaddrinfo ENOTFOUND catbox.moe');
      if (failure === 'HTTP 503') return new Response('Service unavailable', { status: 503 });
      return new Promise<Response>((_resolve, reject) => {
        options.signal!.addEventListener('abort', () => reject(new DOMException('Aborted', 'AbortError')), { once: true });
      });
    });
    vi.stubGlobal('fetch', fetch);
    const { session } = createSession();

    const result = expect(session.resolve(source)).resolves.toBe('https://imgur.kageurufu.net/kHKX2E4.jpeg');
    await vi.runAllTimersAsync();
    await result;
    expect(fetch.mock.calls.filter(([url]) => url === catboxApi)).toHaveLength(5);
    expect(fetch).toHaveBeenCalledTimes(6);
  });

  it('falls through a bad proxy response to DuckDuckGo', async () => {
    const fetch = vi.fn(async (url: string) => {
      if (url === catboxApi) return new Response('Uploads paused', { status: 412 });
      if (url.startsWith('https://imgur.kageurufu.net/')) {
        return new Response('<html>Host unavailable</html>', { headers: { 'content-type': 'text/html' } });
      }
      return imageResponse();
    });
    vi.stubGlobal('fetch', fetch);
    const { session, callbacks } = createSession();

    const result = new URL(await session.resolve(source));
    expect(result.hostname).toBe('external-content.duckduckgo.com');
    expect(result.searchParams.get('u')).toBe(source);
    const next = new URL(await session.resolve('https://i.imgur.com/next.png'));
    expect(next.searchParams.get('u')).toBe('https://i.imgur.com/next.png');
    expect(fetch).toHaveBeenCalledTimes(3);
    expect(callbacks.onProvider.mock.calls.map(([backend]) => backend.id))
      .toEqual(['catbox-url-upload', 'kageurufu-proxy', 'duckduckgo-proxy', 'duckduckgo-proxy']);
  });

  it('rejects with the host failures when every backend fails', async () => {
    const fetch = vi.fn(async (url: string) => url === catboxApi
      ? new Response('Uploads paused', { status: 412 })
      : new Response('Bad gateway', { status: 502 }));
    vi.stubGlobal('fetch', fetch);
    const { session } = createSession();

    await expect(session.resolve(source)).rejects.toThrow(
      /All configured image backends failed.*Catbox.*HTTP 412.*kageurufu.*HTTP 502.*DuckDuckGo.*HTTP 502/
    );
    expect(fetch).toHaveBeenCalledTimes(3);
  });

  it('does not use other hosts when a single backend was explicitly selected', async () => {
    const fetch = vi.fn(async () => new Response('Uploads paused', { status: 412 }));
    vi.stubGlobal('fetch', fetch);
    const { session } = createSession('catbox-url-upload');

    await expect(session.resolve(source)).rejects.toThrow('All configured image backends failed');
    expect(fetch).toHaveBeenCalledTimes(1);
  });
});
