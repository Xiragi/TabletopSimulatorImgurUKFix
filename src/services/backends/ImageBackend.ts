import { ServiceStatus } from '../../types';

export type BackendKind = 'permanent' | 'temporary';
export type BackendHealth = Pick<ServiceStatus, 'state' | 'detail'>;

export abstract class ImageBackend {
  abstract readonly id: string;
  abstract readonly name: string;
  abstract readonly shortName: string;
  abstract readonly kind: BackendKind;
  abstract readonly maxAttempts: number;
  readonly requiresLocalDownload: boolean = false;

  get temporary(): boolean {
    return this.kind === 'temporary';
  }

  get delayBetweenLinksMs(): number {
    return 500;
  }

  createResolver(): (link: string) => Promise<string> {
    return link => this.resolveUrl(link);
  }

  abstract resolveUrl(link: string): Promise<string>;
  abstract ownsUrl(url: URL): boolean;
  abstract checkHealth(): Promise<BackendHealth>;

  classifyFailure(error: unknown): BackendHealth {
    return { state: 'unavailable', detail: error instanceof Error ? error.message : String(error) };
  }
}
