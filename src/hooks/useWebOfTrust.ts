import { useQuery } from '@tanstack/react-query';
import { useNostr } from '@nostrify/react';

export interface GraphNode {
  id: string; // pubkey
  name?: string;
  val: number; // size/importance of node
}

export interface GraphLink {
  source: string; // pubkey of follower
  target: string; // pubkey being followed
}

export interface GraphData {
  nodes: GraphNode[];
  links: GraphLink[];
}

interface WebOfTrustOptions {
  startPubkey?: string; // If provided, start from this user, otherwise get all
  depth?: number; // How many levels deep to traverse (1 = direct follows, 2 = follows of follows, etc.)
  limit?: number; // Max events to fetch per query
}

/**
 * Fetches the web of trust graph from Nostr
 * Kind 3 events contain contact/follow lists
 */
export function useWebOfTrust(options: WebOfTrustOptions = {}) {
  const { nostr } = useNostr();
  const { startPubkey, depth = 2, limit = 100 } = options;

  return useQuery({
    queryKey: ['web-of-trust', startPubkey, depth, limit],
    queryFn: async (c) => {
      const signal = AbortSignal.any([c.signal, AbortSignal.timeout(10000)]);

      const nodesMap = new Map<string, GraphNode>();
      const linksSet = new Set<string>(); // Use set to avoid duplicates
      const links: GraphLink[] = [];

      // Track which pubkeys we've already processed to avoid infinite loops
      const processed = new Set<string>();
      const toProcess: Array<{ pubkey: string; level: number }> = [];

      // Initialize starting point
      if (startPubkey) {
        toProcess.push({ pubkey: startPubkey, level: 0 });
        nodesMap.set(startPubkey, { id: startPubkey, val: 10 });
      }

      // If no starting pubkey, fetch recent kind 3 events from the relay
      if (!startPubkey) {
        const recentEvents = await nostr.query(
          [{ kinds: [3], limit }],
          { signal }
        );

        // Add all authors as starting nodes
        recentEvents.forEach((event) => {
          if (!processed.has(event.pubkey)) {
            toProcess.push({ pubkey: event.pubkey, level: 0 });
            nodesMap.set(event.pubkey, { id: event.pubkey, val: 5 });
          }
        });
      }

      // Process nodes level by level
      while (toProcess.length > 0) {
        const batch = toProcess.splice(0, 50); // Process in batches
        const pubkeys = batch.map((b) => b.pubkey);
        const currentLevel = batch[0]?.level ?? 0;

        // Skip if we've exceeded depth
        if (currentLevel >= depth) {
          batch.forEach((b) => processed.add(b.pubkey));
          continue;
        }

        // Fetch kind 3 events for this batch
        const events = await nostr.query(
          [{ kinds: [3], authors: pubkeys, limit: 1 }], // Only get most recent per author
          { signal }
        );

        // Process each event
        for (const event of events) {
          processed.add(event.pubkey);

          // Parse the p tags (people being followed)
          const followedPubkeys = event.tags
            .filter(([tag]) => tag === 'p')
            .map(([_, pubkey]) => pubkey);

          // Add links and nodes
          for (const followedPubkey of followedPubkeys) {
            // Create link
            const linkId = `${event.pubkey}->${followedPubkey}`;
            if (!linksSet.has(linkId)) {
              linksSet.add(linkId);
              links.push({
                source: event.pubkey,
                target: followedPubkey,
              });
            }

            // Add followed user as a node if not already present
            if (!nodesMap.has(followedPubkey)) {
              nodesMap.set(followedPubkey, {
                id: followedPubkey,
                val: 3,
              });

              // Queue for next level if within depth
              if (currentLevel + 1 < depth && !processed.has(followedPubkey)) {
                toProcess.push({ pubkey: followedPubkey, level: currentLevel + 1 });
              }
            } else {
              // Increase node importance if already exists
              const node = nodesMap.get(followedPubkey)!;
              node.val = Math.min(node.val + 1, 20); // Cap at 20
            }
          }
        }
      }

      const graphData: GraphData = {
        nodes: Array.from(nodesMap.values()),
        links,
      };

      return graphData;
    },
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
}
