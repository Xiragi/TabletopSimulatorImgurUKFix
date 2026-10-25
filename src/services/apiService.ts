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
