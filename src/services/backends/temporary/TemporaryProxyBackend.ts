import { BackendHealth, ImageBackend } from '../ImageBackend';
import { inspectEndpoint } from '../http';

export abstract class TemporaryProxyBackend extends ImageBackend {
  readonly kind = 'temporary' as const;
  readonly maxAttempts: number = 1;
  protected abstract readonly hostname: string;
  protected readonly testImage = 'https://i.imgur.com/kHKX2E4.jpeg';

  protected abstract buildUrl(source: URL): string;

  get delayBetweenLinksMs(): number {
    return 0;
  }

  createResolver(): (link: string) => Promise<string> {
    let verified = false;
    return async link => {
      if (verified) return this.buildUrl(this.sourceUrl(link));
      const url = await this.resolveUrl(link);
      verified = true;
      return url;
    };
  }

  ownsUrl(url: URL): boolean {
    return url.protocol === 'https:' && url.hostname === this.hostname;
  }

  private sourceUrl(link: string): URL {
    const url = new URL(link);
    if (!['http:', 'https:'].includes(url.protocol) || !['imgur.com', 'i.imgur.com'].includes(url.hostname) ||
        !/^\/[a-zA-Z0-9]+(?:\.[a-zA-Z0-9]+)?$/.test(url.pathname)) {
      throw new Error(`Expected a direct Imgur image URL: ${link}`);
    }
    url.protocol = 'https:';
    url.hostname = 'i.imgur.com';
    return url;
  }

  async resolveUrl(link: string): Promise<string> {
    const url = this.buildUrl(this.sourceUrl(link));
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 15000);
    try {
      const response = await fetch(url, { signal: controller.signal });
      try {
        if (!response.ok) throw new Error(`HTTP ${response.status} ${response.statusText}`);
        const contentType = response.headers.get('content-type') || '';
        if (!contentType.toLowerCase().startsWith('image/')) {
          throw new Error(`Proxy returned ${contentType || 'no content type'} instead of an image`);
        }
        return url;
      } finally {
        await response.body?.cancel();
      }
    } finally {
      clearTimeout(timeout);
    }
  }

  checkHealth(): Promise<BackendHealth> {
    return inspectEndpoint(this.buildUrl(this.sourceUrl(this.testImage)), true);
  }
}
