import { recordServiceResult } from './serviceStatusService';
import { ServiceStatus } from '../types';
import { ImageBackend } from './backends/ImageBackend';

type BackendCallbacks = {
  log: (message: string, type: 'info' | 'warning') => void;
  onProvider: (provider: ImageBackend) => void;
  onServiceStatus?: (status: ServiceStatus) => void;
  isCancelled: () => boolean;
};

export class BackendSession {
  private providerIndex = 0;
  private readonly resolvers = new Map<ImageBackend, (link: string) => Promise<string>>();
  private readonly verifiedProviders = new Set<ImageBackend>();

  constructor(private readonly providers: readonly ImageBackend[], private readonly callbacks: BackendCallbacks) {
    if (!providers.length) throw new Error('No image backends configured');
  }

  get delayBetweenLinksMs(): number {
    return this.providers[this.providerIndex]?.delayBetweenLinksMs || 0;
  }

  private checkCancelled() {
    if (this.callbacks.isCancelled()) throw new Error('Cancelled by user');
  }

  async resolve(link: string): Promise<string> {
    const failures: string[] = [];
    while (this.providerIndex < this.providers.length) {
      this.checkCancelled();
      const provider = this.providers[this.providerIndex];
      let resolve = this.resolvers.get(provider);
      if (!resolve) {
        resolve = provider.createResolver();
        this.resolvers.set(provider, resolve);
      }
      this.callbacks.onProvider(provider);
      this.callbacks.log(`Using ${provider.name} for ${link}`, 'info');
      for (let attempt = 1; attempt <= provider.maxAttempts; attempt++) {
        this.checkCancelled();
        try {
          const result = await resolve(link);
          this.checkCancelled();
          const firstResult = !this.verifiedProviders.has(provider);
          if (!provider.temporary || firstResult) {
            this.callbacks.onServiceStatus?.(recordServiceResult(provider.id));
          }
          this.verifiedProviders.add(provider);
          this.callbacks.log(`Resolved ${link} using ${provider.name}`, 'info');
          if (provider.temporary && firstResult) {
            this.callbacks.log(`Temporary fix applied using ${provider.name}. This link still depends on Imgur and the proxy. Convert again with a permanent backend when uploads are available for a rehosted copy.`, 'warning');
          }
          return result;
        } catch (error) {
          this.checkCancelled();
          const statusResult = recordServiceResult(provider.id, error);
          this.callbacks.onServiceStatus?.(statusResult);
          const message = error instanceof Error ? error.message : String(error);
          const status = message.match(/HTTP\s+(\d{3})/i)?.[1];
          const permanent = status && /^4/.test(status) && !['408', '429'].includes(status);
          const retry = !permanent && attempt < provider.maxAttempts;
          this.callbacks.log(`${provider.name} attempt ${attempt}/${provider.maxAttempts} failed for ${link}: ${message}${retry ? '. Retrying...' : ''}`, 'warning');
          if (!retry) {
            failures.push(`${provider.name}: ${message}`);
            break;
          }
          await new Promise(resolve => setTimeout(resolve, 2000));
        }
      }
      this.providerIndex++;
      const next = this.providers[this.providerIndex];
      if (next) this.callbacks.log(`Switching backend to ${next.name}`, 'warning');
    }
    throw new Error(`All configured image backends failed for ${link}. ${failures.join('; ')}`);
  }
}
