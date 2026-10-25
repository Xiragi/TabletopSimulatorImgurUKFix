import { TemporaryProxyBackend } from './TemporaryProxyBackend';

export class KageurufuBackend extends TemporaryProxyBackend {
  readonly id = 'kageurufu-proxy';
  readonly name = 'imgur.kageurufu.net (temporary fix)';
  readonly shortName = 'Kageurufu';
  protected readonly hostname = 'imgur.kageurufu.net';

  protected buildUrl(source: URL): string {
    return `https://${this.hostname}${source.pathname}${source.search}`;
  }
}
