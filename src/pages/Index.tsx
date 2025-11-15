import { useSeoMeta } from '@unhead/react';
import { SocialGraphVisualizer } from '@/components/SocialGraphVisualizer';

const Index = () => {
  useSeoMeta({
    title: 'Nostr Social Graph Visualizer',
    description: 'Explore the decentralized web of trust on the Nostr network. Visualize social connections and discover how users are connected.',
  });

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950">
      <div className="container mx-auto px-4 py-8 max-w-7xl">
        <SocialGraphVisualizer />
      </div>

      {/* Footer */}
      <footer className="mt-16 pb-8 text-center">
        <p className="text-sm text-muted-foreground">
          Vibed with{' '}
          <a
            href="https://soapbox.pub/mkstack"
            target="_blank"
            rel="noopener noreferrer"
            className="text-primary hover:underline"
          >
            MKStack
          </a>
        </p>
      </footer>
    </div>
  );
};

export default Index;
