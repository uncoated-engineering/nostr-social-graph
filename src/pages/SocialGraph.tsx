import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { nip19 } from 'nostr-tools';
import { GraphVisualization, GraphVisualizationSkeleton } from '@/components/GraphVisualization';
import { useSocialGraph } from '@/hooks/useSocialGraph';
import { useCurrentUser } from '@/hooks/useCurrentUser';
import { LoginArea } from '@/components/auth/LoginArea';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Slider } from '@/components/ui/slider';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import type { GraphNode } from '@/lib/forceGraph';
import { Network, User, Users, Settings } from 'lucide-react';

export default function SocialGraph() {
  const navigate = useNavigate();
  const { user } = useCurrentUser();

  // Graph configuration state
  const [mode, setMode] = useState<'all' | 'user'>('all');
  const [rootPubkey, setRootPubkey] = useState<string | undefined>(undefined);
  const [npubInput, setNpubInput] = useState('');
  const [depth, setDepth] = useState(2);
  const [limit, setLimit] = useState(100);
  const [error, setError] = useState<string | null>(null);

  // Fetch graph data
  const { data, isLoading, isError } = useSocialGraph({
    rootPubkey: mode === 'user' ? rootPubkey : undefined,
    depth,
    limit,
  });

  // Handle "Use My Profile" button
  const handleUseMyProfile = () => {
    if (user) {
      setRootPubkey(user.pubkey);
      setMode('user');
      setError(null);
    }
  };

  // Handle npub input
  const handleNpubSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!npubInput.trim()) {
      setError('Please enter an npub or hex pubkey');
      return;
    }

    try {
      let pubkey: string;

      // Try to decode as npub
      if (npubInput.startsWith('npub1')) {
        const decoded = nip19.decode(npubInput.trim());
        if (decoded.type !== 'npub') {
          setError('Invalid npub format');
          return;
        }
        pubkey = decoded.data;
      } else if (npubInput.startsWith('nprofile1')) {
        const decoded = nip19.decode(npubInput.trim());
        if (decoded.type !== 'nprofile') {
          setError('Invalid nprofile format');
          return;
        }
        pubkey = decoded.data.pubkey;
      } else {
        // Assume hex pubkey
        pubkey = npubInput.trim();
      }

      setRootPubkey(pubkey);
      setMode('user');
    } catch {
      setError('Invalid npub or hex pubkey');
    }
  };

  // Handle node click
  const handleNodeClick = (node: GraphNode) => {
    const npub = nip19.npubEncode(node.id);
    navigate(`/${npub}`);
  };

  const stats = data
    ? {
        nodes: data.nodes.length,
        connections: data.links.length,
      }
    : { nodes: 0, connections: 0 };

  return (
    <div className="min-h-screen bg-gradient-to-br from-violet-50 via-purple-50 to-indigo-50 dark:from-slate-950 dark:via-purple-950 dark:to-slate-900">
      {/* Header */}
      <header className="border-b bg-white/80 dark:bg-slate-900/80 backdrop-blur-sm sticky top-0 z-10">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-gradient-to-br from-violet-500 to-purple-600 rounded-lg">
                <Network className="h-6 w-6 text-white" />
              </div>
              <div>
                <h1 className="text-2xl font-bold bg-gradient-to-r from-violet-600 to-purple-600 bg-clip-text text-transparent">
                  Nostr Social Graph
                </h1>
                <p className="text-sm text-muted-foreground">
                  Visualize the Web of Trust
                </p>
              </div>
            </div>
            <LoginArea className="max-w-60" />
          </div>
        </div>
      </header>

      <div className="container mx-auto px-4 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          {/* Controls Sidebar */}
          <div className="lg:col-span-1 space-y-4">
            {/* Mode Selection */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Settings className="h-5 w-5" />
                  Configuration
                </CardTitle>
                <CardDescription>
                  Choose how to visualize the graph
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <Tabs value={mode} onValueChange={(v) => setMode(v as 'all' | 'user')}>
                  <TabsList className="grid w-full grid-cols-2">
                    <TabsTrigger value="all" className="flex items-center gap-1">
                      <Users className="h-4 w-4" />
                      All
                    </TabsTrigger>
                    <TabsTrigger value="user" className="flex items-center gap-1">
                      <User className="h-4 w-4" />
                      User
                    </TabsTrigger>
                  </TabsList>

                  <TabsContent value="all" className="space-y-4">
                    <p className="text-sm text-muted-foreground">
                      Visualize all users and their connections from the relay.
                    </p>
                  </TabsContent>

                  <TabsContent value="user" className="space-y-4">
                    {user && (
                      <Button
                        onClick={handleUseMyProfile}
                        variant="outline"
                        className="w-full"
                      >
                        Use My Profile
                      </Button>
                    )}

                    <form onSubmit={handleNpubSubmit} className="space-y-3">
                      <div className="space-y-2">
                        <Label htmlFor="npub">User npub or hex pubkey</Label>
                        <Input
                          id="npub"
                          value={npubInput}
                          onChange={(e) => setNpubInput(e.target.value)}
                          placeholder="npub1... or hex pubkey"
                          className="font-mono text-sm"
                        />
                      </div>
                      <Button type="submit" className="w-full">
                        Visualize
                      </Button>
                    </form>

                    {error && (
                      <Alert variant="destructive">
                        <AlertDescription>{error}</AlertDescription>
                      </Alert>
                    )}
                  </TabsContent>
                </Tabs>
              </CardContent>
            </Card>

            {/* Graph Parameters */}
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Parameters</CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <Label>Depth</Label>
                    <span className="text-sm text-muted-foreground">{depth}</span>
                  </div>
                  <Slider
                    value={[depth]}
                    onValueChange={(v) => setDepth(v[0])}
                    min={1}
                    max={3}
                    step={1}
                    className="w-full"
                  />
                  <p className="text-xs text-muted-foreground">
                    How many levels of connections to fetch
                  </p>
                </div>

                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <Label>Max Nodes</Label>
                    <span className="text-sm text-muted-foreground">{limit}</span>
                  </div>
                  <Slider
                    value={[limit]}
                    onValueChange={(v) => setLimit(v[0])}
                    min={20}
                    max={200}
                    step={20}
                    className="w-full"
                  />
                  <p className="text-xs text-muted-foreground">
                    Maximum number of nodes to display
                  </p>
                </div>
              </CardContent>
            </Card>

            {/* Stats */}
            {data && (
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Statistics</CardTitle>
                </CardHeader>
                <CardContent className="space-y-2">
                  <div className="flex justify-between">
                    <span className="text-sm text-muted-foreground">Nodes</span>
                    <span className="font-semibold">{stats.nodes}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm text-muted-foreground">Connections</span>
                    <span className="font-semibold">{stats.connections}</span>
                  </div>
                </CardContent>
              </Card>
            )}
          </div>

          {/* Graph Visualization */}
          <div className="lg:col-span-3">
            <Card className="overflow-hidden">
              <CardContent className="p-0">
                {isLoading && <GraphVisualizationSkeleton className="min-h-[600px]" />}

                {isError && (
                  <div className="min-h-[600px] flex items-center justify-center">
                    <Alert variant="destructive" className="max-w-md">
                      <AlertDescription>
                        Failed to load social graph data. Please check your relay
                        connections and try again.
                      </AlertDescription>
                    </Alert>
                  </div>
                )}

                {!isLoading && !isError && data && data.nodes.length === 0 && (
                  <div className="min-h-[600px] flex items-center justify-center">
                    <Card className="border-dashed max-w-md">
                      <CardContent className="py-12 px-8 text-center">
                        <div className="space-y-4">
                          <Network className="h-12 w-12 mx-auto text-muted-foreground" />
                          <p className="text-muted-foreground">
                            No connections found. Try adjusting your parameters or
                            selecting a different user.
                          </p>
                        </div>
                      </CardContent>
                    </Card>
                  </div>
                )}

                {!isLoading && !isError && data && data.nodes.length > 0 && (
                  <div className="relative">
                    <GraphVisualization
                      data={data}
                      onNodeClick={handleNodeClick}
                      className="min-h-[600px]"
                    />
                    <div className="absolute bottom-4 left-4 bg-white/90 dark:bg-slate-800/90 backdrop-blur-sm rounded-lg p-3 text-xs space-y-1">
                      <p className="font-semibold">Interaction Tips</p>
                      <p className="text-muted-foreground">• Hover over nodes to see names</p>
                      <p className="text-muted-foreground">• Click nodes to view profiles</p>
                      <p className="text-muted-foreground">• Purple nodes are root users</p>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      </div>

      {/* Footer */}
      <footer className="border-t bg-white/50 dark:bg-slate-900/50 backdrop-blur-sm mt-12">
        <div className="container mx-auto px-4 py-6">
          <p className="text-center text-sm text-muted-foreground">
            Decentralized Social Graph Visualization for the Nostr Network
          </p>
        </div>
      </footer>
    </div>
  );
}
