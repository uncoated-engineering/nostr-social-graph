import { useQuery } from '@tanstack/react-query';
import { useNostr } from '@nostrify/react';

export interface GraphNode {
  id: string; // pubkey
  name?: string;
  val: number; // size/importance of node
  inDegree: number; // number of incoming connections (followers)
  outDegree: number; // number of outgoing connections (following)
  isHub: boolean; // true if this is a major hub (high degree)
  cluster?: number; // cluster/community identifier
  degreesFromRoot?: number; // degrees of separation from the starting user
}

export interface GraphLink {
  source: string; // pubkey of follower
  target: string; // pubkey being followed
  isBidirectional: boolean; // true if both users follow each other
}

export interface GraphData {
  nodes: GraphNode[];
  links: GraphLink[];
  stats: {
    totalNodes: number;
    totalLinks: number;
    hubs: number;
    bidirectionalLinks: number;
    clusters: number;
  };
}

interface WebOfTrustOptions {
  startPubkey?: string; // If provided, start from this user, otherwise get all
  depth?: number; // How many levels deep to traverse (1 = direct follows, 2 = follows of follows, etc.)
  limit?: number; // Max events to fetch per query
  relayUrls?: string[]; // Custom relay URLs to query
  referenceUser?: string; // User to calculate degrees of separation from (for distance metrics)
}

/**
 * Fetches the web of trust graph from Nostr
 * Kind 3 events contain contact/follow lists
 */
