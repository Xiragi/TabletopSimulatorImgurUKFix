import { ImageBackend } from '../ImageBackend';

export abstract class PermanentHostBackend extends ImageBackend {
  readonly kind = 'permanent' as const;
  readonly maxAttempts: number = 5;

  abstract uploadUrl(link: string): Promise<string>;

  resolveUrl(link: string): Promise<string> {
    return this.uploadUrl(link);
  }
}
