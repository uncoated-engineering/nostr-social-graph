import { useCallback, useEffect, useRef, useState } from 'react';
import ForceGraph2D from 'react-force-graph-2d';
import type { ForceGraphMethods, NodeObject, LinkObject } from 'react-force-graph-2d';
import { useWebOfTrust } from '@/hooks/useWebOfTrust';
import { useCurrentUser } from '@/hooks/useCurrentUser';
import { useLocalStorage } from '@/hooks/useLocalStorage';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Slider } from '@/components/ui/slider';
import { Label } from '@/components/ui/label';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import { LoginArea } from '@/components/auth/LoginArea';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { Network, Users, Link as LinkIcon, Star, Sparkles, Globe } from 'lucide-react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useAuthor } from '@/hooks/useAuthor';
import { genUserName } from '@/lib/genUserName';
import { UserNodeDialog } from '@/components/UserNodeDialog';
import type { NostrMetadata } from '@nostrify/nostrify';

interface ExtendedNodeObject extends NodeObject {
  id: string;
  inDegree: number;
  outDegree: number;
  isHub: boolean;
  cluster?: number;
  degreesFromRoot?: number;
}

interface ExtendedLinkObject extends LinkObject {
  source: string | ExtendedNodeObject;
  target: string | ExtendedNodeObject;
  isBidirectional: boolean;
}

const DEFAULT_RELAYS = [
  'wss://relay.ditto.pub',
  'wss://relay.nostr.band',
  'wss://relay.damus.io',
];

const POPULAR_RELAYS = [
  'wss://relay.ditto.pub',
  'wss://relay.nostr.band',
  'wss://relay.damus.io',
  'wss://nos.lol',
  'wss://relay.primal.net',
  'wss://relay.snort.social',
  'wss://nostr.wine',
];

// Color palette for clusters (vibrant, distinct colors)
const CLUSTER_COLORS = [
  '#3b82f6', // blue
  '#10b981', // emerald
  '#f59e0b', // amber
  '#8b5cf6', // violet
  '#ec4899', // pink
  '#06b6d4', // cyan
  '#f97316', // orange
  '#14b8a6', // teal
  '#6366f1', // indigo
  '#84cc16', // lime
];

