import { useSeoMeta } from '@unhead/react';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { LoginArea } from '@/components/auth/LoginArea';
import { Network, Users, Eye, GitBranch, Sparkles, ArrowRight } from 'lucide-react';

const Index = () => {
  useSeoMeta({
    title: 'Nostr Social Graph - Visualize the Web of Trust',
    description: 'A decentralized social graph visualization tool for the Nostr network. Explore connections, discover communities, and understand the web of trust.',
  });

  return (
    <div className="min-h-screen bg-gradient-to-br from-violet-50 via-purple-50 to-indigo-50 dark:from-slate-950 dark:via-purple-950 dark:to-slate-900">
      {/* Header */}
      <header className="border-b bg-white/80 dark:bg-slate-900/80 backdrop-blur-sm">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-gradient-to-br from-violet-500 to-purple-600 rounded-lg">
                <Network className="h-6 w-6 text-white" />
              </div>
              <h1 className="text-xl font-bold bg-gradient-to-r from-violet-600 to-purple-600 bg-clip-text text-transparent">
                Nostr Social Graph
              </h1>
            </div>
            <LoginArea className="max-w-60" />
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="container mx-auto px-4 py-16 md:py-24">
        <div className="max-w-4xl mx-auto text-center space-y-8">
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-violet-100 dark:bg-violet-900/30 text-violet-700 dark:text-violet-300 text-sm font-medium">
            <Sparkles className="h-4 w-4" />
            Decentralized Social Graph Visualization
          </div>

          <h2 className="text-5xl md:text-6xl font-bold leading-tight">
            <span className="bg-gradient-to-r from-violet-600 via-purple-600 to-indigo-600 bg-clip-text text-transparent">
              Visualize the Web of Trust
            </span>
            <br />
            <span className="text-slate-800 dark:text-slate-200">
              on Nostr
            </span>
          </h2>

          <p className="text-xl text-slate-600 dark:text-slate-300 max-w-2xl mx-auto leading-relaxed">
            Explore the decentralized social network. Discover connections, understand communities,
            and navigate the web of trust with beautiful, interactive visualizations.
          </p>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-4 pt-4">
            <Link to="/graph">
              <Button size="lg" className="bg-gradient-to-r from-violet-600 to-purple-600 hover:from-violet-700 hover:to-purple-700 text-white px-8 py-6 text-lg">
                Explore the Graph
                <ArrowRight className="ml-2 h-5 w-5" />
              </Button>
            </Link>
          </div>
        </div>
      </section>

      {/* Features Grid */}
      <section className="container mx-auto px-4 py-16">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-5xl mx-auto">
          <Card className="border-2 border-violet-100 dark:border-violet-900/30 bg-white/80 dark:bg-slate-900/80 backdrop-blur-sm hover:shadow-xl transition-shadow">
            <CardContent className="pt-6 space-y-4">
              <div className="p-3 bg-gradient-to-br from-violet-500 to-purple-600 rounded-lg w-fit">
                <Users className="h-6 w-6 text-white" />
              </div>
              <h3 className="text-xl font-bold text-slate-800 dark:text-slate-200">
                User-Centered View
              </h3>
              <p className="text-slate-600 dark:text-slate-400">
                Start from any Nostr user and explore their personal web of trust.
                See who they follow and discover their network.
              </p>
            </CardContent>
          </Card>

          <Card className="border-2 border-purple-100 dark:border-purple-900/30 bg-white/80 dark:bg-slate-900/80 backdrop-blur-sm hover:shadow-xl transition-shadow">
            <CardContent className="pt-6 space-y-4">
              <div className="p-3 bg-gradient-to-br from-purple-500 to-indigo-600 rounded-lg w-fit">
                <Eye className="h-6 w-6 text-white" />
              </div>
              <h3 className="text-xl font-bold text-slate-800 dark:text-slate-200">
                Network Overview
              </h3>
              <p className="text-slate-600 dark:text-slate-400">
                Visualize all connections on a relay at once.
                Understand the broader community structure and dynamics.
              </p>
            </CardContent>
          </Card>

          <Card className="border-2 border-indigo-100 dark:border-indigo-900/30 bg-white/80 dark:bg-slate-900/80 backdrop-blur-sm hover:shadow-xl transition-shadow">
            <CardContent className="pt-6 space-y-4">
              <div className="p-3 bg-gradient-to-br from-indigo-500 to-violet-600 rounded-lg w-fit">
                <GitBranch className="h-6 w-6 text-white" />
              </div>
              <h3 className="text-xl font-bold text-slate-800 dark:text-slate-200">
                Interactive Exploration
              </h3>
              <p className="text-slate-600 dark:text-slate-400">
                Click on nodes to navigate between profiles.
                Adjust depth and parameters to customize your view.
              </p>
            </CardContent>
          </Card>
        </div>
      </section>

      {/* How It Works */}
      <section className="container mx-auto px-4 py-16">
        <div className="max-w-3xl mx-auto">
          <h3 className="text-3xl font-bold text-center mb-12 bg-gradient-to-r from-violet-600 to-purple-600 bg-clip-text text-transparent">
            How It Works
          </h3>

          <div className="space-y-6">
            <Card className="bg-white/80 dark:bg-slate-900/80 backdrop-blur-sm">
              <CardContent className="pt-6">
                <div className="flex gap-4">
                  <div className="flex-shrink-0 w-8 h-8 rounded-full bg-gradient-to-br from-violet-500 to-purple-600 flex items-center justify-center text-white font-bold">
                    1
                  </div>
                  <div>
                    <h4 className="font-bold text-lg mb-2 text-slate-800 dark:text-slate-200">
                      Choose Your Starting Point
                    </h4>
                    <p className="text-slate-600 dark:text-slate-400">
                      Start from your own profile, enter any npub, or explore all connections on the relay.
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="bg-white/80 dark:bg-slate-900/80 backdrop-blur-sm">
              <CardContent className="pt-6">
                <div className="flex gap-4">
                  <div className="flex-shrink-0 w-8 h-8 rounded-full bg-gradient-to-br from-purple-500 to-indigo-600 flex items-center justify-center text-white font-bold">
                    2
                  </div>
                  <div>
                    <h4 className="font-bold text-lg mb-2 text-slate-800 dark:text-slate-200">
                      Configure Your View
                    </h4>
                    <p className="text-slate-600 dark:text-slate-400">
                      Adjust the depth to explore multiple levels of connections and set the maximum number of nodes to display.
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="bg-white/80 dark:bg-slate-900/80 backdrop-blur-sm">
              <CardContent className="pt-6">
                <div className="flex gap-4">
                  <div className="flex-shrink-0 w-8 h-8 rounded-full bg-gradient-to-br from-indigo-500 to-violet-600 flex items-center justify-center text-white font-bold">
                    3
                  </div>
                  <div>
                    <h4 className="font-bold text-lg mb-2 text-slate-800 dark:text-slate-200">
                      Explore and Interact
                    </h4>
                    <p className="text-slate-600 dark:text-slate-400">
                      Hover over nodes to see user names, click to navigate to profiles, and watch the force-directed layout animate.
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="container mx-auto px-4 py-16">
        <Card className="max-w-3xl mx-auto bg-gradient-to-br from-violet-600 via-purple-600 to-indigo-600 border-0">
          <CardContent className="pt-12 pb-12 text-center space-y-6">
            <h3 className="text-3xl font-bold text-white">
              Ready to Explore?
            </h3>
            <p className="text-violet-100 text-lg max-w-xl mx-auto">
              Dive into the decentralized social graph and discover the connections
              that make Nostr unique.
            </p>
            <Link to="/graph">
              <Button size="lg" variant="secondary" className="px-8 py-6 text-lg">
                Start Visualizing
                <ArrowRight className="ml-2 h-5 w-5" />
              </Button>
            </Link>
          </CardContent>
        </Card>
      </section>

      {/* Footer */}
      <footer className="border-t bg-white/50 dark:bg-slate-900/50 backdrop-blur-sm mt-12">
        <div className="container mx-auto px-4 py-6">
          <p className="text-center text-sm text-slate-600 dark:text-slate-400">
            Built with{' '}
            <a
              href="https://soapbox.pub/mkstack"
              target="_blank"
              rel="noopener noreferrer"
              className="text-violet-600 hover:text-violet-700 dark:text-violet-400 dark:hover:text-violet-300 font-medium"
            >
              MKStack
            </a>
            {' '}• Decentralized Social Graph Visualization for Nostr
          </p>
        </div>
      </footer>
    </div>
  );
};

export default Index;
