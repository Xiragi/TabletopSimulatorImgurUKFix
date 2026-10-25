import { TemporaryProxyBackend } from './TemporaryProxyBackend';

export class DuckDuckGoBackend extends TemporaryProxyBackend {
  readonly id = 'duckduckgo-proxy';
  readonly name = 'DuckDuckGo (temporary fix)';
  readonly shortName = 'DuckDuckGo';
  protected readonly hostname = 'external-content.duckduckgo.com';

  protected buildUrl(source: URL): string {
    return `https://${this.hostname}/iu/?u=${encodeURIComponent(source.href)}&f=1`;
  }
}