export function SocialGraphVisualizer() {
  const { user } = useCurrentUser();
  const [depth, setDepth] = useState(2);
  const [hoveredNode, setHoveredNode] = useState<string | null>(null);
  const [selectedNodeForDialog, setSelectedNodeForDialog] = useState<string | null>(null);
  const [showLinkParticles, setShowLinkParticles] = useState(true);
  const [highlightHubs, setHighlightHubs] = useState(true);
  const [nostrClient, setNostrClient] = useState<'primal' | 'njump' | 'snort'>('primal');
  const [viewMode, setViewMode] = useState<'personal' | 'global'>('personal');
  const [perspectivePubkey, setPerspectivePubkey] = useState<string | undefined>(undefined);
  const graphRef = useRef<ForceGraphMethods>();

  // Relay management
  const [customRelayInput, setCustomRelayInput] = useState('');
  const [selectedRelays, setSelectedRelays] = useLocalStorage<string[]>(
    'graph-relays',
    DEFAULT_RELAYS
  );

  // Determine which pubkey to use for the graph
  const graphStartPubkey = viewMode === 'global' ? undefined : (perspectivePubkey || user?.pubkey);

  // Fetch web of trust data
  const { data: graphData, isLoading, error } = useWebOfTrust({
    startPubkey: graphStartPubkey,
    depth,
    limit: 150,
    relayUrls: selectedRelays,
    referenceUser: user?.pubkey, // Always calculate distance from logged-in user
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

  // Handle node clicks - open dialog
  const handleNodeClick = useCallback((node: NodeObject) => {
    const extNode = node as ExtendedNodeObject;
    if (!extNode.id || typeof extNode.id !== 'string') return;
    setSelectedNodeForDialog(extNode.id);
  }, []);

  // Handle viewing from a user's perspective
  const handleViewFromPerspective = useCallback((pubkey: string) => {
    setPerspectivePubkey(pubkey);
    setViewMode('personal');
  }, []);

  // Handle node hover
  const handleNodeHover = useCallback((node: NodeObject | null) => {
    const extNode = node as ExtendedNodeObject | null;
    const nodeId = extNode?.id;
    setHoveredNode(nodeId && typeof nodeId === 'string' ? nodeId : null);
  }, []);

  // Get hovered node metadata for tooltip
  const hoveredAuthor = useAuthor(hoveredNode || '');
  const hoveredMetadata: NostrMetadata | undefined = hoveredAuthor.data?.metadata;

  // Get selected node data for dialog
  const selectedNodeData = graphData?.nodes.find(n => n.id === selectedNodeForDialog);

  // Get cluster color
  const getClusterColor = (cluster?: number): string => {
    if (cluster === undefined) return '#94a3b8';
    return CLUSTER_COLORS[cluster % CLUSTER_COLORS.length];
  };

  // Draw nodes with clusters, hubs, and highlighting
  const drawNode = useCallback(
    (node: NodeObject, ctx: CanvasRenderingContext2D, globalScale: number) => {
      const extNode = node as ExtendedNodeObject;
      const size = Math.sqrt(extNode.val ?? 1) * 2;

      // Determine base color from cluster
      let color = getClusterColor(extNode.cluster);

      // Override color for special states
      if (extNode.id === user?.pubkey) {
        color = '#ffffff'; // white for current user
      } else if (extNode.id === hoveredNode) {
        color = '#fbbf24'; // bright amber for hovered
      }

      // Draw hub glow effect
      if (highlightHubs && extNode.isHub && globalScale >= 0.5) {
        const glowSize = size * 2.5;
        const gradient = ctx.createRadialGradient(
          extNode.x ?? 0,
          extNode.y ?? 0,
          size,
          extNode.x ?? 0,
          extNode.y ?? 0,
          glowSize
        );
        gradient.addColorStop(0, color + '40');
        gradient.addColorStop(0.5, color + '20');
        gradient.addColorStop(1, color + '00');

        ctx.fillStyle = gradient;
        ctx.beginPath();
        ctx.arc(extNode.x ?? 0, extNode.y ?? 0, glowSize, 0, 2 * Math.PI);
        ctx.fill();
      }

      // Draw main circle
      ctx.beginPath();
      ctx.arc(extNode.x ?? 0, extNode.y ?? 0, size, 0, 2 * Math.PI);
      ctx.fillStyle = color;
      ctx.fill();

      // Draw border
      ctx.strokeStyle = '#1e293b';
      ctx.lineWidth = extNode.isHub ? 1.5 : 0.8;
      ctx.stroke();

      // Draw hub star indicator
      if (highlightHubs && extNode.isHub && globalScale >= 1) {
        ctx.fillStyle = '#fbbf24';
        ctx.font = `${size * 0.8}px Arial`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText('★', extNode.x ?? 0, extNode.y ?? 0);
      }

      // Draw ring around current user
      if (extNode.id === user?.pubkey) {
        ctx.strokeStyle = '#3b82f6';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.arc(extNode.x ?? 0, extNode.y ?? 0, size + 3, 0, 2 * Math.PI);
        ctx.stroke();
      }
    },
    [user?.pubkey, hoveredNode, highlightHubs]
  );

  // Draw links with different styles for bidirectional
  const drawLink = useCallback((link: LinkObject, ctx: CanvasRenderingContext2D) => {
    const extLink = link as ExtendedLinkObject;

    // Skip if no source/target coordinates
    if (!link.source || !link.target) return;

    const sourceNode = link.source as ExtendedNodeObject;
    const targetNode = link.target as ExtendedNodeObject;

    if (!sourceNode.x || !sourceNode.y || !targetNode.x || !targetNode.y) return;

    // Different style for bidirectional links
    if (extLink.isBidirectional) {
      ctx.strokeStyle = '#64748b'; // lighter slate for bidirectional
      ctx.lineWidth = 1.5;
    } else {
      ctx.strokeStyle = '#334155'; // darker slate for one-way
      ctx.lineWidth = 0.5;
    }

    ctx.beginPath();
    ctx.moveTo(sourceNode.x, sourceNode.y);
    ctx.lineTo(targetNode.x, targetNode.y);
    ctx.stroke();
  }, []);

  // Node label function for hover tooltip
  const getNodeLabel = useCallback((node: NodeObject) => {
    const extNode = node as ExtendedNodeObject;
    if (!hoveredNode || extNode.id !== hoveredNode) return '';

    const username = hoveredMetadata?.display_name ??
                    hoveredMetadata?.name ??
                    genUserName(hoveredNode);

    return username;
  }, [hoveredNode, hoveredMetadata]);

  // Handle relay toggle
  const toggleRelay = (relay: string) => {
    setSelectedRelays(prev =>
      prev.includes(relay)
        ? prev.filter(r => r !== relay)
        : [...prev, relay]
    );
  };

  // Add custom relay
  const addCustomRelay = () => {
    if (customRelayInput.startsWith('wss://') && !selectedRelays.includes(customRelayInput)) {
      setSelectedRelays([...selectedRelays, customRelayInput]);
      setCustomRelayInput('');
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-2xl flex items-center gap-2">
                <Network className="w-6 h-6" />
                Nostr Social Graph Visualizer
              </CardTitle>
              <CardDescription className="mt-2">
                Explore the decentralized web of trust on the Nostr network
              </CardDescription>
            </div>
            <LoginArea className="max-w-60" />
          </div>
        </CardHeader>
      </Card>

      {/* Statistics Card */}
      {graphData && (
        <Card>
          <CardContent className="pt-6">
            <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
              <div className="text-center">
                <div className="flex items-center justify-center gap-1 mb-1">
                  <Users className="w-4 h-4 text-muted-foreground" />
                  <p className="text-2xl font-bold">{graphData.stats.totalNodes}</p>
                </div>
                <p className="text-xs text-muted-foreground">Users</p>
              </div>
              <div className="text-center">
                <div className="flex items-center justify-center gap-1 mb-1">
                  <LinkIcon className="w-4 h-4 text-muted-foreground" />
                  <p className="text-2xl font-bold">{graphData.stats.totalLinks}</p>
                </div>
                <p className="text-xs text-muted-foreground">Connections</p>
              </div>
              <div className="text-center">
                <div className="flex items-center justify-center gap-1 mb-1">
                  <Star className="w-4 h-4 text-amber-500" />
                  <p className="text-2xl font-bold">{graphData.stats.hubs}</p>
                </div>
                <p className="text-xs text-muted-foreground">Hubs</p>
              </div>
              <div className="text-center">
                <div className="flex items-center justify-center gap-1 mb-1">
                  <Sparkles className="w-4 h-4 text-blue-500" />
                  <p className="text-2xl font-bold">{graphData.stats.bidirectionalLinks}</p>
                </div>
                <p className="text-xs text-muted-foreground">Mutual Follows</p>
              </div>
              <div className="text-center">
                <div className="flex items-center justify-center gap-1 mb-1">
                  <Network className="w-4 h-4 text-purple-500" />
                  <p className="text-2xl font-bold">{graphData.stats.clusters}</p>
                </div>
                <p className="text-xs text-muted-foreground">Clusters</p>
              </div>
            </div>
            <div className="mt-4 text-center">
              <p className="text-sm text-muted-foreground">
                {user ? (
                  <>
                    Showing your web of trust starting from{' '}
                    <Badge variant="outline">{user.pubkey.slice(0, 8)}...</Badge>
                  </>
                ) : (
                  'Showing recent users from the network'
                )}
              </p>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Controls */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Controls</CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* View Mode Toggle (only when logged in) */}
          {user && (
            <div className="space-y-2">
              <Label>View Mode</Label>
              <div className="flex gap-2">
                <Button
                  variant={viewMode === 'personal' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => {
                    setViewMode('personal');
                    setPerspectivePubkey(undefined);
                  }}
                  className="flex-1"
                >
                  <Users className="w-4 h-4 mr-2" />
                  {perspectivePubkey ? 'Viewing User Network' : 'My Network'}
                </Button>
                <Button
                  variant={viewMode === 'global' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setViewMode('global')}
                  className="flex-1"
                >
                  <Globe className="w-4 h-4 mr-2" />
                  Global
                </Button>
              </div>
            </div>
          )}

          {/* Network Depth */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label htmlFor="depth-slider">Network Depth: {depth}</Label>
              <span className="text-xs text-muted-foreground">
                {depth === 1 && 'Direct follows only'}
                {depth === 2 && 'Follows + their follows'}
                {depth === 3 && 'Three degrees of separation'}
                {depth === 4 && 'Four degrees of separation'}
              </span>
            </div>
            <Slider
              id="depth-slider"
              min={1}
              max={4}
              step={1}
              value={[depth]}
              onValueChange={([value]) => setDepth(value)}
              className="w-full"
            />
          </div>

          {/* Visual Options */}
          <div className="space-y-3">
            <Label>Visual Options</Label>
            <div className="flex flex-col gap-3">
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="show-particles"
                  checked={showLinkParticles}
                  onCheckedChange={(checked) => setShowLinkParticles(checked === true)}
                />
                <label htmlFor="show-particles" className="text-sm cursor-pointer">
                  Show link particles (network flow)
                </label>
              </div>
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="highlight-hubs"
                  checked={highlightHubs}
                  onCheckedChange={(checked) => setHighlightHubs(checked === true)}
                />
                <label htmlFor="highlight-hubs" className="text-sm cursor-pointer">
                  Highlight network hubs with glow
                </label>
              </div>
            </div>
          </div>

          {/* Nostr Client Selection */}
          <div className="space-y-2">
            <Label htmlFor="client-select">Open profiles in</Label>
            <Select value={nostrClient} onValueChange={(val) => setNostrClient(val as typeof nostrClient)}>
              <SelectTrigger id="client-select">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="primal">Primal</SelectItem>
                <SelectItem value="njump">njump</SelectItem>
                <SelectItem value="snort">Snort</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Legend */}
          <div className="pt-4 border-t">
            <Label className="mb-3 block">Legend</Label>
            <div className="grid grid-cols-2 gap-3">
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 rounded-full bg-white border-2 border-blue-500"></div>
                <span className="text-xs text-muted-foreground">You</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 rounded-full bg-amber-500"></div>
                <span className="text-xs text-muted-foreground">Hovered</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 rounded-full" style={{ background: `linear-gradient(90deg, ${CLUSTER_COLORS.slice(0, 3).join(', ')})` }}></div>
                <span className="text-xs text-muted-foreground">Clusters</span>
              </div>
              <div className="flex items-center gap-2">
                <Star className="w-4 h-4 text-amber-500" />
                <span className="text-xs text-muted-foreground">Hubs</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="flex gap-1">
                  <div className="w-2 h-0.5 bg-slate-400 self-center"></div>
                  <div className="w-2 h-0.5 bg-slate-400 self-center"></div>
                </div>
                <span className="text-xs text-muted-foreground">One-way follow</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-4 h-1 bg-slate-500 rounded"></div>
                <span className="text-xs text-muted-foreground">Mutual follow</span>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Relay Selector */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Relay Selection</CardTitle>
          <CardDescription>
            Choose which relays to query for social graph data
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
            {POPULAR_RELAYS.map(relay => (
              <div key={relay} className="flex items-center space-x-2">
                <Checkbox
                  id={relay}
                  checked={selectedRelays.includes(relay)}
                  onCheckedChange={() => toggleRelay(relay)}
                />
                <label htmlFor={relay} className="text-sm cursor-pointer font-mono">
                  {relay.replace('wss://', '')}
                </label>
              </div>
            ))}
          </div>
          <div className="flex gap-2">
            <Input
              placeholder="wss://custom.relay"
              value={customRelayInput}
              onChange={(e) => setCustomRelayInput(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && addCustomRelay()}
            />
            <Button onClick={addCustomRelay} variant="outline" size="sm">
              Add
            </Button>
          </div>
          <p className="text-xs text-muted-foreground">
            Selected {selectedRelays.length} relay{selectedRelays.length !== 1 ? 's' : ''}
          </p>
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
                  <p className="text-xs text-muted-foreground">
                    Querying {selectedRelays.length} relay{selectedRelays.length !== 1 ? 's' : ''}
                  </p>
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
                nodeLabel={getNodeLabel}
                linkCanvasObject={drawLink}
                onNodeClick={handleNodeClick}
                onNodeHover={handleNodeHover}
                linkDirectionalParticles={showLinkParticles ? 2 : 0}
                linkDirectionalParticleWidth={(link) => {
                  const extLink = link as ExtendedLinkObject;
                  return extLink.isBidirectional ? 2 : 1;
                }}
                linkDirectionalParticleSpeed={0.003}
                linkDirectionalParticleColor={() => '#64748b'}
                backgroundColor="#020617"
                cooldownTime={3000}
                warmupTicks={100}
                enableNodeDrag={true}
                enableZoomInteraction={true}
                enablePanInteraction={true}
                d3VelocityDecay={0.3}
              />
            )}

            {/* Click hint overlay */}
            {graphData && !isLoading && (
              <div className="absolute bottom-4 left-1/2 transform -translate-x-1/2 pointer-events-none">
                <Badge variant="secondary" className="flex items-center gap-1">
                  <Network className="w-3 h-3" />
                  Click any user to view details and explore their network
                </Badge>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* User Node Dialog */}
      <UserNodeDialog
        pubkey={selectedNodeForDialog}
        onClose={() => setSelectedNodeForDialog(null)}
        onViewFromPerspective={handleViewFromPerspective}
        nostrClient={nostrClient}
        inDegree={selectedNodeData?.inDegree || 0}
        degreesFromRoot={selectedNodeData?.degreesFromRoot}
      />
    </div>
  );
}
