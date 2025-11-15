import { useQuery } from '@tanstack/react-query';
import { useNostr } from '@nostrify/react';
import type { NostrEvent } from '@nostrify/nostrify';
import type { GraphData, GraphNode, GraphLink } from '@/lib/forceGraph';

interface SocialGraphOptions {
  rootPubkey?: string; // If provided, starts from this user
  depth?: number; // How many levels deep to traverse
  limit?: number; // Maximum number of nodes to fetch
  relayUrl?: string; // Specific relay to query (optional)
}

interface NostrProfile {
  pubkey: string;
  name?: string;
  picture?: string;
  display_name?: string;
}

// Parse kind 3 contact list event to extract followed pubkeys
function parseContactList(event: NostrEvent): string[] {
  return event.tags
    .filter(tag => tag[0] === 'p')
    .map(tag => tag[1])
    .filter(Boolean);
}

export function useSocialGraph(options: SocialGraphOptions = {}) {
  const { nostr } = useNostr();
  const { rootPubkey, depth = 2, limit = 100, relayUrl } = options;

  return useQuery({
    queryKey: ['social-graph', rootPubkey, depth, limit, relayUrl],
    queryFn: async (c) => {
      const signal = AbortSignal.any([c.signal, AbortSignal.timeout(10000)]);

      // Choose which nostr instance to use
      const nostrInstance = relayUrl ? nostr.relay(relayUrl) : nostr;

      // Fetch contact lists
      const filters = rootPubkey
        ? [{ kinds: [3], authors: [rootPubkey], limit: 1 }]
        : [{ kinds: [3], limit }];

      const contactEvents = await nostrInstance.query(filters, { signal });

      if (contactEvents.length === 0) {
        return {
          nodes: [],
          links: [],
          profiles: new Map<string, NostrProfile>(),
        };
      }

      // Build a map of pubkey -> followed pubkeys
      const followMap = new Map<string, string[]>();
      const allPubkeys = new Set<string>();

      for (const event of contactEvents) {
        const followed = parseContactList(event);
        followMap.set(event.pubkey, followed);
        allPubkeys.add(event.pubkey);
        followed.forEach(pk => allPubkeys.add(pk));
      }

      // If we have a root pubkey, do breadth-first traversal
      if (rootPubkey && depth > 1) {
        const visited = new Set<string>([rootPubkey]);
        let currentLevel = [rootPubkey];

        for (let level = 1; level < depth && currentLevel.length > 0; level++) {
          const nextLevel: string[] = [];

          // Get contact lists for current level
          const levelFilters = [{ kinds: [3], authors: currentLevel }];
          const levelEvents = await nostrInstance.query(levelFilters, { signal });

          for (const event of levelEvents) {
            const followed = parseContactList(event);
            followMap.set(event.pubkey, followed);

            for (const pk of followed) {
              if (!visited.has(pk) && allPubkeys.size < limit) {
                visited.add(pk);
                nextLevel.push(pk);
                allPubkeys.add(pk);
              }
            }
          }

          currentLevel = nextLevel;
        }
      }

      // Fetch profiles for all pubkeys (kind 0 metadata)
      const pubkeyArray = Array.from(allPubkeys).slice(0, limit);
      const profileEvents = await nostrInstance.query(
        [{ kinds: [0], authors: pubkeyArray }],
        { signal }
      );

      // Build profile map (keep only the latest event per pubkey)
      const profileMap = new Map<string, NostrProfile>();
      const latestProfileEvents = new Map<string, NostrEvent>();

      for (const event of profileEvents) {
        const existing = latestProfileEvents.get(event.pubkey);
        if (!existing || event.created_at > existing.created_at) {
          latestProfileEvents.set(event.pubkey, event);
        }
      }

      for (const [pubkey, event] of latestProfileEvents) {
        try {
          const metadata = JSON.parse(event.content);
          profileMap.set(pubkey, {
            pubkey,
            name: metadata.name,
            picture: metadata.picture,
            display_name: metadata.display_name,
          });
        } catch {
          // Invalid JSON, use pubkey only
          profileMap.set(pubkey, { pubkey });
        }
      }

      // Ensure all pubkeys have a profile entry
      for (const pubkey of pubkeyArray) {
        if (!profileMap.has(pubkey)) {
          profileMap.set(pubkey, { pubkey });
        }
      }

      // Build graph data
      const nodes: GraphNode[] = [];
      const links: GraphLink[] = [];

      // Create nodes
      for (const pubkey of pubkeyArray) {
        const profile = profileMap.get(pubkey);
        const isRoot = pubkey === rootPubkey;

        nodes.push({
          id: pubkey,
          label: profile?.display_name || profile?.name || pubkey.slice(0, 8),
          avatar: profile?.picture,
          x: 0,
          y: 0,
          vx: 0,
          vy: 0,
          radius: isRoot ? 20 : 12,
          color: isRoot ? '#8b5cf6' : '#3b82f6',
          isRoot,
        });
      }

      // Create links based on follow relationships
      for (const [source, targets] of followMap) {
        if (!pubkeyArray.includes(source)) continue;

        for (const target of targets) {
          if (pubkeyArray.includes(target)) {
            links.push({ source, target });
          }
        }
      }

      const graphData: GraphData = { nodes, links };

      return {
        ...graphData,
        profiles: profileMap,
      };
    },
    staleTime: 1000 * 60 * 5, // 5 minutes
    enabled: true,
  });
}
