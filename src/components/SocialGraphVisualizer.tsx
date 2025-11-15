import { useCallback, useEffect, useRef, useState } from 'react';
import ForceGraph2D from 'react-force-graph-2d';
import type { ForceGraphMethods, NodeObject } from 'react-force-graph-2d';
import { useWebOfTrust } from '@/hooks/useWebOfTrust';
import { useCurrentUser } from '@/hooks/useCurrentUser';
import { useAuthor } from '@/hooks/useAuthor';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Slider } from '@/components/ui/slider';
import { Label } from '@/components/ui/label';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import { LoginArea } from '@/components/auth/LoginArea';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { genUserName } from '@/lib/genUserName';
import type { NostrMetadata } from '@nostrify/nostrify';

interface ExtendedNodeObject extends NodeObject {
  id: string;
  val?: number;
}

export function SocialGraphVisualizer() {
  const { user } = useCurrentUser();
  const [depth, setDepth] = useState(2);
  const [hoveredNode, setHoveredNode] = useState<string | null>(null);
  const [selectedNode, setSelectedNode] = useState<string | null>(null);
  const graphRef = useRef<ForceGraphMethods>();

  // Fetch web of trust data
  const { data: graphData, isLoading, error } = useWebOfTrust({
    startPubkey: user?.pubkey,
    depth,
    limit: 150,
  });

  // Get container dimensions
  const [dimensions, setDimensions] = useState({ width: 800, height: 600 });

  useEffect(() => {
    const updateDimensions = () => {
      const container = document.getElementById('graph-container');
      if (container) {
        setDimensions({
          width: container.clientWidth,
          height: Math.max(600, window.innerHeight - 300),
        });
      }
    };

    updateDimensions();
    window.addEventListener('resize', updateDimensions);
    return () => window.removeEventListener('resize', updateDimensions);
  }, []);

  // Handle node clicks
  const handleNodeClick = useCallback((node: NodeObject) => {
    const extNode = node as ExtendedNodeObject;
    setSelectedNode(extNode.id);
  }, []);

  // Handle node hover
  const handleNodeHover = useCallback((node: NodeObject | null) => {
    const extNode = node as ExtendedNodeObject | null;
    setHoveredNode(extNode?.id ?? null);
  }, []);

  // Draw nodes with different colors based on state
  const drawNode = useCallback(
    (node: NodeObject, ctx: CanvasRenderingContext2D) => {
      const extNode = node as ExtendedNodeObject;
      const size = Math.sqrt(extNode.val ?? 1) * 2;

      // Determine color
      let color = '#94a3b8'; // default gray

      if (extNode.id === user?.pubkey) {
        color = '#3b82f6'; // blue for current user
      } else if (extNode.id === selectedNode) {
        color = '#10b981'; // green for selected
      } else if (extNode.id === hoveredNode) {
        color = '#f59e0b'; // orange for hovered
      }

      // Draw circle
      ctx.beginPath();
      ctx.arc(extNode.x ?? 0, extNode.y ?? 0, size, 0, 2 * Math.PI);
      ctx.fillStyle = color;
      ctx.fill();

      // Draw border
      ctx.strokeStyle = '#1e293b';
      ctx.lineWidth = 0.5;
      ctx.stroke();
    },
    [user?.pubkey, selectedNode, hoveredNode]
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-2xl">Nostr Social Graph Visualizer</CardTitle>
              <CardDescription className="mt-2">
                Explore the decentralized web of trust on the Nostr network
              </CardDescription>
            </div>
            <LoginArea className="max-w-60" />
          </div>
        </CardHeader>
      </Card>

      {/* Info Card */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex items-center justify-between">
            <div className="space-y-1">
              <p className="text-sm text-muted-foreground">
                {user ? (
                  <>
                    Showing your web of trust starting from{' '}
                    <Badge variant="outline">{genUserName(user.pubkey).slice(0, 16)}...</Badge>
                  </>
                ) : (
                  'Showing recent users from the network'
                )}
              </p>
              {graphData && (
                <p className="text-xs text-muted-foreground">
                  {graphData.nodes.length} users, {graphData.links.length} connections
                </p>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Controls */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Controls</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label htmlFor="depth-slider">Network Depth: {depth}</Label>
              <span className="text-xs text-muted-foreground">
                {depth === 1 && 'Direct follows only'}
                {depth === 2 && 'Follows + their follows'}
                {depth === 3 && 'Three degrees of separation'}
              </span>
            </div>
            <Slider
              id="depth-slider"
              min={1}
              max={3}
              step={1}
              value={[depth]}
              onValueChange={([value]) => setDepth(value)}
              className="w-full"
            />
          </div>

          <div className="flex items-center gap-4 pt-2">
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full bg-blue-500"></div>
              <span className="text-xs text-muted-foreground">You</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full bg-green-500"></div>
              <span className="text-xs text-muted-foreground">Selected</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full bg-orange-500"></div>
              <span className="text-xs text-muted-foreground">Hovered</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full bg-slate-400"></div>
              <span className="text-xs text-muted-foreground">Others</span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Graph Container */}
      <Card>
        <CardContent className="p-0">
          <div id="graph-container" className="w-full relative bg-slate-950">
            {isLoading && (
              <div className="flex items-center justify-center h-[600px]">
                <div className="text-center space-y-4">
                  <Skeleton className="h-12 w-12 rounded-full mx-auto" />
                  <p className="text-sm text-muted-foreground">Loading social graph...</p>
                </div>
              </div>
            )}

            {error && (
              <div className="flex items-center justify-center h-[600px]">
                <Card className="border-destructive max-w-md">
                  <CardContent className="pt-6">
                    <p className="text-sm text-destructive">
                      Failed to load graph: {error.message}
                    </p>
                    <Button variant="outline" className="mt-4" onClick={() => window.location.reload()}>
                      Retry
                    </Button>
                  </CardContent>
                </Card>
              </div>
            )}

            {graphData && !isLoading && (
              <ForceGraph2D
                ref={graphRef}
                graphData={graphData}
                width={dimensions.width}
                height={dimensions.height}
                nodeRelSize={6}
                nodeCanvasObject={drawNode}
                onNodeClick={handleNodeClick}
                onNodeHover={handleNodeHover}
                linkColor={() => '#334155'}
                linkWidth={0.5}
                backgroundColor="#020617"
                cooldownTime={3000}
                enableNodeDrag={true}
                enableZoomInteraction={true}
                enablePanInteraction={true}
              />
            )}
          </div>
        </CardContent>
      </Card>

      {/* Selected Node Info */}
      {selectedNode && <NodeInfoCard pubkey={selectedNode} onClose={() => setSelectedNode(null)} />}
    </div>
  );
}

// Component to display information about a selected node
function NodeInfoCard({ pubkey, onClose }: { pubkey: string; onClose: () => void }) {
  const author = useAuthor(pubkey);
  const metadata: NostrMetadata | undefined = author.data?.metadata;

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg">Selected User</CardTitle>
          <Button variant="ghost" size="sm" onClick={onClose}>
            Close
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        {author.isLoading ? (
          <div className="space-y-2">
            <Skeleton className="h-16 w-16 rounded-full" />
            <Skeleton className="h-4 w-48" />
            <Skeleton className="h-3 w-32" />
          </div>
        ) : (
          <div className="flex items-start gap-4">
            <Avatar className="h-16 w-16">
              <AvatarImage src={metadata?.picture} alt={metadata?.name ?? 'User'} />
              <AvatarFallback>{(metadata?.name ?? genUserName(pubkey)).slice(0, 2).toUpperCase()}</AvatarFallback>
            </Avatar>
            <div className="space-y-2 flex-1">
              <div>
                <p className="font-semibold">{metadata?.display_name ?? metadata?.name ?? genUserName(pubkey)}</p>
                {metadata?.nip05 && (
                  <p className="text-sm text-muted-foreground">{metadata.nip05}</p>
                )}
              </div>
              {metadata?.about && (
                <p className="text-sm text-muted-foreground line-clamp-3">{metadata.about}</p>
              )}
              <div className="pt-2">
                <Badge variant="secondary" className="font-mono text-xs">
                  {pubkey.slice(0, 16)}...
                </Badge>
              </div>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
