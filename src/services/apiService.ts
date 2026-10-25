import { Catbox } from 'node-catbox';

export interface UploadProvider {
  id: string;
  name: string;
  requiresLocalDownload: boolean;
  uploadUrl(link: string): Promise<string>;
}

export class CatboxUrlProvider implements UploadProvider {
  id = 'catbox-url-upload';
  name = 'Catbox.moe (URL Upload)';
  requiresLocalDownload = false;
  private readonly client = new Catbox(undefined, {
    requestTimeoutMs: 15000,
    retryTransientErrors: false
  });

  async uploadUrl(link: string): Promise<string> {
    return this.client.uploadURL({ url: link });
  }
}


export const uploadProviders: Record<string, UploadProvider> = {
  'catbox-url-upload': new CatboxUrlProvider()
};

export async function checkImgurConnectivity() {
  try {
    const res = await fetch('https://imgur.com', { method: 'GET', redirect: 'follow' });
    const text = await res.text();
    const lowerText = text.toLowerCase();
    
    if (lowerText.includes('imgur is temporarily over capacity')) return { status: 'capacity' };
    if (lowerText.includes('content not available') || lowerText.includes('conent not available')) return { status: 'blocked' };
    if (res.ok) return { status: 'connected' };
    
    return { status: 'error' };
  } catch (e) {
    return { status: 'error' };
  }
}
