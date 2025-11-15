import { useCallback } from 'react';
import { nip19 } from 'nostr-tools';
import { useNostr } from '@nostrify/react';

interface UserSearchResult {
  pubkey: string;
  username?: string;
  found: boolean;
}

/**
 * Hook to search for a user by npub, pubkey, or username
 * Returns the pubkey if found
 */
export function useUserSearch() {
  const { nostr } = useNostr();

  const searchUser = useCallback(async (query: string): Promise<UserSearchResult> => {
    const trimmed = query.trim();
    if (!trimmed) {
      return { pubkey: '', found: false };
    }

    // Try to decode as npub first
    if (trimmed.startsWith('npub1')) {
      try {
        const decoded = nip19.decode(trimmed);
        if (decoded.type === 'npub') {
          return { pubkey: decoded.data, found: true };
        }
      } catch {
        // Not a valid npub, continue
      }
    }

    // Check if it's a hex pubkey (64 characters, hex)
    if (/^[0-9a-f]{64}$/i.test(trimmed)) {
      return { pubkey: trimmed.toLowerCase(), found: true };
    }

    // Otherwise, search by username (NIP-05 or name/display_name in kind 0)
    // This requires querying relays for kind 0 events
    try {
      const signal = AbortSignal.timeout(5000);

      // Search for kind 0 events matching the username
      // Note: This is a simple search - for better results, you'd need a search relay
      const events = await nostr.query(
        [{ kinds: [0], limit: 100 }],
        { signal }
      );

      // Filter events by matching username
      const queryLower = trimmed.toLowerCase();
      for (const event of events) {
        try {
          const metadata = JSON.parse(event.content);
          const displayName = metadata.display_name?.toLowerCase();
          const name = metadata.name?.toLowerCase();
          const nip05 = metadata.nip05?.toLowerCase();

          if (
            displayName === queryLower ||
            name === queryLower ||
            nip05 === queryLower ||
            displayName?.includes(queryLower) ||
            name?.includes(queryLower)
          ) {
            return {
              pubkey: event.pubkey,
              username: metadata.display_name || metadata.name,
              found: true,
            };
          }
        } catch {
          // Invalid JSON, skip
        }
      }
    } catch (error) {
      console.error('User search error:', error);
    }

    return { pubkey: '', found: false };
  }, [nostr]);

  return { searchUser };
}