export function useWebOfTrust(options: WebOfTrustOptions = {}) {
  const { nostr } = useNostr();
  const { startPubkey, depth = 2, limit = 100, relayUrls, referenceUser } = options;

  return useQuery({
    queryKey: ['web-of-trust', startPubkey, depth, limit, relayUrls, referenceUser],
    queryFn: async (c) => {
      const signal = AbortSignal.any([c.signal, AbortSignal.timeout(15000)]);

      // Use custom relays if provided, otherwise use default nostr pool
      const queryClient = relayUrls && relayUrls.length > 0
        ? nostr.group(relayUrls)
        : nostr;

      const nodesMap = new Map<string, GraphNode>();
      const linksMap = new Map<string, GraphLink>();

      // Track which pubkeys we've already processed to avoid infinite loops
      const processed = new Set<string>();
      const toProcess: Array<{ pubkey: string; level: number }> = [];

      // Initialize starting point
      if (startPubkey) {
        toProcess.push({ pubkey: startPubkey, level: 0 });
        nodesMap.set(startPubkey, {
          id: startPubkey,
          val: 10,
          inDegree: 0,
          outDegree: 0,
          isHub: false
        });
      }

      // If no starting pubkey, fetch recent kind 3 events from the relay
      if (!startPubkey) {
        const recentEvents = await queryClient.query(
          [{ kinds: [3], limit }],
          { signal }
        );

        // Add all authors as starting nodes
        recentEvents.forEach((event) => {
          if (!processed.has(event.pubkey)) {
            toProcess.push({ pubkey: event.pubkey, level: 0 });
            nodesMap.set(event.pubkey, {
              id: event.pubkey,
              val: 5,
              inDegree: 0,
              outDegree: 0,
              isHub: false
            });
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
        const events = await queryClient.query(
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
            if (!linksMap.has(linkId)) {
              linksMap.set(linkId, {
                source: event.pubkey,
                target: followedPubkey,
                isBidirectional: false,
              });
            }

            // Add followed user as a node if not already present
            if (!nodesMap.has(followedPubkey)) {
              nodesMap.set(followedPubkey, {
                id: followedPubkey,
                val: 3,
                inDegree: 0,
                outDegree: 0,
                isHub: false,
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

      // Calculate degree centrality and detect bidirectional follows
      const links = Array.from(linksMap.values());

      // Build reverse index for quick bidirectional lookup
      const reverseLinks = new Map<string, Set<string>>();
      links.forEach(link => {
        if (!reverseLinks.has(link.target)) {
          reverseLinks.set(link.target, new Set());
        }
        reverseLinks.get(link.target)!.add(link.source);
      });

      // Update link bidirectionality and calculate degrees
      links.forEach(link => {
        const node = nodesMap.get(link.source);
        if (node) {
          node.outDegree++;
        }

        const targetNode = nodesMap.get(link.target);
        if (targetNode) {
          targetNode.inDegree++;
        }

        // Check if bidirectional
        const reverseLinkId = `${link.target}->${link.source}`;
        if (linksMap.has(reverseLinkId)) {
          link.isBidirectional = true;
          linksMap.get(reverseLinkId)!.isBidirectional = true;
        }
      });

      // Detect hubs (nodes with high degree centrality)
      const nodes = Array.from(nodesMap.values());
      const avgDegree = nodes.reduce((sum, n) => sum + n.inDegree + n.outDegree, 0) / nodes.length;
      const hubThreshold = avgDegree * 2; // Nodes with 2x average degree are hubs

      nodes.forEach(node => {
        const totalDegree = node.inDegree + node.outDegree;
        node.isHub = totalDegree >= hubThreshold && totalDegree >= 10; // At least 10 connections

        // Adjust visual size based on degree
        if (node.isHub) {
          node.val = Math.max(node.val, 15 + Math.min(totalDegree / 5, 15));
        } else {
          node.val = Math.max(node.val, 3 + Math.min(totalDegree / 2, 7));
        }
      });

      // Simple clustering: assign cluster based on who they're connected to
      // This is a simplified community detection (not full Louvain/Leiden)
      assignClusters(nodes, links);

      // Calculate degrees of separation from reference user (if provided)
      if (referenceUser) {
        calculateDegreesOfSeparation(nodes, links, referenceUser);
      }

      // Calculate statistics
      const stats = {
        totalNodes: nodes.length,
        totalLinks: links.length,
        hubs: nodes.filter(n => n.isHub).length,
        bidirectionalLinks: links.filter(l => l.isBidirectional).length,
        clusters: new Set(nodes.map(n => n.cluster).filter(c => c !== undefined)).size,
      };

      const graphData: GraphData = {
        nodes,
        links,
        stats,
      };

      return graphData;
    },
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
}

/**
 * Simple clustering algorithm based on shared connections
 * Assigns nodes to clusters based on their neighbors
 */
function assignClusters(nodes: GraphNode[], links: GraphLink[]): void {
  // Build adjacency list
  const adjacency = new Map<string, Set<string>>();
  nodes.forEach(node => {
    adjacency.set(node.id, new Set());
  });

  links.forEach(link => {
    adjacency.get(link.source)?.add(link.target);
    adjacency.get(link.target)?.add(link.source); // Treat as undirected for clustering
  });

  // Simple label propagation-style clustering
  let clusterId = 0;
  const visited = new Set<string>();

  nodes.forEach(node => {
    if (!visited.has(node.id)) {
      // Start a new cluster
      const queue = [node.id];
      visited.add(node.id);
      node.cluster = clusterId;

      // BFS to find connected component (limited depth for performance)
      let depth = 0;
      const maxDepth = 2;

      while (queue.length > 0 && depth < maxDepth) {
        const batchSize = queue.length;
        for (let i = 0; i < batchSize; i++) {
          const currentId = queue.shift()!;
          const neighbors = adjacency.get(currentId) || new Set();

          neighbors.forEach(neighborId => {
            const neighborNode = nodes.find(n => n.id === neighborId);
            if (neighborNode && !visited.has(neighborId)) {
              visited.add(neighborId);
              neighborNode.cluster = clusterId;
              queue.push(neighborId);
            }
          });
        }
        depth++;
      }

      clusterId++;
    }
  });
}

/**
 * Calculate degrees of separation (shortest path) from a reference user
 * Uses BFS to find the shortest path from the reference user to all other nodes
 */
function calculateDegreesOfSeparation(
  nodes: GraphNode[],
  links: GraphLink[],
  referenceUser: string
): void {
  // Build adjacency list (treat as undirected for distance calculation)
  const adjacency = new Map<string, Set<string>>();
  nodes.forEach(node => {
    adjacency.set(node.id, new Set());
  });

  links.forEach(link => {
    adjacency.get(link.source)?.add(link.target);
    adjacency.get(link.target)?.add(link.source);
  });

  // BFS from reference user
  const distances = new Map<string, number>();
  const queue: Array<{ id: string; distance: number }> = [{ id: referenceUser, distance: 0 }];
  distances.set(referenceUser, 0);

  while (queue.length > 0) {
    const current = queue.shift()!;
    const neighbors = adjacency.get(current.id) || new Set();

    neighbors.forEach(neighborId => {
      if (!distances.has(neighborId)) {
        const newDistance = current.distance + 1;
        distances.set(neighborId, newDistance);
        queue.push({ id: neighborId, distance: newDistance });
      }
    });
  }

  // Assign distances to nodes
  nodes.forEach(node => {
    node.degreesFromRoot = distances.get(node.id);
  });
}
