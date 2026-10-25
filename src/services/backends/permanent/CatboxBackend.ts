import { Catbox } from 'node-catbox';
import { BackendHealth } from '../ImageBackend';
import { inspectEndpoint } from '../http';
import { PermanentHostBackend } from './PermanentHostBackend';

export class CatboxBackend extends PermanentHostBackend {
  readonly id = 'catbox-url-upload';
  readonly name = 'Catbox.moe (URL Upload)';
  readonly shortName = 'Catbox';
  private readonly client = new Catbox(undefined, {
    requestTimeoutMs: 15000,
    retryTransientErrors: false
  });

  async uploadUrl(link: string): Promise<string> {
    return this.client.uploadURL({ url: link });
  }

  ownsUrl(url: URL): boolean {
    return url.protocol === 'https:' && url.hostname === 'files.catbox.moe';
  }

  classifyFailure(error: unknown): BackendHealth {
    const result = super.classifyFailure(error);
    return /uploads? paused|storage issues/i.test(result.detail) ? { ...result, state: 'paused' } : result;
  }

  async checkHealth(): Promise<BackendHealth> {
    const result = await inspectEndpoint('https://catbox.moe/user/api.php', false);
    if (/uploads? paused|storage issues/i.test(result.detail)) return { ...result, state: 'paused' };
    return { state: 'reachable', detail: 'API reachable; uploads not tested by this check' };
  }
}
