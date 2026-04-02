import * as Linking from 'expo-linking';
import { ShareIntentData } from '../types';

/**
 * Parse URL for share intent data
 */
export function parseShareUrl(url: string): ShareIntentData | null {
  try {
    const parsed = Linking.parse(url);
    
    // Handle chronicle-mobile://share?text=...&url=...
    if (parsed.path === 'share' || parsed.path === '/share') {
      return {
        type: parsed.queryParams?.url ? 'url' : 'text',
        text: parsed.queryParams?.text as string | undefined,
        url: parsed.queryParams?.url as string | undefined,
      };
    }

    // Handle chronicle-mobile://image?uri=...
    if (parsed.path === 'image' || parsed.path === '/image') {
      return {
        type: 'image',
        uri: parsed.queryParams?.uri as string | undefined,
        mimeType: parsed.queryParams?.mimeType as string | undefined,
      };
    }

    return null;
  } catch (error) {
    console.error('Error parsing share URL:', error);
    return null;
  }
}

/**
 * Build a share URL for internal navigation
 */
export function buildShareUrl(data: ShareIntentData): string {
  const baseUrl = Linking.createURL('share');
  const params = new URLSearchParams();

  if (data.text) params.append('text', data.text);
  if (data.url) params.append('url', data.url);
  if (data.uri) params.append('uri', data.uri);
  if (data.mimeType) params.append('mimeType', data.mimeType);

  return `${baseUrl}?${params.toString()}`;
}

/**
 * Check if running from share extension context
 */
export function isShareExtensionContext(): boolean {
  // In a real implementation, this would check for share extension specific flags
  // For now, we check if there's shared content in the initial URL
  return false;
}

/**
 * Get shared content from the initial URL (if any)
 */
export async function getInitialShareContent(): Promise<ShareIntentData | null> {
  try {
    const initialUrl = await Linking.getInitialURL();
    if (initialUrl) {
      return parseShareUrl(initialUrl);
    }
    return null;
  } catch (error) {
    console.error('Error getting initial share content:', error);
    return null;
  }
}

/**
 * Subscribe to incoming share intents
 */
export function subscribeToShareIntents(
  callback: (data: ShareIntentData) => void
): () => void {
  const subscription = Linking.addEventListener('url', (event) => {
    const data = parseShareUrl(event.url);
    if (data) {
      callback(data);
    }
  });

  return () => subscription.remove();
}
