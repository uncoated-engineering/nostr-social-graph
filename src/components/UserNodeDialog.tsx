import { useCallback } from 'react';
import { nip19 } from 'nostr-tools';
import { useAuthor } from '@/hooks/useAuthor';
import { genUserName } from '@/lib/genUserName';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { ExternalLink, Network, Users } from 'lucide-react';
import type { NostrMetadata } from '@nostrify/nostrify';

interface UserNodeDialogProps {
  pubkey: string | null;
  onClose: () => void;
  onViewFromPerspective: (pubkey: string) => void;
  nostrClient: 'primal' | 'njump' | 'snort';
  inDegree: number;
  degreesFromRoot?: number;
}

export function UserNodeDialog({
  pubkey,
  onClose,
  onViewFromPerspective,
  nostrClient,
  inDegree,
  degreesFromRoot,
}: UserNodeDialogProps) {
  const author = useAuthor(pubkey || '');
  const metadata: NostrMetadata | undefined = author.data?.metadata;

  const handleViewProfile = useCallback(() => {
    if (!pubkey) return;
    const npub = nip19.npubEncode(pubkey);

    let url = '';
    switch (nostrClient) {
      case 'primal':
        url = `https://primal.net/p/${npub}`;
        break;
      case 'njump':
        url = `https://njump.me/${npub}`;
        break;
      case 'snort':
        url = `https://snort.social/p/${npub}`;
        break;
    }

    window.open(url, '_blank', 'noopener,noreferrer');
  }, [pubkey, nostrClient]);

  const handleViewGraphFromPerspective = useCallback(() => {
    if (!pubkey) return;
    onViewFromPerspective(pubkey);
    onClose();
  }, [pubkey, onViewFromPerspective, onClose]);

  return (
    <Dialog open={!!pubkey} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>User Profile</DialogTitle>
          <DialogDescription>
            View profile details and explore their network
          </DialogDescription>
        </DialogHeader>

        {author.isLoading ? (
          <div className="space-y-4">
            <div className="flex items-center gap-4">
              <Skeleton className="h-16 w-16 rounded-full" />
              <div className="space-y-2 flex-1">
                <Skeleton className="h-4 w-32" />
                <Skeleton className="h-3 w-24" />
              </div>
            </div>
            <Skeleton className="h-20 w-full" />
          </div>
        ) : (
          <div className="space-y-6">
            {/* User Info */}
            <div className="flex items-start gap-4">
              <Avatar className="h-16 w-16">
                <AvatarImage src={metadata?.picture} alt={metadata?.name ?? 'User'} />
                <AvatarFallback>
                  {(metadata?.name ?? genUserName(pubkey || '')).slice(0, 2).toUpperCase()}
                </AvatarFallback>
              </Avatar>
              <div className="space-y-2 flex-1">
                <div>
                  <p className="font-semibold text-lg">
                    {metadata?.display_name ?? metadata?.name ?? genUserName(pubkey || '')}
                  </p>
                  {metadata?.nip05 && (
                    <p className="text-sm text-muted-foreground">{metadata.nip05}</p>
                  )}
                </div>
              </div>
            </div>

            {/* About */}
            {metadata?.about && (
              <div>
                <p className="text-sm text-muted-foreground line-clamp-4">{metadata.about}</p>
              </div>
            )}

            {/* Stats */}
            <div className="grid grid-cols-2 gap-4 py-4 border-y">
              <div className="text-center">
                <div className="flex items-center justify-center gap-1 mb-1">
                  <Users className="w-4 h-4 text-muted-foreground" />
                  <p className="text-2xl font-bold">{inDegree}</p>
                </div>
                <p className="text-xs text-muted-foreground">Followers</p>
              </div>
              <div className="text-center">
                <div className="flex items-center justify-center gap-1 mb-1">
                  <Network className="w-4 h-4 text-muted-foreground" />
                  <p className="text-2xl font-bold">
                    {degreesFromRoot !== undefined ? degreesFromRoot : '—'}
                  </p>
                </div>
                <p className="text-xs text-muted-foreground">Degrees Away</p>
              </div>
            </div>

            {/* Pubkey */}
            <div>
              <Badge variant="secondary" className="font-mono text-xs w-full justify-center">
                {pubkey?.slice(0, 16)}...
              </Badge>
            </div>

            {/* Actions */}
            <div className="grid grid-cols-2 gap-3">
              <Button onClick={handleViewProfile} variant="default" className="w-full">
                <ExternalLink className="w-4 h-4 mr-2" />
                View on {nostrClient.charAt(0).toUpperCase() + nostrClient.slice(1)}
              </Button>
              <Button
                onClick={handleViewGraphFromPerspective}
                variant="outline"
                className="w-full"
              >
                <Network className="w-4 h-4 mr-2" />
                View Their Network
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
